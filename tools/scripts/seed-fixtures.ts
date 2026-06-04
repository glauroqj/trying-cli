import type { BenchmarkSuiteReport } from '@trying-cli/benchmark-types';
import { DEFAULT_SCENARIOS } from '@trying-cli/benchmark-types';
import { toJson, toMarkdown } from '@trying-cli/reporting';

/** Fixture mínimo para validar reporting sem executar adapters. */
export function createFixtureReport(): BenchmarkSuiteReport {
  return {
    generatedAt: new Date().toISOString(),
    dryRun: true,
    scenarios: DEFAULT_SCENARIOS,
    results: DEFAULT_SCENARIOS.flatMap((scenario) =>
      (
        [
          'cli-pastel',
          'cli-commander-clack',
          'cli-ink',
        ] as const
      ).map(
        (adapterId) => ({
          adapterId,
          scenarioId: scenario.id,
          status: 'success' as const,
          durationMs: 0,
          metrics: [{ name: 'fixture', value: 1, unit: 'flag' }],
          dryRun: true,
        })
      )
    ),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = createFixtureReport();
  console.log(toJson(report));
  console.log('---');
  console.log(toMarkdown(report));
}
