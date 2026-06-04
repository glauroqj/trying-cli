export type CliAdapterId =
  | 'cli-pastel'
  | 'cli-commander-clack'
  | 'cli-ink';

export const CLI_ADAPTER_IDS: readonly CliAdapterId[] = [
  'cli-pastel',
  'cli-commander-clack',
  'cli-ink',
] as const;

export interface BenchmarkScenario {
  id: string;
  name: string;
  prompt: string;
}

export interface Metric {
  name: string;
  value: number;
  unit: string;
}

export type RunStatus = 'success' | 'error' | 'skipped';

export interface RunResult {
  adapterId: CliAdapterId;
  scenarioId: string;
  status: RunStatus;
  durationMs: number;
  metrics: Metric[];
  stdout?: string;
  stderr?: string;
  errorMessage?: string;
  dryRun: boolean;
}

export interface CliAdapter {
  id: CliAdapterId;
  label: string;
  run(scenario: BenchmarkScenario, options?: { dryRun?: boolean }): Promise<RunResult>;
}

export interface BenchmarkSuiteOptions {
  dryRun?: boolean;
  only?: CliAdapterId[];
}

export interface BenchmarkSuiteReport {
  generatedAt: string;
  dryRun: boolean;
  scenarios: BenchmarkScenario[];
  results: RunResult[];
}
