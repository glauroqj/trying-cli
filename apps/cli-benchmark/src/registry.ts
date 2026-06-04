import type { CliAdapter } from '@trying-cli/benchmark-types';
import { createCliAdapter as createPastel } from '@trying-cli/feature-cli-pastel';
import { createCliAdapter as createCommanderClack } from '@trying-cli/feature-cli-commander-clack';
import { createCliAdapter as createInk } from '@trying-cli/feature-cli-ink';

/** Único lugar onde features de CLI são compostas (camada app). */
export function createAdapterRegistry(): CliAdapter[] {
  return [
    createPastel(),
    createCommanderClack(),
    createInk(),
  ];
}
