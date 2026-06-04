export type {
  AgentId,
  BrowseStepChoice,
  BrowseStepContext,
  InstallAgentResourceInput,
  InstallAgentResourceResult,
  InstallDestination,
  InstallResourceInput,
  InstallResourceResult,
  InstallScope,
  InstallTargetValidation,
  MainAction,
  PackageItem,
  ProjectInfo,
  ResourceKind,
  ResourcePackage,
  ResourceSource,
  ResourceSourceType,
  TemplateInfo,
  WelcomeContent,
  WorkspacePickMode,
  WorkspacePickerPort,
  WorkspaceShortcut,
  WorkspaceValidation,
} from './domain/types.js';

export {
  APP_VERSION,
  BRAND_NAME,
  WELCOME_TAGLINE,
} from './domain/types.js';

export type { FlowStepId, FlowStepMeta } from './domain/flow-steps.js';
export { ADD_FLOW_ORDER, formatFlowStepBanner, getFlowStep, prevStep } from './domain/flow-steps.js';

export type { AgentDef, AgentPickOption } from './domain/agent-catalog.js';
export {
  AGENT_CATALOG,
  buildAgentPickOptions,
  getAgentDef,
  getAgentDefOrThrow,
} from './domain/agent-catalog.js';

export { getWelcomeContent } from './domain/welcome.js';

export { AVAILABLE_TEMPLATES } from './domain/constants.js';

export { getSkillPackages, findSkillPackage } from './domain/skill-catalog.js';
export { getHookPackages, findHookPackage } from './domain/hook-catalog.js';

export {
  assertDirectoryExists,
  assertParentWritable,
  pathExists,
  resolvePath,
  validateInstallTarget,
} from './hooks/use-path-guard/index.js';

export {
  assertWorkspaceReady,
  detectProjectRoot,
  listProjects,
  validateWorkspace,
} from './hooks/use-workspace/index.js';

export {
  browseWorkspace,
  getWorkspaceShortcuts,
  listBrowsableDirectories,
  pickWorkspacePath,
} from './hooks/use-workspace-picker/index.js';

export {
  detectInstalledAgents,
  getAvailableTemplates,
  installAgentResource,
  installResources,
} from './hooks/use-install/index.js';

export { runBenchmarkSmoke } from './hooks/use-benchmark-smoke/index.js';
