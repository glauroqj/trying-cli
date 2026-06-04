import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { ProjectInfo, WorkspaceValidation } from '../../domain/types.js';
import { PROJECT_MARKERS } from '../../domain/constants.js';
import {
  assertDirectoryExists,
  pathExists,
  resolvePath,
} from '../use-path-guard/index.js';

export { resolvePath } from '../use-path-guard/index.js';

async function detectProjectKind(
  dirPath: string
): Promise<ProjectInfo['kind']> {
  if (await pathExists(join(dirPath, 'package.json'))) return 'node';
  if (await pathExists(join(dirPath, 'pyproject.toml'))) return 'python';
  if (await pathExists(join(dirPath, 'go.mod'))) return 'go';
  if (await pathExists(join(dirPath, '.git'))) return 'git';
  return 'other';
}

export function validateWorkspace(inputPath: string): WorkspaceValidation {
  if (!inputPath?.trim()) {
    return { ok: false, error: 'Informe o caminho do workspace.' };
  }
  const path = resolvePath(inputPath);
  return { ok: true, path };
}

export async function listProjects(
  workspaceInput: string
): Promise<ProjectInfo[]> {
  const validation = await assertDirectoryExists(workspaceInput);
  if (!validation.ok || !validation.path) return [];

  const workspacePath = validation.path;
  const entries = await readdir(workspacePath, { withFileTypes: true });
  const projects: ProjectInfo[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const fullPath = join(workspacePath, entry.name);
    if (!(await pathExists(fullPath))) continue;

    const hasMarker = await Promise.all(
      PROJECT_MARKERS.map((m) => pathExists(join(fullPath, m)))
    );
    const isGitOnly =
      (await pathExists(join(fullPath, '.git'))) && !hasMarker.some(Boolean);

    if (hasMarker.some(Boolean) || isGitOnly) {
      projects.push({
        name: entry.name,
        path: fullPath,
        kind: await detectProjectKind(fullPath),
      });
    }
  }

  return projects.sort((a, b) => a.name.localeCompare(b.name));
}

export async function assertWorkspaceReady(
  workspaceInput: string
): Promise<WorkspaceValidation> {
  return assertDirectoryExists(workspaceInput);
}

/**
 * Returns process.cwd() if it contains a known project marker, otherwise null.
 * Used by the Vercel-like wizard to skip the workspace picker when cwd is valid.
 */
export async function detectProjectRoot(): Promise<string | null> {
  const cwd = process.cwd();
  const hasMarker = await Promise.all(
    PROJECT_MARKERS.map((m) => pathExists(join(cwd, m)))
  );
  if (hasMarker.some(Boolean) || (await pathExists(join(cwd, '.git')))) {
    return cwd;
  }
  return null;
}
