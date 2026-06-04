import type {
  BenchmarkScenario,
  BenchmarkSuiteOptions,
  BenchmarkSuiteReport,
  CliAdapter,
  CliAdapterId,
} from '@trying-cli/benchmark-types';

export interface RunSuiteInput {
  adapters: CliAdapter[];
  scenarios: BenchmarkScenario[];
  options?: BenchmarkSuiteOptions;
}

function filterAdapters(
  adapters: CliAdapter[],
  only?: CliAdapterId[]
): CliAdapter[] {
  if (!only || only.length === 0) return adapters;
  const allowed = new Set(only);
  return adapters.filter((adapter) => allowed.has(adapter.id));
}

export async function runSuite(input: RunSuiteInput): Promise<BenchmarkSuiteReport> {
  const { adapters, scenarios, options = {} } = input;
  const dryRun = options.dryRun ?? false;
  const selectedAdapters = filterAdapters(adapters, options.only);
  const results = [];

  for (const adapter of selectedAdapters) {
    for (const scenario of scenarios) {
      results.push(await adapter.run(scenario, { dryRun }));
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    dryRun,
    scenarios,
    results,
  };
}
