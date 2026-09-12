/**
 * A screen must be able to say when something failed, and must not print debug
 * output to the server log.
 *
 * Both of these were swept out at scale rather than one at a time - 470 debug
 * statements, and 81 branches that acted on success with no branch for
 * failure. Sweeps do not stay swept. This is what keeps them out.
 *
 * ESLint would be the usual home for a rule like this, but it is not a
 * dependency of this project: `next lint` is wired up in package.json against
 * an eslint that is not installed. Adding it is a decision about tooling.
 * Asserting the same invariants in the test suite that already runs costs
 * nothing and cannot be skipped.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const APP = join(process.cwd(), 'src', 'app');

function filesUnder(dir: string, ext: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.next')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) filesUnder(full, ext, found);
    else if (entry.endsWith(ext)) found.push(full);
  }
  return found;
}

const relative = (f: string) => f.replace(process.cwd(), '').replace(/\\/g, '/');

/**
 * Walk from an opening brace to the one that closes it, skipping anything
 * inside a string. Not a parser: it is confused by a brace inside a regular
 * expression literal, and by JSX dense enough to look like one. That is why
 * the assertions below are about counts rather than exact positions.
 */
function matchBrace(source: string, openIndex: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let i = openIndex; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (ch === '\\') { i++; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

describe('the screens can report a failure', () => {
  const screens = filesUnder(APP, '.tsx');

  it('finds the screens to check', () => {
    expect(screens.length).toBeGreaterThan(100);
  });

  it('no debug logging reaches production', () => {
    // console.error and console.warn stay: those are deliberate. It is
    // console.log that carried request bodies and patient records into the
    // server log on ordinary requests.
    const offenders: string[] = [];
    for (const file of [...screens, ...filesUnder(join(process.cwd(), 'src', 'app', 'api'), '.ts')]) {
      const source = readFileSync(file, 'utf8');
      const count = (source.match(/console\.log\s*\(/g) ?? []).length;
      if (count) offenders.push(`${relative(file)} (${count})`);
    }
    expect(offenders).toEqual([]);
  });

  it('a request that fails is not handled by doing nothing', () => {
    // The shape: `if (res.ok) { ... }` with no else, so a refusal closes the
    // dialog and changes nothing on screen. It is what made the admin panel's
    // delete button look broken while the rule behind it worked perfectly.
    //
    // One, not zero. The brace matcher above cannot always tell a handler's
    // closing brace from JSX in the densest files, and one branch reads as
    // silent to it while the screen does report the failure a few lines later.
    // Set to the exact count rather than a generous ceiling, so writing a new
    // one fails this immediately.
    const CONDITION = /if\s*\(\s*(?:res|response|result|data)\s*\.\s*(?:ok|success)\s*\)\s*\{/g;
    let silent = 0;

    for (const file of screens) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(CONDITION)) {
        const open = match.index! + match[0].length - 1;
        const close = matchBrace(source, open);
        if (close < 0) continue;
        // `else {` and a braceless `else toast.error(...)` both count.
        if (/^\s*else/.test(source.slice(close + 1, close + 120))) continue;
        silent++;
      }
    }

    expect(silent).toBe(1);
  });
});
