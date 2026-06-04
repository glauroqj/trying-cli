import type { CliAdapter } from '@trying-cli/benchmark-types';
import { runBenchmarkSmoke } from '@trying-cli/agents-core';
import { ADAPTER_ID, ADAPTER_LABEL } from '../../domain/constants.js';

export function createCliAdapter(): CliAdapter {
  return {
    id: ADAPTER_ID,
    label: ADAPTER_LABEL,
    run: (scenario, options) =>
      runBenchmarkSmoke(ADAPTER_ID, scenario, options?.dryRun ?? false),
  };
}
