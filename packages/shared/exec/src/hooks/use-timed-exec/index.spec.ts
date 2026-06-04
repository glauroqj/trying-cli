import { describe, expect, it } from 'vitest';
import { timedExec } from './index.js';

describe('timedExec', () => {
  it('returns stub output in dry-run mode', async () => {
    const result = await timedExec({
      command: 'echo',
      args: ['hello'],
      dryRun: true,
    });

    expect(result.dryRun).toBe(true);
    expect(result.durationMs).toBe(0);
    expect(result.stdout).toContain('echo');
    expect(result.exitCode).toBe(0);
  });
});
