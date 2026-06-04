import type { CliAdapter } from '@trying-cli/benchmark-types';
import { createCliAdapter as createCli01 } from '@trying-cli/feature-cli-01';
import { createCliAdapter as createCli02 } from '@trying-cli/feature-cli-02';
import { createCliAdapter as createCli03 } from '@trying-cli/feature-cli-03';
import { createCliAdapter as createCli04 } from '@trying-cli/feature-cli-04';
import { createCliAdapter as createCli05 } from '@trying-cli/feature-cli-05';

/** Único lugar onde features de CLI são compostas (camada app). */
export function createAdapterRegistry(): CliAdapter[] {
  return [
    createCli01(),
    createCli02(),
    createCli03(),
    createCli04(),
    createCli05(),
  ];
}
