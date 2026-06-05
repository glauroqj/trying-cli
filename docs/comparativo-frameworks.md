# Comparativo de Frameworks CLI

Análise detalhada das três implementações do trying-cli — Commander+Clack, Ink e Pastel — com referência à decisão da vercel-labs/skills.

---

## 1. Resumo executivo

| Critério | Commander + Clack | Ink | Pastel |
|----------|-------------------|-----|--------|
| **Modelo mental** | CLI tradicional + prompts | React no terminal | Next.js no terminal |
| **Runtime deps** | commander, @clack/prompts, picocolors | ink, react, ink-* | pastel, ink, react, zod, ink-* |
| **Bundle estimado** | Pequeno | Médio-grande | Médio-grande |
| **Startup** | Rápido | Moderado (React init) | Moderado (Pastel + Ink + React) |
| **DX** | Familiar para devs CLI | Familiar para devs React | Familiar para devs Next.js |
| **Ecossistema** | Muito maduro | Maduro | Nichado |
| **Fit para wizard** | Excelente | Bom | Bom |
| **Fit para muitos comandos** | Excelente | Moderado | Bom |
| **Recomendação** | **Principal** | Casos de UI complexa | Se já usa Next.js |

**Recomendação:** Commander + Clack para o caso de uso atual (wizard de instalação de skills).

---

## 2. O que a vercel-labs/skills escolheu

A equipe da Vercel Labs **descartou** Commander, Ink e Pastel. Optaram por:

- **Argv manual** — routing com `switch` em `cli.ts`
- **`@clack/prompts`** — prompts interativos (spinner, multi-select, confirm)
- **ANSI + readline** — apenas onde Clack não atendia (search fzf em `find.ts`)

Resultado: **1 runtime dependency** (`yaml`) e bundle mínimo para `npx skills`.

Isso valida a abordagem Commander+Clack do trying-cli como a mais próxima do padrão de produção — a Vercel apenas removeu o Commander e fez routing manual.

---

## 3. Commander + Clack

### Stack

```
commander ^12.1.0
@clack/prompts ^0.10.0
picocolors ^1.1.1
```

### Modelo mental

CLI tradicional: `program.command('start').action(...)`. Prompts interativos separados do routing via `@clack/prompts`.

### Estrutura

```
src/
├── bin.ts           ← shebang + parseAsync
├── program.ts       ← Commander program (comandos, flags, version)
├── flows/
│   ├── run-interactive.ts  ← wizard com p.select(), p.confirm()
│   ├── show-welcome.ts
│   └── show-flow-step.ts
└── hooks/use-benchmark-adapter/
```

### Prós

- **Mais próximo da vercel-labs/skills** — mesma lib de prompts (Clack)
- **Commander maduro** — 100M+ downloads/semana, parsing robusto de flags
- **Bundle pequeno** — sem React, startup rápido
- **Muitos comandos** — ideal para CLI com subcomandos (`add`, `remove`, `list`, `update`)
- **Não-interativo** — flags (`-y`, `-g`, `-a`) funcionam nativamente via Commander
- **Testável** — prompts e routing separados

### Contras

- UI limitada a prompts sequenciais (sem layouts complexos)
- Navegação "voltar" precisa ser implementada manualmente (sentinel `__back__`)
- Sem componentes reutilizáveis entre passos

### Quando usar

- Wizard de instalação/configuração
- CLI com múltiplos subcomandos e flags
- Distribuição via `npx` (startup rápido importa)
- Modo CI (`-y`) e modo interativo no mesmo binário

---

## 4. Ink puro

### Stack

```
ink ^5.1.0
react ^18.3.1
ink-select-input, ink-spinner, ink-big-text, ink-gradient, ink-text-input
```

### Modelo mental

React no terminal. Componentes, state (`useState`), effects (`useEffect`), input handlers (`useInput`). Tudo renderizado via `render(<App />)`.

### Estrutura

```
src/
├── bin.ts
├── main.tsx         ← render(<App />)
├── app/
│   ├── App.tsx      ← máquina de estados do wizard
│   └── components/
│       ├── Welcome.tsx
│       └── StepSummary.tsx
└── hooks/use-benchmark-adapter/
```

### Prós

- **Componentes reutilizáveis** — `<Welcome />`, `<StepSummary />`, `<StepHeader />`
- **Statefulness** — `useState` para acumular respostas, navegação entre passos
- **UI rica** — gradient text, spinners, layouts com `<Box />`
- **Ecossistema** — usado por Gatsby, Parcel, Prisma, Jest
- **Animações** — transições entre passos com `setTimeout`

### Contras

- **React como dep** — bundle maior, startup mais lento
- **Modelo mental diferente** — devs CLI precisam aprender React patterns
- **TTY obrigatório** — `process.stdin.isTTY` check necessário
- **Testes mais complexos** — precisa de `ink-testing-library`
- **Overhead** para wizard simples de instalação

### Quando usar

- Dashboards no terminal (layouts side-by-side)
- UIs com múltiplos estados simultâneos na tela
- Animações e transições complexas
- Time já domina React

---

## 5. Pastel

### Stack

```
pastel ^3.0.0
ink ^5.1.0
react ^18.3.1
zod ^3.24.2
ink-select-input, ink-spinner, ink-big-text, ink-gradient, ink-text-input
```

### Modelo mental

Next.js no terminal. File-based routing: cada arquivo em `source/commands/` vira um subcomando. Validação de argumentos com Zod.

### Estrutura

```
source/
├── cli.tsx              ← bootstrap Pastel
├── commands/
│   └── index.tsx        ← comando default
└── app/
    └── PastelApp.tsx    ← UI Ink (similar ao feature-cli-ink)

src/
├── index.ts
└── hooks/use-benchmark-adapter/
```

### Prós

- **DX elegante** — file-based routing familiar para devs Next.js
- **Zod validation** — argumentos tipados e validados automaticamente
- **Escalável** — adicionar subcomando = criar arquivo em `commands/`
- **Herda benefícios do Ink** — componentes React no terminal

### Contras

- **Muito nichado** — poucos projetos em produção usam Pastel
- **Camada extra** — Pastel sobre Ink sobre React (3 abstrações)
- **Depende do Ink** — mesmos custos de bundle/startup do Ink
- **Documentação limitada** — comunidade pequena
- **Dois source roots** — `source/` (Pastel) + `src/` (lib exports) pode confundir

### Quando usar

- Time que já usa Next.js e quer a mesma DX
- CLI que vai crescer para muitos subcomandos com validação tipada
- Prototipagem rápida de novos comandos (criar arquivo = novo comando)

---

## 6. Comparativo técnico detalhado

### Dependências de runtime

| Pacote | Commander+Clack | Ink | Pastel |
|--------|-----------------|-----|--------|
| commander | sim | — | — |
| @clack/prompts | sim | — | — |
| picocolors | sim | — | — |
| ink | — | sim | sim |
| react | — | sim | sim |
| pastel | — | — | sim |
| zod | — | — | sim |
| ink-select-input | — | sim | sim |
| ink-spinner | — | sim | sim |
| ink-big-text | — | sim | sim |
| ink-gradient | — | sim | sim |
| ink-text-input | — | sim | sim |
| **Total direct deps** | **3** | **7** | **9** |

### Entry point

| | Commander+Clack | Ink | Pastel |
|--|-----------------|-----|--------|
| Arquivo | `src/bin.ts` | `src/bin.ts` | `source/cli.tsx` |
| Formato | `.ts` | `.ts` + `.tsx` | `.tsx` |
| Bootstrap | `createProgram().parseAsync()` | `render(<App />)` | `new Pastel().run()` |

### Routing

| | Commander+Clack | Ink | Pastel |
|--|-----------------|-----|--------|
| Mecanismo | Commander commands | State machine em React | File-based (`commands/`) |
| Subcomandos | `program.command('start')` | N/A (single flow) | `source/commands/*.tsx` |
| Flags | Commander nativo | Manual | Zod schema |
| Help | Commander `--help` | Manual | Pastel auto |

### Prompts / UI

| | Commander+Clack | Ink | Pastel |
|--|-----------------|-----|--------|
| Seleção | `p.select()` | `<SelectInput />` | `<SelectInput />` |
| Confirmação | `p.confirm()` | `<Text>` + `useInput` | `<Text>` + `useInput` |
| Loading | `p.spinner()` | `<Spinner />` | `<Spinner />` |
| Cancelamento | `p.cancel()` | `useInput` (Ctrl+C) | `useInput` (Ctrl+C) |
| Cores | `picocolors` | Ink colors | Ink colors |
| Navegação "voltar" | Sentinel manual | `useState` step index | `useState` step index |

---

## 7. Comparativo com vercel-labs/skills

| Aspecto | vercel-labs/skills | Commander+Clack | Ink | Pastel |
|---------|-------------------|-----------------|-----|--------|
| Routing | argv manual | Commander | React state | Pastel file-based |
| Prompts | @clack/prompts | @clack/prompts | Ink components | Ink components |
| Runtime deps | 1 (yaml) | 3 | 7 | 9 |
| Bundle | obuild (mínimo) | Pequeno | Médio | Médio |
| Comandos | 10+ | Extensível | Single flow | File-based |
| CI mode | `-y` flags | Commander flags | N/A | Zod + flags |
| Produção | Sim (1.5.10) | R&D | R&D | R&D |

---

## 8. Recomendação final

### Para o trying-cli (wizard de instalação de skills)

**Commander + Clack** — por 4 razões:

1. **Alinhamento com vercel-labs/skills** — mesma lib de prompts, mesma abordagem conceitual
2. **Bundle mínimo** — crítico para `npx` (startup rápido)
3. **Clack resolve o wizard** — select, confirm, spinner, progress cobrem 100% do fluxo atual
4. **Extensibilidade** — quando adicionar comandos `list`, `remove`, `update`, Commander já está pronto

### Quando considerar Ink

- UI com múltiplos painéis simultâneos na tela
- Animações complexas entre passos
- Dashboard de status em tempo real
- Time 100% React

### Quando considerar Pastel

- Projeto vai crescer para 10+ subcomandos
- Time já usa Next.js e quer file-based routing
- Validação tipada de argumentos é prioridade (Zod)

### Próximo passo sugerido

Consolidar em **uma única implementação** (Commander+Clack) para produção, mantendo Ink e Pastel como referência de benchmark até a decisão final. Migrar build de `tsx` para bundler (ver [distribuicao.md](./distribuicao.md)).
