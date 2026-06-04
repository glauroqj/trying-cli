import type { ResourcePackage } from './types.js';

/**
 * Bundled hook packages for the Agents CLI.
 * Hooks are always installed natively (no external registry needed).
 * Phase 2: community hook repositories.
 */
export const HOOK_PACKAGES: ResourcePackage[] = [
  {
    id: 'agents-cli/hooks',
    label: 'Agents CLI — Hooks',
    kind: 'hook',
    source: {
      type: 'bundled',
      id: 'agents-cli/hooks',
      label: 'Built-in (Agents CLI)',
      description: 'Hook packs incluídos no Agents CLI para Cursor e agentes compatíveis',
    },
    items: [
      {
        id: 'scaffold-hook',
        label: 'Scaffold Hook',
        description: 'Template básico de hook para eventos do agente (hooks.json — Cursor)',
      },
    ],
  },
];

export function getHookPackages(): ResourcePackage[] {
  return HOOK_PACKAGES;
}

export function findHookPackage(packageId: string): ResourcePackage | undefined {
  return HOOK_PACKAGES.find((p) => p.id === packageId);
}
