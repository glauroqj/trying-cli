import * as p from '@clack/prompts';
import color from 'picocolors';
import {
  AGENT_CATALOG,
  buildAgentPickOptions,
  findHookPackage,
  findSkillPackage,
  getAgentDef,
  getHookPackages,
  getSkillPackages,
  getWorkspaceShortcuts,
  installResources,
  listBrowsableDirectories,
  resolvePath,
} from '@trying-cli/agents-core';
import type {
  AgentId,
  InstallDestination,
  MainAction,
  ResourceKind,
} from '@trying-cli/agents-core';
import { showWelcomeScreen } from './show-welcome.js';
import { showFlowStep } from './show-flow-step.js';

// ---------------------------------------------------------------------------
// Sentinels
// ---------------------------------------------------------------------------

const BACK = '__back__';
const CANCEL = '__cancel__';

function isCancel<T>(value: T | symbol): value is symbol {
  return typeof value === 'symbol';
}

function cancelled(msg = 'Operação cancelada.'): void {
  p.cancel(msg);
}

// ---------------------------------------------------------------------------
// Accumulated data for the add flow
// ---------------------------------------------------------------------------

interface AddData {
  kind: ResourceKind;
  packageId: string;
  itemId: string;
  agentId: AgentId;
  scope: 'global' | 'project';
  projectRoot?: string;
}

// ---------------------------------------------------------------------------
// Folder browser
// ---------------------------------------------------------------------------

/**
 * Interactive folder browser using p.select.
 * Returns the chosen path, BACK sentinel, or undefined on cancel.
 */
async function browseFolderClack(start: string): Promise<string | typeof BACK | undefined> {
  let current = resolvePath(start);

  while (true) {
    const subdirs = await listBrowsableDirectories(current);
    const parent = current.split('/').slice(0, -1).join('/') || '/';

    const options: { value: string; label: string; hint?: string }[] = [
      { value: '__use__', label: `✓  Usar esta pasta`, hint: color.dim(current) },
    ];

    if (current !== parent) {
      options.push({ value: `__up__:${parent}`, label: '↑  Subir um nível', hint: color.dim(parent) });
    }

    for (const dir of subdirs) {
      options.push({ value: `__enter__:${dir.path}`, label: `${dir.label}/`, hint: color.dim(dir.path) });
    }

    options.push({ value: BACK, label: '← Voltar (passo anterior)' });

    showFlowStep('folderBrowse');
    p.log.info(`Pasta atual: ${color.cyan(current)}`);
    const choice = await p.select({
      message: 'Navegar',
      options,
    });

    if (isCancel(choice)) { cancelled(); return undefined; }
    const val = String(choice);
    if (val === BACK) return BACK;
    if (val === '__use__') return current;
    if (val.startsWith('__up__:')) { current = val.slice(7); continue; }
    if (val.startsWith('__enter__:')) { current = val.slice(10); continue; }
  }
}

// ---------------------------------------------------------------------------
// Step renderers: each returns { kind: 'value', value } | { kind: 'back' } | undefined (cancel)
// ---------------------------------------------------------------------------

type StepResult<T> = { kind: 'value'; value: T } | { kind: 'back' } | undefined;

async function stepKind(): Promise<StepResult<ResourceKind>> {
  showFlowStep('resourceKind');
  const v = await p.select({
    message: 'O que deseja instalar?',
    options: [
      { value: BACK, label: '← Voltar' },
      { value: 'skill', label: 'Skill', hint: 'SKILL.md · padrão Vercel Agent Resources' },
      { value: 'hook', label: 'Hook', hint: 'hooks.json · eventos do agente' },
    ],
  });
  if (isCancel(v)) { cancelled(); return undefined; }
  if (String(v) === BACK) return { kind: 'back' };
  return { kind: 'value', value: String(v) as ResourceKind };
}

async function stepSource(kind: ResourceKind): Promise<StepResult<string>> {
  showFlowStep('source');
  const packages = kind === 'skill' ? getSkillPackages() : getHookPackages();
  const v = await p.select({
    message: 'De qual pacote você quer instalar?',
    options: [
      { value: BACK, label: '← Voltar' },
      ...packages.map((pkg) => ({ value: pkg.id, label: pkg.label, hint: pkg.source.description })),
    ],
  });
  if (isCancel(v)) { cancelled(); return undefined; }
  if (String(v) === BACK) return { kind: 'back' };
  return { kind: 'value', value: String(v) };
}

async function stepItemPick(kind: ResourceKind, packageId: string): Promise<StepResult<string>> {
  const pkg = kind === 'skill' ? findSkillPackage(packageId) : findHookPackage(packageId);
  if (!pkg) return { kind: 'back' };
  showFlowStep('itemPick');
  const v = await p.select({
    message: `Qual item de "${pkg.label}"?`,
    options: [
      { value: BACK, label: '← Voltar' },
      ...pkg.items.map((item) => ({ value: item.id, label: item.label, hint: item.description })),
    ],
  });
  if (isCancel(v)) { cancelled(); return undefined; }
  if (String(v) === BACK) return { kind: 'back' };
  return { kind: 'value', value: String(v) };
}

async function stepAgentPick(): Promise<StepResult<AgentId>> {
  showFlowStep('agentPick');
  const allAgents = await buildAgentPickOptions();
  const options = [
    { value: BACK, label: '← Voltar' },
    ...allAgents.map((a) => ({
      value: a.id,
      label: a.detected ? `✓  ${a.label}` : `   ${a.label}`,
      hint: a.detected ? `detectado · ${a.globalSkillRoot}/` : `não detectado · ${a.globalSkillRoot}/`,
    })),
  ];
  const v = await p.select({ message: 'Em qual agente instalar?', options });
  if (isCancel(v)) { cancelled(); return undefined; }
  if (String(v) === BACK) return { kind: 'back' };
  return { kind: 'value', value: String(v) as AgentId };
}

async function stepScope(agentId: AgentId): Promise<StepResult<'global' | 'project'>> {
  const def = getAgentDef(agentId);
  showFlowStep('scope');
  const v = await p.select({
    message: 'Onde instalar?',
    options: [
      { value: BACK, label: '← Voltar' },
      { value: 'global', label: 'Global', hint: def ? `${def.globalSkillRoot}/` : '~/<agent>/skills/' },
      { value: 'project', label: 'Em um projeto', hint: '.agents/skills/ + symlink para o agente' },
    ],
  });
  if (isCancel(v)) { cancelled(); return undefined; }
  if (String(v) === BACK) return { kind: 'back' };
  return { kind: 'value', value: String(v) as 'global' | 'project' };
}

async function stepProjectRoot(): Promise<string | typeof BACK | undefined> {
  // Offer workspace shortcuts as quick-start points
  const shortcuts = await getWorkspaceShortcuts();
  const startOptions = [
    { value: BACK, label: '← Voltar' },
    ...shortcuts.map((s) => ({ value: `__nav__:${s.path}`, label: `Navegar em ${s.label}`, hint: color.dim(s.path) })),
    { value: '__nav__:/', label: 'Navegar a partir da raiz', hint: color.dim('/') },
  ];

  const choice = await p.select({ message: 'De onde começar a navegar?', options: startOptions });
  if (isCancel(choice)) { cancelled(); return undefined; }
  const val = String(choice);
  if (val === BACK) return BACK;
  const startPath = val.startsWith('__nav__:') ? val.slice(8) : val;
  return browseFolderClack(startPath);
}

// ---------------------------------------------------------------------------
// Add flow — state machine
// ---------------------------------------------------------------------------

type FlowStep = 'resourceKind' | 'source' | 'itemPick' | 'agentPick' | 'scope' | 'projectRoot';
const FLOW_STEPS: FlowStep[] = ['resourceKind', 'source', 'itemPick', 'agentPick', 'scope'];

async function runAddFlow(): Promise<void> {
  const data: Partial<AddData> = {};
  let idx = 0;

  while (idx < FLOW_STEPS.length) {
    const step = FLOW_STEPS[idx]!;
    let result: StepResult<unknown> | string | typeof BACK | undefined;

    if (step === 'resourceKind') {
      result = await stepKind();
      if (!result) return;
      // idx === 0: "← Voltar" goes back to the main action menu
      if ((result as { kind: string }).kind === 'back') { return; }
      data.kind = (result as { kind: 'value'; value: ResourceKind }).value;
    } else if (step === 'source') {
      result = await stepSource(data.kind!);
      if (!result) return;
      if ((result as { kind: string }).kind === 'back') { idx--; continue; }
      data.packageId = (result as { kind: 'value'; value: string }).value;
    } else if (step === 'itemPick') {
      result = await stepItemPick(data.kind!, data.packageId!);
      if (!result) return;
      if ((result as { kind: string }).kind === 'back') { idx--; continue; }
      data.itemId = (result as { kind: 'value'; value: string }).value;
    } else if (step === 'agentPick') {
      result = await stepAgentPick();
      if (!result) return;
      if ((result as { kind: string }).kind === 'back') { idx--; continue; }
      data.agentId = (result as { kind: 'value'; value: AgentId }).value;
    } else if (step === 'scope') {
      result = await stepScope(data.agentId!);
      if (!result) return;
      if ((result as { kind: string }).kind === 'back') { idx--; continue; }
      data.scope = (result as { kind: 'value'; value: 'global' | 'project' }).value;
    }

    idx++;
  }

  // Project root browsing (after scope selected)
  if (data.scope === 'project') {
    let projectResult: string | typeof BACK | undefined;
    while (true) {
      projectResult = await stepProjectRoot();
      if (!projectResult) return;
      if (projectResult === BACK) {
        // go back to scope
        idx = FLOW_STEPS.indexOf('scope');
        data.scope = undefined;
        // re-run the remaining loop steps
        while (idx < FLOW_STEPS.length) {
          const step = FLOW_STEPS[idx]!;
          let result: StepResult<unknown> | undefined;
          if (step === 'scope') {
            result = await stepScope(data.agentId!);
            if (!result) return;
            if ((result as { kind: string }).kind === 'back') { idx--; continue; }
            data.scope = (result as { kind: 'value'; value: 'global' | 'project' }).value;
          }
          idx++;
          if (data.scope !== 'project') break; // global → go straight to install
        }
        if (data.scope !== 'project') break; // exit folder-browse loop
        continue;
      }
      data.projectRoot = projectResult;
      break;
    }
  }

  // Install
  const destination: InstallDestination = { agentId: data.agentId!, scope: data.scope! };
  const spinner = p.spinner();
  spinner.start('Instalando…');
  const result = await installResources({
    kind: data.kind!,
    packageId: data.packageId!,
    itemId: data.itemId!,
    destination,
    projectRoot: data.projectRoot,
  });

  if (result.ok) {
    spinner.stop(color.green(result.message));
    p.log.success(`Feito! Paths criados:\n${result.paths.map((pp) => `  ${color.dim(pp)}`).join('\n')}`);
  } else {
    spinner.stop(color.red(result.message));
  }
}

// ---------------------------------------------------------------------------
// Stub flows
// ---------------------------------------------------------------------------

async function runFindStub(): Promise<void> {
  p.note(
    [
      'Para buscar skills no catálogo da comunidade, use:',
      '',
      color.cyan('  npx skills find [query]'),
      '',
      'Ou explore em: ' + color.underline('https://skills.sh'),
    ].join('\n'),
    'Busca de Skills'
  );
}

async function runListStub(): Promise<void> {
  p.note(
    [
      'Para listar skills instaladas, use:',
      '',
      color.cyan('  npx skills list'),
      '',
      'Ou verifique as pastas:',
      color.dim('  ~/.cursor/skills/   (Cursor global)'),
      color.dim('  .agents/skills/     (projeto)'),
    ].join('\n'),
    'Skills Instaladas'
  );
}

async function runInitFlow(): Promise<void> {
  const v = await p.select({
    message: 'O que deseja criar?',
    options: [
      { value: BACK, label: '← Voltar' },
      { value: 'skill', label: 'SKILL.md', hint: 'scaffold de skill no diretório atual' },
      { value: 'hook', label: 'hooks.json', hint: 'scaffold de hook para o agente' },
    ],
  });
  if (isCancel(v) || String(v) === BACK) return;
  const kind = String(v) as ResourceKind;

  const spinner = p.spinner();
  spinner.start('Criando scaffold…');
  const { installAgentResource } = await import('@trying-cli/agents-core');
  const result = await installAgentResource({
    kind,
    scope: 'project',
    templateId: kind === 'skill' ? 'scaffold-skill' : 'scaffold-hook',
    projectPath: process.cwd(),
  });
  if (result.ok) {
    spinner.stop(color.green(result.message));
  } else {
    spinner.stop(color.red(result.message));
  }
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

export async function runInteractiveFlow(): Promise<void> {
  const welcomed = await showWelcomeScreen();
  if (!welcomed) return;

  p.log.message(color.dim('Framework: Commander.js + Clack\n'));

  // Main action loop — supports going back to this menu
  while (true) {
    showFlowStep('mainAction');
    const action = await p.select<MainAction>({
      message: 'O que você quer fazer?',
      options: [
        { value: 'add', label: 'Instalar (add)', hint: 'skill ou hook de um pacote' },
        { value: 'find', label: 'Buscar (find)', hint: 'descobrir skills em skills.sh' },
        { value: 'list', label: 'Listar (list)', hint: 'ver o que está instalado' },
        { value: 'init', label: 'Criar (init)', hint: 'scaffold de skill/hook no projeto atual' },
      ],
    });
    if (isCancel(action)) { cancelled(); return; }

    switch (action as MainAction) {
      case 'add':  await runAddFlow();  break;
      case 'find': await runFindStub(); break;
      case 'list': await runListStub(); break;
      case 'init': await runInitFlow(); break;
    }

    // After completing an action, ask if the user wants to do something else
    const again = await p.confirm({ message: 'Deseja realizar outra ação?', initialValue: false });
    if (isCancel(again) || !again) break;
  }

  p.outro(color.cyan('Agents CLI — concluído'));
}
