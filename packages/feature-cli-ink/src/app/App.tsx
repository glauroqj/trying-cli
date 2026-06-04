import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import {
  buildAgentPickOptions,
  findHookPackage,
  findSkillPackage,
  formatFlowStepBanner,
  getAgentDef,
  getFlowStep,
  getHookPackages,
  getSkillPackages,
  installResources,
  listBrowsableDirectories,
  getWorkspaceShortcuts,
  installAgentResource,
} from '@trying-cli/agents-core';
import type {
  AgentId,
  AgentPickOption,
  FlowStepId,
  InstallDestination,
  InstallResourceInput,
  MainAction,
  ResourceKind,
  WorkspaceShortcut,
} from '@trying-cli/agents-core';
import { Welcome } from './components/Welcome.js';
import { StepSummary, type Answers } from './components/StepSummary.js';

// ---------------------------------------------------------------------------
// StepHeader
// ---------------------------------------------------------------------------

function StepHeader({ stepId }: { stepId: FlowStepId }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(id);
  }, [stepId]);

  const step = getFlowStep(stepId);
  if (!visible) return <Box marginBottom={1}><Text> </Text></Box>;

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color="cyan" bold>{formatFlowStepBanner(stepId)}</Text>
      <Text>{step.heading}</Text>
      {step.hint ? <Text dimColor>{step.hint}</Text> : null}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Step type
// ---------------------------------------------------------------------------

type Step =
  | 'welcome'
  | 'transition'   // brief animation before mainAction
  | 'mainAction'
  | 'resourceKind'
  | 'source'
  | 'itemPick'
  | 'agentPick'
  | 'scope'
  | 'folderBrowse'
  | 'installing'
  | 'done'
  | 'error'
  | 'findStub'
  | 'listStub'
  | 'initKind'
  | 'initInstalling';

// ---------------------------------------------------------------------------
// TransitionScreen — plays briefly between welcome and mainAction
// ---------------------------------------------------------------------------

const SWEEP_FRAMES = ['▓▒░░░', '░▓▒░░', '░░▓▒░', '░░░▓▒', '░░░░▓', '░░░░░'];

function TransitionScreen({ onDone }: { onDone: () => void }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (frame >= SWEEP_FRAMES.length) {
      onDone();
      return;
    }
    const id = setTimeout(() => setFrame((f) => f + 1), 80);
    return () => clearTimeout(id);
  }, [frame, onDone]);

  return (
    <Box flexDirection="column" alignItems="center" marginTop={1}>
      <Text color="cyan" bold>{SWEEP_FRAMES[frame] ?? ''}</Text>
    </Box>
  );
}

const BACK_NAVIGABLE: Step[] = [
  'resourceKind', 'source', 'itemPick', 'agentPick', 'scope',
  'mainAction', 'folderBrowse', 'initKind',
];

// ---------------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------------

export function App() {
  const { exit } = useApp();

  const [step, setStep] = useState<Step>('welcome');
  // Use a ref for history: avoids the anti-pattern of calling setStep inside
  // setHistory's updater function, which is unreliable in React.
  const historyRef = useRef<Step[]>([]);

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [answers, setAnswers] = useState<Answers>({});

  // wizard data
  const [kind, setKind] = useState<ResourceKind>('skill');
  const [packageId, setPackageId] = useState('');
  const [itemId, setItemId] = useState('');
  const [agentId, setAgentId] = useState<AgentId>('cursor');
  const [scope, setScope] = useState<'global' | 'project'>('global');

  // async loaded
  const [agentOptions, setAgentOptions] = useState<AgentPickOption[]>([]);
  const [browseDirs, setBrowseDirs] = useState<WorkspaceShortcut[]>([]);
  const [browseCurrent, setBrowseCurrent] = useState('');
  const [installPayload, setInstallPayload] = useState<InstallResourceInput | null>(null);

  // --- Navigation helpers (ref-based history) ---

  const goTo = useCallback((next: Step) => {
    historyRef.current = [...historyRef.current, step];
    setStep(next);
  }, [step]);

  const goBack = useCallback(() => {
    const prev = historyRef.current[historyRef.current.length - 1];
    if (prev !== undefined) {
      historyRef.current = historyRef.current.slice(0, -1);
      setStep(prev);
    }
  }, []);

  // Keyboard back: Esc or left arrow on navigable steps
  useInput((_input, key) => {
    if ((key.escape || key.leftArrow) && BACK_NAVIGABLE.includes(step)) {
      goBack();
    }
  });

  // Load agent options when entering agentPick
  useEffect(() => {
    if (step !== 'agentPick') return;
    void buildAgentPickOptions().then(setAgentOptions);
  }, [step]);

  // Load folder listing when entering folderBrowse
  useEffect(() => {
    if (step !== 'folderBrowse') return;
    const init = async () => {
      const shortcuts = await getWorkspaceShortcuts();
      const startPath = shortcuts.find((s) => s.id === 'cwd')?.path
        ?? shortcuts[0]?.path
        ?? process.env.HOME ?? '/';
      setBrowseCurrent(startPath);
      setBrowseStack([]);
      const dirs = await listBrowsableDirectories(startPath);
      setBrowseDirs(dirs);
    };
    void init();
  }, [step]);

  const loadBrowseDirs = useCallback(async (path: string) => {
    setBrowseCurrent(path);
    const dirs = await listBrowsableDirectories(path);
    setBrowseDirs(dirs);
  }, []);

  // Installation trigger
  useEffect(() => {
    if (step !== 'installing' || !installPayload) return;
    void installResources(installPayload).then((result) => {
      setMessage(result.message);
      if (result.ok) {
        setStep('done');
        setTimeout(() => exit(), 2000);
      } else {
        setError(result.message);
        setStep('error');
      }
    });
  }, [step, installPayload, exit]);

  // Init installation trigger
  useEffect(() => {
    if (step !== 'initInstalling') return;
    void installAgentResource({
      kind,
      scope: 'project',
      templateId: kind === 'skill' ? 'scaffold-skill' : 'scaffold-hook',
      projectPath: process.cwd(),
    }).then((result) => {
      setMessage(result.message);
      if (result.ok) {
        setStep('done');
        setTimeout(() => exit(), 2000);
      } else {
        setError(result.message);
        setStep('error');
      }
    });
  }, [step, kind, exit]);

  const recordAnswer = useCallback((id: FlowStepId, value: string) => {
    setAnswers((a) => ({ ...a, [id]: value }));
  }, []);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const BackItem = { label: '← Voltar', value: '__back__' } as const;

  function handleSelect<T extends string>(
    items: { value: T | '__back__'; label: string }[],
    value: T | '__back__',
    onValue: (v: T) => void
  ) {
    if (value === '__back__') { goBack(); return; }
    onValue(value as T);
  }

  // ---------------------------------------------------------------------------
  // Screens
  // ---------------------------------------------------------------------------

  if (step === 'welcome') {
    return <Welcome onContinue={() => goTo('transition')} />;
  }

  if (step === 'transition') {
    return <TransitionScreen onDone={() => { historyRef.current = []; setStep('mainAction'); }} />;
  }

  if (step === 'error') {
    return (
      <Box flexDirection="column">
        <Text color="red">✗ {error}</Text>
        <SelectInput items={[{ label: 'Sair', value: 'exit' }]} onSelect={() => exit()} />
      </Box>
    );
  }

  if (step === 'done') {
    return (
      <Box flexDirection="column">
        <Text color="green">✓ {message}</Text>
        <Text dimColor>Agents CLI — concluído</Text>
      </Box>
    );
  }

  if (step === 'findStub') {
    return (
      <Box flexDirection="column">
        <Text color="cyan" bold>Buscar Skills</Text>
        <Text>Para buscar no catálogo da comunidade, use no terminal:</Text>
        <Text color="yellow">  npx skills find [query]</Text>
        <Text dimColor>Ou explore em: https://skills.sh</Text>
        <Box marginTop={1}>
          <SelectInput items={[BackItem]} onSelect={() => goBack()} />
        </Box>
      </Box>
    );
  }

  if (step === 'listStub') {
    return (
      <Box flexDirection="column">
        <Text color="cyan" bold>Skills Instaladas</Text>
        <Text>Para listar skills instaladas, use no terminal:</Text>
        <Text color="yellow">  npx skills list</Text>
        <Text dimColor>Paths: ~/.cursor/skills/  ou  .agents/skills/</Text>
        <Box marginTop={1}>
          <SelectInput items={[BackItem]} onSelect={() => goBack()} />
        </Box>
      </Box>
    );
  }

  // Step 1 — main action
  if (step === 'mainAction') {
    return (
      <Box flexDirection="column">
        <StepHeader stepId="mainAction" />
        <SelectInput
          items={[
            { label: 'Instalar (add)  — skill ou hook de um pacote', value: 'add' },
            { label: 'Buscar (find)   — descobrir skills em skills.sh', value: 'find' },
            { label: 'Listar (list)   — ver o que está instalado', value: 'list' },
            { label: 'Criar (init)    — scaffold no projeto atual', value: 'init' },
          ]}
          onSelect={(item) => {
            switch (item.value as MainAction) {
              case 'add':  goTo('resourceKind'); break;
              case 'find': goTo('findStub');     break;
              case 'list': goTo('listStub');     break;
              case 'init': goTo('initKind');     break;
            }
          }}
        />
      </Box>
    );
  }

  // Init sub-flow
  if (step === 'initKind') {
    return (
      <Box flexDirection="column">
        <Text color="cyan" bold>Criar scaffold</Text>
        <SelectInput
          items={[
            BackItem,
            { label: 'SKILL.md   — skill no padrão Vercel', value: 'skill' },
            { label: 'hooks.json — hook para o agente', value: 'hook' },
          ]}
          onSelect={(item) => {
            if (item.value === '__back__') { goBack(); return; }
            setKind(item.value as ResourceKind);
            goTo('initInstalling');
          }}
        />
      </Box>
    );
  }

  if (step === 'initInstalling') {
    return <Text color="cyan"><Spinner type="dots" /> Criando scaffold…</Text>;
  }

  // Step 2 — resource kind
  if (step === 'resourceKind') {
    return (
      <Box flexDirection="column">
        <StepHeader stepId="resourceKind" />
        <SelectInput
          items={[
            BackItem,
            { label: 'Skill  — SKILL.md (padrão Vercel)', value: 'skill' },
            { label: 'Hook   — hooks.json', value: 'hook' },
          ]}
          onSelect={(item) => {
            if (item.value === '__back__') { goBack(); return; }
            const k = item.value as ResourceKind;
            setKind(k);
            recordAnswer('resourceKind', k === 'skill' ? 'Skill' : 'Hook');
            goTo('source');
          }}
        />
      </Box>
    );
  }

  // Step 3 — source
  if (step === 'source') {
    const packages = kind === 'skill' ? getSkillPackages() : getHookPackages();
    return (
      <Box flexDirection="column">
        <StepSummary answers={answers} current="source" />
        <StepHeader stepId="source" />
        <SelectInput
          items={[
            BackItem,
            ...packages.map((pkg) => ({ label: pkg.label, value: pkg.id })),
          ]}
          onSelect={(item) => {
            if (item.value === '__back__') { goBack(); return; }
            const pkg = packages.find((p) => p.id === item.value);
            setPackageId(item.value);
            recordAnswer('source', pkg?.label ?? item.value);
            goTo('itemPick');
          }}
        />
      </Box>
    );
  }

  // Step 4 — item pick
  if (step === 'itemPick') {
    const pkg = kind === 'skill' ? findSkillPackage(packageId) : findHookPackage(packageId);
    const items = pkg?.items ?? [];
    return (
      <Box flexDirection="column">
        <StepSummary answers={answers} current="itemPick" />
        <StepHeader stepId="itemPick" />
        <SelectInput
          items={[
            BackItem,
            ...items.map((i) => ({ label: `${i.label}  — ${i.description}`, value: i.id })),
          ]}
          onSelect={(item) => {
            if (item.value === '__back__') { goBack(); return; }
            const found = items.find((i) => i.id === item.value);
            setItemId(item.value);
            recordAnswer('itemPick', found?.label ?? item.value);
            goTo('agentPick');
          }}
        />
      </Box>
    );
  }

  // Step 5 — agent pick
  if (step === 'agentPick') {
    if (agentOptions.length === 0) {
      return <Text color="cyan"><Spinner type="dots" /> Detectando agentes instalados…</Text>;
    }
    return (
      <Box flexDirection="column">
        <StepSummary answers={answers} current="agentPick" />
        <StepHeader stepId="agentPick" />
        <SelectInput
          items={[
            BackItem,
            ...agentOptions.map((a) => ({
              label: a.detected ? `✓  ${a.label}` : `   ${a.label}`,
              value: a.id,
            })),
          ]}
          onSelect={(item) => {
            if (item.value === '__back__') { goBack(); return; }
            const selected = agentOptions.find((a) => a.id === item.value);
            setAgentId(item.value as AgentId);
            recordAnswer('agentPick', selected?.detected ? `${selected.label} (detectado)` : (selected?.label ?? item.value));
            goTo('scope');
          }}
        />
      </Box>
    );
  }

  // Step 6 — scope
  if (step === 'scope') {
    const def = getAgentDef(agentId);
    return (
      <Box flexDirection="column">
        <StepSummary answers={answers} current="scope" />
        <StepHeader stepId="scope" />
        <SelectInput
          items={[
            BackItem,
            {
              label: 'Global',
              value: 'global',
            },
            {
              label: 'Em um projeto',
              value: 'project',
            },
          ]}
          onSelect={(item) => {
            if (item.value === '__back__') { goBack(); return; }
            const s = item.value as 'global' | 'project';
            setScope(s);
            recordAnswer('scope', s === 'global'
              ? `Global (${def?.globalSkillRoot ?? '~/<agent>/skills'})`
              : 'Em um projeto (.agents/ + symlink)'
            );
            if (s === 'global') {
              const dest: InstallDestination = { agentId, scope: 'global' };
              setInstallPayload({ kind, packageId, itemId, destination: dest });
              goTo('installing');
            } else {
              goTo('folderBrowse');
            }
          }}
        />
        {def && (
          <Box marginTop={1}>
            <Text dimColor>Global: {def.globalSkillRoot}/</Text>
          </Box>
        )}
      </Box>
    );
  }

  // Folder browser
  if (step === 'folderBrowse') {
    if (!browseCurrent) {
      return <Text color="cyan"><Spinner type="dots" /> Carregando pastas…</Text>;
    }

    const parentPath = browseCurrent.split('/').slice(0, -1).join('/') || '/';
    const canGoUp = browseCurrent !== parentPath;

    const items: { label: string; value: string }[] = [
      BackItem,
      { label: `✓  Usar esta pasta`, value: '__use__' },
    ];
    if (canGoUp) {
      items.push({ label: `↑  Subir para ${parentPath}`, value: `__up__` });
    }
    for (const dir of browseDirs) {
      items.push({ label: `${dir.label}/`, value: `__enter__:${dir.path}` });
    }

    return (
      <Box flexDirection="column">
        <StepHeader stepId="folderBrowse" />
        <Text>Pasta atual: <Text color="cyan">{browseCurrent}</Text></Text>
        <SelectInput
          items={items}
          onSelect={(item) => {
            if (item.value === '__back__') { goBack(); return; }
            if (item.value === '__use__') {
              setProjectRoot(browseCurrent);
              const dest: InstallDestination = { agentId, scope: 'project' };
              setInstallPayload({ kind, packageId, itemId, destination: dest, projectRoot: browseCurrent });
              goTo('installing');
              return;
            }
            if (item.value === '__up__') {
              setBrowseStack((s) => [...s, browseCurrent]);
              void loadBrowseDirs(parentPath);
              return;
            }
            if (item.value.startsWith('__enter__:')) {
              const next = item.value.slice(10);
              setBrowseStack((s) => [...s, browseCurrent]);
              void loadBrowseDirs(next);
            }
          }}
        />
      </Box>
    );
  }

  // Installing
  if (step === 'installing') {
    return <Text color="cyan"><Spinner type="dots" /> Instalando…</Text>;
  }

  return null;
}
