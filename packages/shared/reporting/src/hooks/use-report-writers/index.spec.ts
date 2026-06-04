import type { BenchmarkSuiteReport } from '@trying-cli/benchmark-types';
import { describe, expect, it } from 'vitest';
import { toJson, toMarkdown } from './index.js';

const sampleReport: BenchmarkSuiteReport = {
  generatedAt: '2026-06-04T00:00:00.000Z',
  dryRun: true,
  scenarios: [{ id: 's1', name: 'Test', prompt: 'hi' }],
  results: [
    {
      adapterId: 'cli-pastel',
      scenarioId: 's1',
      status: 'success',
      durationMs: 10,
      metrics: [{ name: 'tokens', value: 1, unit: 'count' }],
      dryRun: true,
    },
  ],
};

describe('report writers', () => {
  it('serializes to JSON', () => {
    const json = toJson(sampleReport);
    expect(JSON.parse(json)).toEqual(sampleReport);
  });

  it('renders markdown table', () => {
    const md = toMarkdown(sampleReport);
    expect(md).toContain('# Benchmark Report');
    expect(md).toContain('| cli-pastel | s1 | success | 10 |');
  });
});
