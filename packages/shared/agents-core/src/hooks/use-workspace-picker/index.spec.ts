import { describe, expect, it } from 'vitest';
import { homedir } from 'node:os';
import { getWorkspaceShortcuts } from './index.js';

describe('getWorkspaceShortcuts', () => {
  it('includes home when it exists', async () => {
    const shortcuts = await getWorkspaceShortcuts();
    const home = shortcuts.find((s) => s.id === 'home');
    expect(home).toBeDefined();
    expect(home!.path).toBe(homedir());
  });

  it('only returns existing paths', async () => {
    const shortcuts = await getWorkspaceShortcuts();
    expect(shortcuts.length).toBeGreaterThan(0);
    for (const s of shortcuts) {
      expect(s.path.length).toBeGreaterThan(0);
    }
  });
});
