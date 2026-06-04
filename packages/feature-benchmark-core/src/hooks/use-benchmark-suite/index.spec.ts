import type { CliAdapter } from '@trying-cli/benchmark-types';
import { describe, expect, it } from 'vitest';
import { runSuite } from './index.js';

const stubAdapter: CliAdapter = {
  id: 'cli-pastel',
  label: 'Stub',
  run: async (scenario, options) => ({
    adapterId: 'cli-pastel',
    scenarioId: scenario.id,
    status: 'success',
    durationMs: 1,
    metrics: [],
    dryRun: options?.dryRun ?? false,
  }),
};

describe('runSuite', () => {
  it('runs all adapter x scenario combinations', async () => {
    const report = await runSuite({
      adapters: [stubAdapter],
      scenarios: [
        { id: 'a', name: 'A', prompt: 'p' },
        { id: 'b', name: 'B', prompt: 'p' },
      ],
      options: { dryRun: true },
    });

    expect(report.results).toHaveLength(2);
    expect(report.dryRun).toBe(true);
  });

  it('filters adapters with only option', async () => {
    const other: CliAdapter = {
      ...stubAdapter,
      id: 'cli-commander-clack',
      label: 'Other',
      run: async (scenario, options) => ({
        adapterId: 'cli-commander-clack',
        scenarioId: scenario.id,
        status: 'success',
        durationMs: 1,
        metrics: [],
        dryRun: options?.dryRun ?? false,
      }),
    };

    const report = await runSuite({
      adapters: [stubAdapter, other],
      scenarios: [{ id: 'a', name: 'A', prompt: 'p' }],
      options: { only: ['cli-commander-clack'], dryRun: true },
    });

    expect(report.results).toHaveLength(1);
    expect(report.results[0]?.adapterId).toBe('cli-commander-clack');
  });
});
