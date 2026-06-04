import { mkdir, readFile, writeFile, access, symlink, lstat } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import type {
  AgentId,
  InstallAgentResourceInput,
  InstallAgentResourceResult,
  InstallResourceInput,
  InstallResourceResult,
  InstallScope,
  ResourceKind,
} from '../../domain/types.js';
import { AVAILABLE_TEMPLATES } from '../../domain/constants.js';
import { findSkillPackage } from '../../domain/skill-catalog.js';
import { findHookPackage } from '../../domain/hook-catalog.js';
import { AGENT_CATALOG, getAgentDefOrThrow } from '../../domain/agent-catalog.js';
import { validateInstallTarget } from '../use-path-guard/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_ROOT = join(__dirname, '../../../assets');

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Asset helpers
// ---------------------------------------------------------------------------

async function readAsset(relativePath: string): Promise<string> {
  return readFile(join(ASSETS_ROOT, relativePath), 'utf8');
}

async function scaffoldSkillDir(targetDir: string): Promise<void> {
  await mkdir(join(targetDir, 'scripts'), { recursive: true });
  await mkdir(join(targetDir, 'references'), { recursive: true });
  await mkdir(join(targetDir, 'assets'), { recursive: true });
  const skillMd = await readAsset('skills/scaffold-skill/SKILL.md');
  await writeFile(join(targetDir, 'SKILL.md'), skillMd, 'utf8');
  await writeFile(
    join(targetDir, 'references', 'README.md'),
    '# Referências\n\nDocumentação carregada sob demanda pelo agente.\n',
    'utf8'
  );
}

async function mergeHooksJson(targetFile: string): Promise<void> {
  await mkdir(dirname(targetFile), { recursive: true });
  let existing: Record<string, unknown> = { version: 1, hooks: [] };
  if (await pathExists(targetFile)) {
    const raw = await readFile(targetFile, 'utf8');
    existing = JSON.parse(raw) as Record<string, unknown>;
  }
  const templateRaw = await readAsset('hooks/scaffold-hook/hooks.json');
  const template = JSON.parse(templateRaw) as { version: number; hooks: unknown[] };
  const merged = {
    version: 1,
    hooks: [...((existing.hooks as unknown[]) ?? []), ...template.hooks],
  };
  await writeFile(targetFile, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
}

/**
 * Creates a symlink at `linkPath` pointing to `target` (relative path).
 * Skips silently if the symlink already exists and points to the same target.
 */
async function ensureSymlink(target: string, linkPath: string): Promise<void> {
  try {
    const stat = await lstat(linkPath);
    if (stat.isSymbolicLink()) return; // Already a symlink — skip
  } catch {
    // linkPath doesn't exist yet — create it
  }
  await mkdir(dirname(linkPath), { recursive: true });
  await symlink(target, linkPath);
}

// ---------------------------------------------------------------------------
// Project-scope installation helpers
// ---------------------------------------------------------------------------

/**
 * Installs a skill into the project's `.agents/skills/<itemId>/` directory
 * and creates a symlink from `.<agentDir>/skills/<itemId>` → `../../.agents/skills/<itemId>`.
 */
async function installSkillProject(
  projectRoot: string,
  agentId: AgentId,
  itemId: string
): Promise<string[]> {
  const def = getAgentDefOrThrow(agentId);

  const truthDir = join(projectRoot, '.agents', 'skills', itemId);
  await scaffoldSkillDir(truthDir);

  const linkDir = join(projectRoot, def.agentProjectDir, 'skills', itemId);
  // Relative path from linkDir's parent (.<agentDir>/skills/) to .agents/skills/<itemId>
  const relTarget = relative(join(projectRoot, def.agentProjectDir, 'skills'), truthDir);
  await ensureSymlink(relTarget, linkDir);

  return [truthDir, linkDir];
}

/**
 * Installs a hook into the project's `.agents/hooks/hooks.json` and creates a
 * symlink from `.<agentDir>/hooks.json` → `../../.agents/hooks/hooks.json`.
 */
async function installHookProject(
  projectRoot: string,
  agentId: AgentId
): Promise<string[]> {
  const def = getAgentDefOrThrow(agentId);

  const truthFile = join(projectRoot, '.agents', 'hooks', 'hooks.json');
  await mergeHooksJson(truthFile);

  const linkFile = join(projectRoot, def.agentProjectDir, 'hooks.json');
  const relTarget = relative(join(projectRoot, def.agentProjectDir), join(projectRoot, '.agents', 'hooks', 'hooks.json'));
  await ensureSymlink(relTarget, linkFile);

  return [truthFile, linkFile];
}

// ---------------------------------------------------------------------------
// Global-scope installation helpers (no .agents/, no symlink)
// ---------------------------------------------------------------------------

async function installSkillGlobal(agentId: AgentId, itemId: string): Promise<string[]> {
  const def = getAgentDefOrThrow(agentId);
  const targetDir = join(def.globalSkillRoot, itemId);
  await scaffoldSkillDir(targetDir);
  return [targetDir];
}

async function installHookGlobal(agentId: AgentId): Promise<string[]> {
  const def = getAgentDefOrThrow(agentId);
  await mergeHooksJson(def.globalHookFile);
  return [def.globalHookFile];
}

// ---------------------------------------------------------------------------
// New unified install API
// ---------------------------------------------------------------------------

export async function installResources(
  input: InstallResourceInput
): Promise<InstallResourceResult> {
  const { kind, packageId, itemId, destination, projectRoot, dryRun } = input;
  const { agentId, scope } = destination;

  const pkg =
    kind === 'skill' ? findSkillPackage(packageId) : findHookPackage(packageId);
  if (!pkg) {
    return { ok: false, paths: [], message: `Pacote desconhecido: ${packageId}` };
  }
  const item = pkg.items.find((i) => i.id === itemId);
  if (!item) {
    return { ok: false, paths: [], message: `Item desconhecido: ${itemId}` };
  }

  if (scope === 'project' && !projectRoot) {
    return { ok: false, paths: [], message: 'projectRoot é obrigatório para escopo projeto.' };
  }

  if (dryRun) {
    const def = getAgentDefOrThrow(agentId);
    const paths: string[] =
      scope === 'global'
        ? kind === 'skill'
          ? [join(def.globalSkillRoot, itemId)]
          : [def.globalHookFile]
        : kind === 'skill'
          ? [join(projectRoot!, '.agents', 'skills', itemId), join(projectRoot!, def.agentProjectDir, 'skills', itemId)]
          : [join(projectRoot!, '.agents', 'hooks', 'hooks.json'), join(projectRoot!, def.agentProjectDir, 'hooks.json')];
    return {
      ok: true,
      paths,
      message: `[dry-run] ${kind === 'skill' ? 'Skill' : 'Hook'} "${item.label}" em ${paths.join(', ')}`,
    };
  }

  try {
    let installedPaths: string[];

    if (scope === 'global') {
      installedPaths =
        kind === 'skill'
          ? await installSkillGlobal(agentId, itemId)
          : await installHookGlobal(agentId);
    } else {
      installedPaths =
        kind === 'skill'
          ? await installSkillProject(projectRoot!, agentId, itemId)
          : await installHookProject(projectRoot!, agentId);
    }

    return {
      ok: true,
      paths: installedPaths,
      message: `${kind === 'skill' ? 'Skill' : 'Hook'} "${item.label}" instalada em:\n${installedPaths.map((p) => `  ${p}`).join('\n')}`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, paths: [], message: msg };
  }
}

// ---------------------------------------------------------------------------
// Agent detection
// ---------------------------------------------------------------------------

export async function detectInstalledAgents(): Promise<AgentId[]> {
  const detected: AgentId[] = [];
  for (const def of AGENT_CATALOG) {
    if (await pathExists(def.detectionPath)) {
      detected.push(def.id);
    }
  }
  return detected;
}

// ---------------------------------------------------------------------------
// Legacy API (kept for benchmark smoke + backward compat)
// ---------------------------------------------------------------------------

export function getAvailableTemplates(kind?: ResourceKind) {
  if (!kind) return AVAILABLE_TEMPLATES;
  return AVAILABLE_TEMPLATES.filter((t) => t.kind === kind);
}

async function installSkillLegacy(
  input: InstallAgentResourceInput
): Promise<InstallAgentResourceResult> {
  // Legacy always uses cursor global path for backward compat
  const targetDir =
    input.scope === 'global'
      ? join(homedir(), '.agents', 'skills', input.templateId)
      : join(input.projectPath ?? '', '.agents', 'skills', input.templateId);
  if (input.dryRun) {
    return { ok: true, targetPath: targetDir, message: `[dry-run] Skill em ${targetDir}` };
  }
  await scaffoldSkillDir(targetDir);
  return { ok: true, targetPath: targetDir, message: `Skill instalada em ${targetDir}` };
}

async function installHookLegacy(
  input: InstallAgentResourceInput
): Promise<InstallAgentResourceResult> {
  const targetFile =
    input.scope === 'global'
      ? join(homedir(), '.cursor', 'hooks.json')
      : join(input.projectPath ?? '', '.cursor', 'hooks.json');
  if (input.dryRun) {
    return { ok: true, targetPath: targetFile, message: `[dry-run] Hook em ${targetFile}` };
  }
  await mergeHooksJson(targetFile);
  return { ok: true, targetPath: targetFile, message: `Hook instalado em ${targetFile}` };
}

export async function installAgentResource(
  input: InstallAgentResourceInput
): Promise<InstallAgentResourceResult> {
  const template = AVAILABLE_TEMPLATES.find((t) => t.id === input.templateId);
  if (!template) {
    return { ok: false, targetPath: '', message: `Template desconhecido: ${input.templateId}` };
  }
  const targetValidation = await validateInstallTarget(input);
  if (!targetValidation.ok) {
    return {
      ok: false,
      targetPath: targetValidation.targetPath ?? '',
      message: targetValidation.error ?? 'Destino de instalação inválido.',
    };
  }
  if (template.kind === 'skill') return installSkillLegacy(input);
  return installHookLegacy(input);
}
