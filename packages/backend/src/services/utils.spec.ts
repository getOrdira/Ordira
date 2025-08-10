// packages/backend/src/services/utils.spec.ts
import { generateCode } from './utils/utils.service';

describe('generateCode', () => {
  it('returns a string of exactly six digits', () => {
    const code = generateCode();
    expect(typeof code).toBe('string');
    expect(code).toMatch(/^\d{6}$/);
  });

  it('returns different values on subsequent calls', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 10; i++) {
      codes.add(generateCode());
    }
    // Very unlikely to collide 10 times
    expect(codes.size).toBeGreaterThan(1);
  });
});
