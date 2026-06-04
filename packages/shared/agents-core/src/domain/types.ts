export type ResourceKind = 'skill' | 'hook';

export type InstallScope = 'global' | 'project';

export type MainAction = 'add' | 'find' | 'list' | 'init';

export type AgentId =
  | 'cursor'
  | 'claude-code'
  | 'opencode'
  | 'codex'
  | 'github-copilot'
  | 'windsurf'
  | 'roo'
  | 'gemini-cli'
  | 'goose'
  | 'continue'
  | 'kiro';

/**
 * A single option shown in the unified destination step.
 * Combines the agent identity with the install scope so the user
 * makes one choice instead of two separate selects.
 */
export interface InstallDestination {
  agentId: AgentId;
  scope: InstallScope;
}

export type ResourceSourceType = 'registry' | 'bundled' | 'local';

export interface ResourceSource {
  type: ResourceSourceType;
  id: string;
  label: string;
  description: string;
}

export interface PackageItem {
  id: string;
  label: string;
  description: string;
}

export interface ResourcePackage {
  id: string;
  label: string;
  kind: ResourceKind;
  source: ResourceSource;
  items: PackageItem[];
}

export interface InstallResourceInput {
  kind: ResourceKind;
  packageId: string;
  itemId: string;
  destination: InstallDestination;
  /** Required when destination.scope === 'project'. */
  projectRoot?: string;
  dryRun?: boolean;
}

export interface InstallResourceResult {
  ok: boolean;
  paths: string[];
  message: string;
}

export interface ProjectInfo {
  name: string;
  path: string;
  kind: 'node' | 'python' | 'go' | 'git' | 'other';
}

export interface WorkspaceValidation {
  ok: boolean;
  error?: string;
  path?: string;
}

export interface TemplateInfo {
  id: string;
  kind: ResourceKind;
  label: string;
  description: string;
}

export interface InstallAgentResourceInput {
  kind: ResourceKind;
  scope: InstallScope;
  templateId: string;
  projectPath?: string;
  dryRun?: boolean;
}

export interface InstallAgentResourceResult {
  ok: boolean;
  targetPath: string;
  message: string;
}

export const APP_VERSION = '0.0.0';

export const WELCOME_TAGLINE =
  'Padronize IA no seu fluxo de desenvolvimento';

export const BRAND_NAME = 'Agents';

export interface WelcomeContent {
  brandName: string;
  tagline: string;
  subtitle: string;
  version: string;
}

export interface WorkspaceShortcut {
  id: string;
  label: string;
  path: string;
}

export type WorkspacePickMode = 'shortcut' | 'browse' | 'manual';

export interface BrowseStepContext {
  currentPath: string;
  canGoBack: boolean;
  subdirectories: WorkspaceShortcut[];
}

export type BrowseStepChoice =
  | { type: 'use' }
  | { type: 'enter'; path: string }
  | { type: 'back' }
  | { type: 'cancel' };

export interface WorkspacePickerPort {
  askMode(): Promise<WorkspacePickMode | 'cancel'>;
  pickShortcut(options: WorkspaceShortcut[]): Promise<string | 'cancel'>;
  browseStep(ctx: BrowseStepContext): Promise<BrowseStepChoice>;
  askManualPath(): Promise<string | 'cancel'>;
  showError?(message: string): Promise<void>;
}

export interface InstallTargetValidation {
  ok: boolean;
  error?: string;
  targetPath?: string;
}
