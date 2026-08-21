/**
 * A short-lived cache in front of the EHRbase order pull.
 *
 * Listing lab orders means asking EHRbase for every patient's orders, one
 * request per patient. With a hundred-odd patients that is a hundred-odd round
 * trips, batched five at a time — several seconds before anything renders, and
 * it happened again for every tab that needed the same list.
 *
 * Orders arrive from clinicians over minutes, not milliseconds, so serving a
 * few seconds' worth of staleness costs nothing real and removes almost all of
 * the wait. An in-flight request is shared rather than duplicated, so two tabs
 * opening together make one trip, not two.
 */

type Cached<T> = { at: number; data: T };

const TTL_MS = 60_000;

const cache = new Map<string, Cached<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

export async function cachedByKey<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key) as Cached<T> | undefined;
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;

  // Someone is already fetching this — wait for them instead of asking again.
  const pending = inFlight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const p = load()
    .then((data) => {
      cache.set(key, { at: Date.now(), data });
      return data;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, p);
  return p;
}

/**
 * Drop a cached entry. Call after writing an order so the change shows up
 * immediately rather than after the TTL.
 */
export function invalidate(key: string) {
  cache.delete(key);
}

export const ehrOrdersKey = (workspaceid: string) => `ehr-orders:${workspaceid}`;
