import { randomUUID } from 'node:crypto';

export function newId(): string {
  return randomUUID();
}

/** Short, human friendly access code (no ambiguous characters). */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function newAccessCode(length = 4): string {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}
