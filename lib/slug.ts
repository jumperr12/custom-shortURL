import { customAlphabet } from "nanoid";

// no look-alike chars (0/O, 1/l/I) so people can read links over the phone
const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const gen6 = customAlphabet(alphabet, 6);
const gen8 = customAlphabet(alphabet, 8);

export function newSlug(len: 6 | 8 = 6) {
  return len === 8 ? gen8() : gen6();
}

// allowed user-provided aliases. keep it conservative — these end up in urls
const ALIAS_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{1,63}$/;
export function isValidAlias(s: string) {
  return ALIAS_RE.test(s);
}
