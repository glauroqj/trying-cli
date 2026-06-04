import { describe, expect, it } from 'vitest';
import { validateWorkspace } from './index.js';

describe('validateWorkspace', () => {
  it('rejects empty path', () => {
    expect(validateWorkspace('').ok).toBe(false);
  });

  it('accepts home-relative path', () => {
    const r = validateWorkspace('~/Documents');
    expect(r.ok).toBe(true);
    expect(r.path).toBeDefined();
  });
});
