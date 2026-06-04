import type { BenchmarkSuiteReport } from '@trying-cli/benchmark-types';

export function toJson(report: BenchmarkSuiteReport): string {
  return JSON.stringify(report, null, 2);
}

export function toMarkdown(report: BenchmarkSuiteReport): string {
  const lines: string[] = [
    '# Benchmark Report',
    '',
    `**Generated:** ${report.generatedAt}`,
    `**Dry run:** ${report.dryRun}`,
    '',
    '## Scenarios',
    '',
  ];

  for (const scenario of report.scenarios) {
    lines.push(`- \`${scenario.id}\` — ${scenario.name}`);
  }

  lines.push('', '## Results', '', '| Adapter | Scenario | Status | Duration (ms) |', '| --- | --- | --- | ---: |');

  for (const result of report.results) {
    lines.push(
      `| ${result.adapterId} | ${result.scenarioId} | ${result.status} | ${result.durationMs} |`
    );
  }

  lines.push('', '## Metrics', '');

  for (const result of report.results) {
    if (result.metrics.length === 0) continue;
    lines.push(`### ${result.adapterId} / ${result.scenarioId}`, '');
    for (const metric of result.metrics) {
      lines.push(`- **${metric.name}:** ${metric.value} ${metric.unit}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
