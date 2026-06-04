import { describe, expect, it } from 'vitest';
import { DEFAULT_SCENARIOS } from './constants.js';

describe('DEFAULT_SCENARIOS', () => {
  it('defines at least one scenario', () => {
    expect(DEFAULT_SCENARIOS.length).toBeGreaterThan(0);
    expect(DEFAULT_SCENARIOS[0]?.id).toBeTruthy();
  });
});
