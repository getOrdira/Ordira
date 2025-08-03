// src/services/utils.ts

/**
 * Generate a random numeric code (e.g. “123456”) of given length.
 */
export function generateCode(length: number = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += Math.floor(Math.random() * 10);
  }
  return code;
}