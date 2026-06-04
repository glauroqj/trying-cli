# trying-cli

Monorepo Nx + pnpm para benchmark de **3 CLIs Agents CLI** (mesmo produto, frameworks diferentes). Cada CLI implementa um wizard no estilo do `npx skills` da Vercel: instalação de skills e hooks para agentes de IA.

Arquitetura baseada nas skills de [monorepo](.agents/skills/monorepo/SKILL.md) e [Feature-Sliced Design](.agents/skills/react-feature-sliced-design/SKILL.md).

## Pré-requisitos

- **Node.js** 20+ (recomendado 22 LTS)
- **pnpm** 9.x (`corepack enable && corepack prepare pnpm@9.15.9 --activate`, ou `npm i -g pnpm`)

## Como rodar localmente

### O que existe hoje?

| Modo | Comando | O que faz |
|------|---------|-----------|
| **CLI interativa** | `pnpm run cli` (ou `cli:clack`, `cli:ink`, …) | Wizard completo: boas-vindas → ação → tipo → pacote → itens → agente → escopo → instalar |
| **Benchmark** | `pnpm run benchmark:dry` | Compara os 3 adapters via smoke tests em `agents-core` — não abre prompts |

A implementação do produto está em `packages/feature-cli-*` + domínio em `packages/shared/agents-core`. O `apps/cli-benchmark` só orquestra medições.

### 1. Instalação

```bash
pnpm install
```

### 2. Testar a CLI no terminal

Use um terminal interativo (iTerm, VS Code Terminal). O atalho `pnpm run cli` inicia a variante **Commander + Clack**:

```bash
pnpm run cli
# equivalente:
pnpm run cli:clack
```

Fluxo que você deve ver (6 passos + navegação):

1. **Logo animado + boas-vindas** (gradientes cíclicos no Ink/Pastel; intro com spinner no Clack)
2. **Passo 1 — Ação:** add · find · list · init
3. **Passo 2 — Tipo de recurso:** Skill ou Hook — com "← Voltar"
4. **Passo 3 — Origem:** Vercel Labs, Built-in, … — com "← Voltar"
5. **Passo 4 — Itens:** lista do pacote — com "← Voltar"
6. **Passo 5 — Agente:** todos os 11 agentes; detectados marcados com ✓ — com "← Voltar"
7. **Passo 6 — Escopo:** Global (direto na pasta do agente) ou Em um projeto — com "← Voltar"
8. Se "Em um projeto": **navegador de pastas interativo** (sem digitar caminho) — com "← Voltar"
9. Instalação com feedback visual

**Breadcrumb** (Ink/Pastel): cada passo exibe as respostas anteriores acima do prompt.  
**Teclado** (Ink/Pastel): Esc ou seta esquerda voltam ao passo anterior.

Outras implementações (mesmo fluxo, UI diferente):

```bash
pnpm run cli:pastel    # Pastel + Ink (gradiente BigText, StepHeader colorido)
pnpm run cli:ink       # Ink puro (wizard React; exige TTY)
```

> `pnpm exec agents-clack` na raiz **não funciona** por padrão. Use os scripts `pnpm run cli:*` acima.

### 3. Testes automatizados

```bash
pnpm run test
pnpm run validate:cli-smoke   # adapter Clack + catalogs + agents + pickWorkspacePath
pnpm run benchmark:dry        # 9 cenários (3 adapters × 3)
```

### Validação das 3 CLIs

| CLI | Comando | Checklist manual |
|-----|---------|------------------|
| Commander+Clack | `pnpm run cli:clack` | add skill → Vercel Labs → react-best-practices → Cursor → global |
| Pastel | `pnpm run cli:pastel` | Logo gradiente + mesmo fluxo; StepHeader ciano em cada passo |
| Ink | `pnpm run cli:ink` | Idem (TTY obrigatório) |

**Erros a validar:** hook bundled → merge em `hooks.json`; escopo projeto auto-detecta cwd e cria `.agents/` + symlink; instalação global vai direto para `~/.cursor/skills/` (sem `~/.agents/`).

### 4. Benchmark comparativo (3 adapters)

```bash
# Dry-run
pnpm run benchmark:dry

# Sem Nx (útil se o daemon falhar)
pnpm run benchmark:tsx:dry

# Completo
pnpm run benchmark
pnpm run benchmark:tsx
```

Opções extras:

```bash
pnpm run benchmark:tsx:dry -- --only=cli-pastel,cli-ink
pnpm run benchmark:tsx:dry -- --output=./meus-relatorios
```

| Flag | Descrição |
|------|-----------|
| `--dry-run` | Não grava no disco real |
| `--output=<dir>` | Pasta dos relatórios (padrão: `dist/benchmark-results`) |
| `--only=<ids>` | Filtra: `cli-pastel`, `cli-commander-clack`, `cli-ink` |

### 5. Lint e build

```bash
pnpm run lint
pnpm run build
```

## Estrutura

```
apps/cli-benchmark/                    # Orquestrador + relatório comparativo
packages/
  feature-cli-pastel/                  # Pastel + Ink
  feature-cli-commander-clack/         # Commander.js + Clack
  feature-cli-ink/                     # Ink puro
  feature-benchmark-core/
  shared/
    agents-core/                       # Domínio + catálogos skills/hooks + flow-steps
    benchmark-types/
    exec/
    reporting/
.agents/specs/agents-cli/              # SDDs (3 frameworks + overview + investigação Vercel)
```

## Domínio (agents-core)

| Módulo | Responsabilidade |
|--------|-----------------|
| `agent-catalog.ts` | `AGENT_CATALOG` + `buildAgentPickOptions()` — 11 agentes com detecção |
| `skill-catalog.ts` | Pacotes de skills curados (Vercel Labs + built-in) |
| `hook-catalog.ts` | Pacotes de hooks bundled |
| `flow-steps.ts` | Títulos e metadados de cada etapa do wizard (5 passos) |
| `use-install` | `installResources()` — global sem symlink; projeto com `.agents/` + symlink |
| `use-workspace` | `detectProjectRoot()` — cwd inteligente |

## Documentação

- [Guia de uso da CLI](docs/guia-cli.md) — fluxo completo do wizard, ações disponíveis
- [Agentes suportados](docs/agentes.md) — tabela completa com paths e detecção
- [Instalação em projeto](docs/instalacao-projeto.md) — estrutura `.agents/` + symlink
- [Instalação global](docs/instalacao-global.md) — pastas nativas de cada agente

## Problemas comuns

| Sintoma | O que fazer |
|---------|-------------|
| `nx` não encontrado | Rodar `pnpm install` na raiz |
| Nx Daemon | Usar `pnpm run benchmark:tsx:dry` ou `NX_DAEMON=false` |
| Ink/Pastel: "requer TTY" | Executar em terminal real, não em pipe |

## Specs e referências

- Overview: [.agents/specs/agents-cli/00-overview.md](.agents/specs/agents-cli/00-overview.md)
- Investigação Vercel Skills: [.agents/specs/agents-cli/06-vercel-skills-investigation.md](.agents/specs/agents-cli/06-vercel-skills-investigation.md)
- Cenários de benchmark: [.agents/specs/benchmark-suite/README.md](.agents/specs/benchmark-suite/README.md)
- Docs: [docs/](docs/)

## Frameworks

3 implementações: **Pastel**, **Commander+Clack**, **Ink**

**Recomendação para produção:** Commander.js + Clack. **UI rica:** Pastel ou Ink.
