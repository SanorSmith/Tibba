/**
 * Signing and verifying the session cookie.
 *
 * The cookie used to be plain base64-encoded JSON, checked by nobody. Anyone
 * could set `tibbna_session` to a payload of their choosing — any facility,
 * any user id, `role: SUPER_ADMIN` — and the application believed it. Neither
 * the middleware nor `getCurrentUser` looked at anything but the shape.
 *
 * That is worse than an isolation gap. Row-level security enforces whatever
 * `app.workspace_id` is set to, so a forged workspace id would have been
 * isolated faithfully into the facility the forger picked: protection that
 * looks real and is not.
 *
 * The cookie is now `payload.signature`, where the signature is an HMAC over
 * the exact payload bytes. A payload edited by even one character no longer
 * verifies. Web Crypto rather than node:crypto, because the middleware runs
 * on the Edge runtime where node:crypto is unavailable, and the two layers
 * must agree on what a valid session is.
 *
 * Signing proves the payload came from this server. It does not prove the
 * claims inside it are still true — a membership can be revoked after a
 * cookie is issued — so `getCurrentUser` re-checks membership and re-derives
 * the role from the database on every request.
 */

const encoder = new TextEncoder();

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    // Failing closed: a missing secret must stop sign-in, never fall back to
    // unsigned cookies, which is the hole this exists to close.
    throw new Error(
      'SESSION_SECRET is not set (or is shorter than 32 characters). ' +
        'Sessions cannot be signed or verified without it.',
    );
  }
  return value;
}

let keyPromise: Promise<CryptoKey> | null = null;

function hmacKey(): Promise<CryptoKey> {
  if (!keyPromise) {
    keyPromise = crypto.subtle.importKey(
      'raw',
      encoder.encode(secret()),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify'],
    );
  }
  return keyPromise;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/** Encodes a session object as `payload.signature`. */
export async function signSession(session: object): Promise<string> {
  const payload = toBase64Url(encoder.encode(JSON.stringify(session)));
  const signature = await crypto.subtle.sign(
    'HMAC',
    await hmacKey(),
    encoder.encode(payload),
  );
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`;
}

/**
 * Returns the payload if the signature is this server's, otherwise null.
 *
 * `crypto.subtle.verify` compares in constant time, so a wrong signature
 * gives nothing away about how wrong it was. An old unsigned cookie has no
 * dot-separated signature and is rejected here — which logs existing sessions
 * out once, by design.
 */
export async function verifySession<T = Record<string, unknown>>(
  token: string | undefined,
): Promise<T | null> {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;

  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  try {
    const ok = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(),
      fromBase64Url(signature).buffer as ArrayBuffer,
      encoder.encode(payload),
    );
    if (!ok) return null;
    return JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as T;
  } catch {
    return null;
  }
}
