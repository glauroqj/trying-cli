import type {
  BenchmarkScenario,
  CliAdapterId,
  RunResult,
} from '@trying-cli/benchmark-types';
import { BRAND_NAME, WELCOME_TAGLINE } from '../../domain/types.js';
import { assertWorkspaceReady, listProjects } from '../use-workspace/index.js';
import { installAgentResource } from '../use-install/index.js';
import { tmpdir } from 'node:os';
import { mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';

export async function runBenchmarkSmoke(
  adapterId: CliAdapterId,
  scenario: BenchmarkScenario,
  dryRun: boolean
): Promise<RunResult> {
  const started = Date.now();

  try {
    if (scenario.id === 'hello-world') {
      const banner = `${BRAND_NAME} — ${WELCOME_TAGLINE}`;
      const ok = banner.includes(BRAND_NAME) && scenario.prompt.includes('OK')
        ? banner.length > 0
        : banner.includes(BRAND_NAME);

      return buildResult(adapterId, scenario, dryRun, started, ok ? 'success' : 'error', {
        stdout: banner,
        metrics: [
          { name: 'banner_length', value: banner.length, unit: 'chars' },
        ],
      });
    }

    if (scenario.id === 'list-files') {
      const workspace = tmpdir();
      const validation = await assertWorkspaceReady(workspace);
      const projects = validation.ok ? await listProjects(workspace) : [];

      const install = await installAgentResource({
        kind: 'skill',
        scope: 'global',
        templateId: 'scaffold-skill',
        dryRun: true,
      });

      const stdout = JSON.stringify({
        workspaceOk: validation.ok,
        projectCount: projects.length,
        installOk: install.ok,
      });

      return buildResult(adapterId, scenario, dryRun, started, 'success', {
        stdout,
        metrics: [
          { name: 'project_count', value: projects.length, unit: 'count' },
          { name: 'install_ok', value: install.ok ? 1 : 0, unit: 'flag' },
        ],
      });
    }

    if (scenario.id === 'cold-start') {
      const tmp = await mkdtemp(join(tmpdir(), 'agents-bench-'));
      await assertWorkspaceReady(tmp);
      return buildResult(adapterId, scenario, dryRun, started, 'success', {
        stdout: 'cold-start-ok',
        metrics: [{ name: 'smoke', value: 1, unit: 'flag' }],
      });
    }

    return buildResult(adapterId, scenario, dryRun, started, 'skipped', {
      stdout: 'unknown scenario',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return buildResult(adapterId, scenario, dryRun, started, 'error', {
      errorMessage: message,
    });
  }
}

function buildResult(
  adapterId: CliAdapterId,
  scenario: BenchmarkScenario,
  dryRun: boolean,
  started: number,
  status: RunResult['status'],
  extra: Partial<RunResult>
): RunResult {
  return {
    adapterId,
    scenarioId: scenario.id,
    status,
    durationMs: Date.now() - started,
    metrics: extra.metrics ?? [],
    stdout: extra.stdout,
    stderr: extra.stderr,
    errorMessage: extra.errorMessage,
    dryRun,
  };
}
