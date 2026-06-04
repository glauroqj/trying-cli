import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type {
  BrowseStepChoice,
  WorkspacePickerPort,
  WorkspaceShortcut,
} from '../../domain/types.js';
import {
  assertDirectoryExists,
  pathExists,
  resolvePath,
} from '../use-path-guard/index.js';

const BROWSE_LIMIT = 25;

export async function getWorkspaceShortcuts(): Promise<WorkspaceShortcut[]> {
  const home = homedir();
  const cwd = process.cwd();
  const candidates: WorkspaceShortcut[] = [
    { id: 'home', label: 'Home', path: home },
    { id: 'documents', label: 'Documentos', path: join(home, 'Documents') },
    { id: 'desktop', label: 'Área de trabalho', path: join(home, 'Desktop') },
    { id: 'cwd', label: 'Pasta atual (onde você rodou o comando)', path: cwd },
    { id: 'projects', label: 'Projects', path: join(home, 'Projects') },
  ];

  const existing: WorkspaceShortcut[] = [];
  for (const c of candidates) {
    if (await pathExists(c.path)) {
      existing.push(c);
    }
  }
  return existing;
}

export async function listBrowsableDirectories(
  parentPath: string
): Promise<WorkspaceShortcut[]> {
  const resolved = resolvePath(parentPath);
  const check = await assertDirectoryExists(resolved);
  if (!check.ok) return [];

  const entries = await readdir(resolved, { withFileTypes: true });
  const dirs: WorkspaceShortcut[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const fullPath = join(resolved, entry.name);
    if (await pathExists(fullPath)) {
      dirs.push({
        id: fullPath,
        label: entry.name,
        path: fullPath,
      });
    }
    if (dirs.length >= BROWSE_LIMIT) break;
  }

  return dirs.sort((a, b) => a.label.localeCompare(b.label));
}

export async function browseWorkspace(
  port: WorkspacePickerPort,
  startPath: string
): Promise<string | 'cancel'> {
  const stack: string[] = [];
  let current = resolvePath(startPath);

  while (true) {
    const check = await assertDirectoryExists(current);
    if (!check.ok) {
      if (port.showError) await port.showError(check.error ?? 'Pasta inválida');
      return 'cancel';
    }
    current = check.path!;

    const subdirs = await listBrowsableDirectories(current);
    const choice: BrowseStepChoice = await port.browseStep({
      currentPath: current,
      canGoBack: stack.length > 0,
      subdirectories: subdirs,
    });

    if (choice.type === 'use') return current;
    if (choice.type === 'cancel') return 'cancel';
    if (choice.type === 'back') {
      current = stack.pop() ?? homedir();
      continue;
    }
    if (choice.type === 'enter') {
      const enterCheck = await assertDirectoryExists(choice.path);
      if (!enterCheck.ok) {
        if (port.showError) {
          await port.showError(enterCheck.error ?? 'Pasta inválida');
        }
        continue;
      }
      stack.push(current);
      current = enterCheck.path!;
    }
  }
}

async function confirmPath(
  port: WorkspacePickerPort,
  path: string
): Promise<string | 'cancel' | 'retry'> {
  const validation = await assertDirectoryExists(path);
  if (validation.ok && validation.path) {
    return validation.path;
  }
  if (port.showError) {
    await port.showError(validation.error ?? 'Pasta não encontrada');
  }
  return 'retry';
}

export async function pickWorkspacePath(
  port: WorkspacePickerPort
): Promise<string | 'cancel'> {
  while (true) {
    const mode = await port.askMode();
    if (mode === 'cancel') return 'cancel';

    if (mode === 'shortcut') {
      const shortcuts = await getWorkspaceShortcuts();
      if (shortcuts.length === 0) {
        if (port.showError) {
          await port.showError('Nenhuma pasta comum encontrada. Tente navegar.');
        }
        continue;
      }
      const picked = await port.pickShortcut(shortcuts);
      if (picked === 'cancel') continue;
      const confirmed = await confirmPath(port, picked);
      if (confirmed === 'retry') continue;
      if (confirmed === 'cancel') return 'cancel';
      return confirmed;
    }

    if (mode === 'browse') {
      const picked = await browseWorkspace(port, homedir());
      if (picked === 'cancel') continue;
      const confirmed = await confirmPath(port, picked);
      if (confirmed === 'retry') continue;
      if (confirmed === 'cancel') return 'cancel';
      return confirmed;
    }

    if (mode === 'manual') {
      const manual = await port.askManualPath();
      if (manual === 'cancel') continue;
      const confirmed = await confirmPath(port, manual);
      if (confirmed === 'retry') continue;
      if (confirmed === 'cancel') return 'cancel';
      return confirmed;
    }
  }
}
