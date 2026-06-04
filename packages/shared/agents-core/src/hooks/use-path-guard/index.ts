import { access, constants, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import type {
  InstallAgentResourceInput,
  InstallTargetValidation,
  WorkspaceValidation,
} from '../../domain/types.js';

export function resolvePath(input: string): string {
  const trimmed = input.trim().replace(/^~/, homedir());
  return trimmed.startsWith('/') ? trimmed : join(process.cwd(), trimmed);
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function assertDirectoryExists(
  inputPath: string
): Promise<WorkspaceValidation> {
  if (!inputPath?.trim()) {
    return { ok: false, error: 'Informe o caminho do workspace.' };
  }

  const path = resolvePath(inputPath);

  try {
    const s = await stat(path);
    if (!s.isDirectory()) {
      return {
        ok: false,
        error: 'O caminho informado não é um diretório.',
        path,
      };
    }
    await access(path, constants.R_OK);
    return { ok: true, path };
  } catch {
    return {
      ok: false,
      error: `Pasta não encontrada: ${path}`,
      path,
    };
  }
}

export async function assertParentWritable(
  targetPath: string
): Promise<WorkspaceValidation> {
  let dir = dirname(targetPath);
  while (!(await pathExists(dir))) {
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  try {
    await access(dir, constants.W_OK);
    return { ok: true, path: targetPath };
  } catch {
    return {
      ok: false,
      error: `Sem permissão de escrita em: ${dir}`,
      path: targetPath,
    };
  }
}

function resolveSkillTargetDir(input: InstallAgentResourceInput): string {
  const skillName = input.templateId;
  if (input.scope === 'global') {
    return join(homedir(), '.agents', 'skills', skillName);
  }
  return join(input.projectPath!, '.agents', 'skills', skillName);
}

function resolveHookTargetFile(input: InstallAgentResourceInput): string {
  if (input.scope === 'global') {
    return join(homedir(), '.cursor', 'hooks.json');
  }
  return join(input.projectPath!, '.cursor', 'hooks.json');
}

export async function validateInstallTarget(
  input: InstallAgentResourceInput
): Promise<InstallTargetValidation> {
  if (input.scope === 'project') {
    if (!input.projectPath?.trim()) {
      return {
        ok: false,
        error: 'Selecione um projeto antes de instalar no escopo local.',
      };
    }
    const projectCheck = await assertDirectoryExists(input.projectPath);
    if (!projectCheck.ok) {
      return { ok: false, error: projectCheck.error };
    }
  }

  const targetPath =
    input.kind === 'skill'
      ? resolveSkillTargetDir(input)
      : resolveHookTargetFile(input);

  const parentCheck = await assertParentWritable(targetPath);
  if (!parentCheck.ok) {
    return { ok: false, error: parentCheck.error, targetPath };
  }

  return { ok: true, targetPath };
}
