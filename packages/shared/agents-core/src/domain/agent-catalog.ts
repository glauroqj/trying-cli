import { access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { AgentId } from './types.js';

export interface AgentPickOption {
  id: AgentId;
  label: string;
  detected: boolean;
  globalSkillRoot: string;
}

async function fsExists(p: string): Promise<boolean> {
  try { await access(p); return true; } catch { return false; }
}

export async function buildAgentPickOptions(): Promise<AgentPickOption[]> {
  return Promise.all(
    AGENT_CATALOG.map(async (def) => ({
      id: def.id,
      label: def.label,
      detected: await fsExists(def.detectionPath),
      globalSkillRoot: def.globalSkillRoot,
    }))
  );
}

export interface AgentDef {
  id: AgentId;
  label: string;
  /** Path used to detect whether the agent is installed. */
  detectionPath: string;
  /** Root for global skill installation: ~/.cursor/skills/ */
  globalSkillRoot: string;
  /** File path for global hook installation: ~/.cursor/hooks.json */
  globalHookFile: string;
  /** Subdirectory inside the project for the agent's symlink (relative to project root). */
  agentProjectDir: string;
}

const home = homedir();

export const AGENT_CATALOG: AgentDef[] = [
  {
    id: 'cursor',
    label: 'Cursor',
    detectionPath: join(home, '.cursor'),
    globalSkillRoot: join(home, '.cursor', 'skills'),
    globalHookFile: join(home, '.cursor', 'hooks.json'),
    agentProjectDir: '.cursor',
  },
  {
    id: 'claude-code',
    label: 'Claude Code',
    detectionPath: join(home, '.claude'),
    globalSkillRoot: join(home, '.claude', 'skills'),
    globalHookFile: join(home, '.claude', 'hooks.json'),
    agentProjectDir: '.claude',
  },
  {
    id: 'opencode',
    label: 'OpenCode',
    detectionPath: join(home, '.config', 'opencode'),
    globalSkillRoot: join(home, '.config', 'opencode', 'skills'),
    globalHookFile: join(home, '.config', 'opencode', 'hooks.json'),
    agentProjectDir: '.opencode',
  },
  {
    id: 'codex',
    label: 'Codex',
    detectionPath: join(home, '.codex'),
    globalSkillRoot: join(home, '.codex', 'skills'),
    globalHookFile: join(home, '.codex', 'hooks.json'),
    agentProjectDir: '.codex',
  },
  {
    id: 'github-copilot',
    label: 'GitHub Copilot',
    detectionPath: join(home, '.copilot'),
    globalSkillRoot: join(home, '.copilot', 'skills'),
    globalHookFile: join(home, '.copilot', 'hooks.json'),
    agentProjectDir: '.copilot',
  },
  {
    id: 'windsurf',
    label: 'Windsurf',
    detectionPath: join(home, '.codeium', 'windsurf'),
    globalSkillRoot: join(home, '.codeium', 'windsurf', 'skills'),
    globalHookFile: join(home, '.codeium', 'windsurf', 'hooks.json'),
    agentProjectDir: '.windsurf',
  },
  {
    id: 'roo',
    label: 'Roo Code',
    detectionPath: join(home, '.roo'),
    globalSkillRoot: join(home, '.roo', 'skills'),
    globalHookFile: join(home, '.roo', 'hooks.json'),
    agentProjectDir: '.roo',
  },
  {
    id: 'gemini-cli',
    label: 'Gemini CLI',
    detectionPath: join(home, '.gemini'),
    globalSkillRoot: join(home, '.gemini', 'skills'),
    globalHookFile: join(home, '.gemini', 'hooks.json'),
    agentProjectDir: '.gemini',
  },
  {
    id: 'goose',
    label: 'Goose',
    detectionPath: join(home, '.config', 'goose'),
    globalSkillRoot: join(home, '.config', 'goose', 'skills'),
    globalHookFile: join(home, '.config', 'goose', 'hooks.json'),
    agentProjectDir: '.goose',
  },
  {
    id: 'continue',
    label: 'Continue',
    detectionPath: join(home, '.continue'),
    globalSkillRoot: join(home, '.continue', 'skills'),
    globalHookFile: join(home, '.continue', 'hooks.json'),
    agentProjectDir: '.continue',
  },
  {
    id: 'kiro',
    label: 'Kiro (AWS)',
    detectionPath: join(home, '.kiro'),
    globalSkillRoot: join(home, '.kiro', 'skills'),
    globalHookFile: join(home, '.kiro', 'hooks.json'),
    agentProjectDir: '.kiro',
  },
];

export function getAgentDef(id: AgentId): AgentDef | undefined {
  return AGENT_CATALOG.find((a) => a.id === id);
}

export function getAgentDefOrThrow(id: AgentId): AgentDef {
  const def = getAgentDef(id);
  if (!def) throw new Error(`Agente desconhecido: ${id}`);
  return def;
}
