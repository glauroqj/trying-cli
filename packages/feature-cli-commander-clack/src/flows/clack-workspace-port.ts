import * as p from '@clack/prompts';
import type {
  BrowseStepContext,
  BrowseStepChoice,
  WorkspacePickerPort,
  WorkspaceShortcut,
  WorkspacePickMode,
} from '@trying-cli/agents-core';

function isCancel<T>(value: T | symbol): value is symbol {
  return typeof value === 'symbol';
}

export function createClackWorkspacePort(): WorkspacePickerPort {
  return {
    async askMode(): Promise<WorkspacePickMode | 'cancel'> {
      const mode = await p.select({
        message: 'Como deseja informar a pasta dos seus projetos?',
        options: [
          {
            value: 'shortcut',
            label: 'Escolher uma pasta comum (recomendado)',
          },
          { value: 'browse', label: 'Navegar pelas pastas' },
          { value: 'manual', label: 'Digitar o caminho manualmente' },
        ],
      });
      if (isCancel(mode)) return 'cancel';
      return mode as WorkspacePickMode;
    },

    async pickShortcut(
      options: WorkspaceShortcut[]
    ): Promise<string | 'cancel'> {
      const picked = await p.select({
        message: 'Selecione a pasta dos projetos',
        options: options.map((o) => ({
          value: o.path,
          label: `${o.label}\n  ${o.path}`,
        })),
      });
      if (isCancel(picked)) return 'cancel';
      return String(picked);
    },

    async browseStep(ctx: BrowseStepContext): Promise<BrowseStepChoice> {
      const options: { value: string; label: string }[] = [
        {
          value: '__use__',
          label: `Usar esta pasta: ${ctx.currentPath}`,
        },
      ];
      if (ctx.canGoBack) {
        options.push({ value: '__back__', label: '← Voltar' });
      }
      for (const sub of ctx.subdirectories) {
        options.push({
          value: sub.path,
          label: `Entrar em: ${sub.label}`,
        });
      }
      options.push({ value: '__cancel__', label: 'Cancelar navegação' });

      const picked = await p.select({
        message: `Pasta atual: ${ctx.currentPath}`,
        options,
      });
      if (isCancel(picked)) return { type: 'cancel' };
      const v = String(picked);
      if (v === '__use__') return { type: 'use' };
      if (v === '__back__') return { type: 'back' };
      if (v === '__cancel__') return { type: 'cancel' };
      return { type: 'enter', path: v };
    },

    async askManualPath(): Promise<string | 'cancel'> {
      const path = await p.text({
        message: 'Digite o caminho da pasta dos projetos',
        placeholder: process.env.HOME ?? '/',
      });
      if (isCancel(path)) return 'cancel';
      return String(path).trim();
    },

    async showError(message: string): Promise<void> {
      p.log.error(message);
    },
  };
}
