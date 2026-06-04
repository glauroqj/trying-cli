import type {
  BenchmarkScenario,
  CliAdapter,
  RunResult,
} from '@trying-cli/benchmark-types';
import { timedExec } from '@trying-cli/exec';
import { ADAPTER_ID, ADAPTER_LABEL, PLACEHOLDER_COMMAND } from '../../domain/constants.js';

async function runPlaceholder(
  scenario: BenchmarkScenario,
  dryRun: boolean
): Promise<RunResult> {
  const execResult = await timedExec({
    command: PLACEHOLDER_COMMAND,
    args: [scenario.prompt],
    dryRun,
  });

  const status = execResult.exitCode === 0 ? 'success' : 'error';

  return {
    adapterId: ADAPTER_ID,
    scenarioId: scenario.id,
    status,
    durationMs: execResult.durationMs,
    metrics: [
      { name: 'exit_code', value: execResult.exitCode ?? -1, unit: 'code' },
      { name: 'stdout_length', value: execResult.stdout.length, unit: 'chars' },
    ],
    stdout: execResult.stdout,
    stderr: execResult.stderr,
    dryRun,
  };
}

export function createCliAdapter(): CliAdapter {
  return {
    id: ADAPTER_ID,
    label: ADAPTER_LABEL,
    run: (scenario, options) =>
      runPlaceholder(scenario, options?.dryRun ?? false),
  };
}
