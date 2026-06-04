import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assertDirectoryExists,
  validateInstallTarget,
} from './index.js';

describe('assertDirectoryExists', () => {
  it('rejects missing directory', async () => {
    const r = await assertDirectoryExists('/path/that/does/not/exist-xyz');
    expect(r.ok).toBe(false);
    expect(r.error).toContain('não encontrada');
  });

  it('accepts existing temp directory', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agents-test-'));
    try {
      const r = await assertDirectoryExists(dir);
      expect(r.ok).toBe(true);
      expect(r.path).toBe(dir);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('validateInstallTarget', () => {
  it('rejects project scope without projectPath', async () => {
    const r = await validateInstallTarget({
      kind: 'skill',
      scope: 'project',
      templateId: 'scaffold-skill',
    });
    expect(r.ok).toBe(false);
  });

  it('accepts global skill dry-run path validation', async () => {
    const r = await validateInstallTarget({
      kind: 'skill',
      scope: 'global',
      templateId: 'scaffold-skill',
      dryRun: true,
    });
    expect(r.ok).toBe(true);
    expect(r.targetPath).toContain('scaffold-skill');
  });
});
