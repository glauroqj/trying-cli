import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CliAdapterId } from '@trying-cli/benchmark-types';
import { CLI_ADAPTER_IDS } from '@trying-cli/benchmark-types';
import {
  DEFAULT_SCENARIOS,
  runSuite,
} from '@trying-cli/feature-benchmark-core';
import { toJson, toMarkdown } from '@trying-cli/reporting';
import { createAdapterRegistry } from './registry.js';

interface CliArgs {
  dryRun: boolean;
  outputDir: string;
  only?: CliAdapterId[];
}

function parseArgs(argv: string[]): CliArgs {
  let dryRun = false;
  let outputDir = join(process.cwd(), 'dist/benchmark-results');
  let only: CliAdapterId[] | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg?.startsWith('--output=')) {
      outputDir = arg.slice('--output='.length);
    } else if (arg === '--output' && argv[i + 1]) {
      outputDir = argv[++i] as string;
    } else if (arg?.startsWith('--only=')) {
      only = parseOnly(arg.slice('--only='.length));
    } else if (arg === '--only' && argv[i + 1]) {
      only = parseOnly(argv[++i] as string);
    }
  }

  return { dryRun, outputDir, only };
}

function parseOnly(value: string): CliAdapterId[] {
  const ids = value.split(',').map((s) => s.trim());
  const valid = new Set(CLI_ADAPTER_IDS);
  return ids.filter((id): id is CliAdapterId => valid.has(id as CliAdapterId));
}

async function writeReports(
  outputDir: string,
  json: string,
  markdown: string
): Promise<{ jsonPath: string; mdPath: string }> {
  await mkdir(outputDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = join(outputDir, `${stamp}.json`);
  const mdPath = join(outputDir, `${stamp}.md`);
  await writeFile(jsonPath, json, 'utf8');
  await writeFile(mdPath, markdown, 'utf8');
  return { jsonPath, mdPath };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const adapters = createAdapterRegistry();

  const report = await runSuite({
    adapters,
    scenarios: DEFAULT_SCENARIOS,
    options: { dryRun: args.dryRun, only: args.only },
  });

  const json = toJson(report);
  const markdown = toMarkdown(report);
  const { jsonPath, mdPath } = await writeReports(
    args.outputDir,
    json,
    markdown
  );

  console.log(`Benchmark complete (dryRun=${args.dryRun})`);
  console.log(`Results: ${report.results.length}`);
  console.log(`JSON: ${jsonPath}`);
  console.log(`Markdown: ${mdPath}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
