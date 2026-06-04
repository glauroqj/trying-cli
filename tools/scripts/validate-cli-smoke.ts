/**
 * Smoke não-interativo: valida exports e pickWorkspacePath com port mock.
 * Ink e Pastel validados manualmente via pnpm run cli:ink / cli:pastel (exigem TTY).
 */
import { createCliAdapter as clack } from '@trying-cli/feature-cli-commander-clack';
import {
  getWelcomeContent,
  getWorkspaceShortcuts,
  pickWorkspacePath,
  getSkillPackages,
  getHookPackages,
  detectInstalledAgents,
  type WorkspacePickerPort,
  type WorkspaceShortcut,
  type BrowseStepContext,
  type BrowseStepChoice,
  type WorkspacePickMode,
} from '@trying-cli/agents-core';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const adapters = [clack()];

function mockPort(home: string): WorkspacePickerPort {
  return {
    async askMode(): Promise<WorkspacePickMode | 'cancel'> {
      return 'shortcut';
    },
    async pickShortcut(options: WorkspaceShortcut[]): Promise<string | 'cancel'> {
      const homeOpt = options.find((o) => o.id === 'home');
      return homeOpt?.path ?? options[0]?.path ?? 'cancel';
    },
    async browseStep(_ctx: BrowseStepContext): Promise<BrowseStepChoice> {
      return { type: 'use' };
    },
    async askManualPath(): Promise<string | 'cancel'> {
      return home;
    },
    async showError(msg: string): Promise<void> {
      console.error('[mock]', msg);
    },
  };
}

async function main(): Promise<void> {
  // Welcome content
  const welcome = getWelcomeContent();
  if (!welcome.brandName || !welcome.tagline) {
    throw new Error('getWelcomeContent inválido');
  }

  // Skill/hook catalogs
  const skillPkgs = getSkillPackages();
  if (skillPkgs.length === 0) throw new Error('getSkillPackages retornou vazio');
  const hookPkgs = getHookPackages();
  if (hookPkgs.length === 0) throw new Error('getHookPackages retornou vazio');

  // Agent detection (may be empty in CI where no agents are installed)
  const agents = await detectInstalledAgents();

  // Workspace shortcuts + pickWorkspacePath
  const shortcuts = await getWorkspaceShortcuts();
  if (shortcuts.length === 0) throw new Error('Nenhum atalho de workspace');

  const dir = await mkdtemp(join(tmpdir(), 'agents-smoke-'));
  const picked = await pickWorkspacePath(mockPort(dir));
  if (picked === 'cancel') throw new Error('pickWorkspacePath cancelou');

  // Benchmark adapter smoke (dry-run)
  for (const adapter of adapters) {
    const result = await adapter.run(
      { id: 'hello-world', name: 'Hello', prompt: 'OK' },
      { dryRun: true }
    );
    if (result.status !== 'success') {
      throw new Error(`${adapter.id} falhou: ${result.status}`);
    }
  }

  console.log('validate-cli-smoke: OK');
  console.log(`  adapters: ${adapters.map((a) => a.id).join(', ')}`);
  console.log(`  workspace pick: ${picked}`);
  console.log(`  skill packages: ${skillPkgs.length}`);
  console.log(`  hook packages: ${hookPkgs.length}`);
  console.log(`  detected agents: ${agents.join(', ')}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
