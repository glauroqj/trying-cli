# trying-cli

Monorepo Nx + pnpm para benchmark de 5 CLIs de coding agents. Estrutura baseada nas skills tryingcli de [monorepo](.agents/skills/monorepo/SKILL.md) e [Feature-Sliced Design](.agents/skills/react-feature-sliced-design/SKILL.md), adaptadas para Node.

## Estrutura

```
apps/cli-benchmark/          # Orquestrador (camada app) — compõe os 5 adapters
packages/feature-benchmark-core/
packages/feature-cli-01 … 05/   # Adapters placeholder
packages/shared/
  benchmark-types/         # Contratos
  exec/                    # spawn + timing
  reporting/               # JSON + Markdown
```

### Convenção `cli-*`

A app `cli-benchmark` usa prefixo `cli-*` (harness de terminal), não `app-*` (frontend no golden path tryingcli). Tags Nx: `type:api` na app, `type:feature` nos packages de domínio.

### Boundaries

- **App → features + shared** — composição dos 5 CLIs só em `apps/cli-benchmark/src/registry.ts`
- **Feature ↛ feature** — adapters não importam entre si
- Imports de features sempre pelo `index.ts` (public API)

## Comandos

```bash
pnpm install
pnpm nx run cli-benchmark:benchmark:dry
pnpm nx run cli-benchmark:benchmark
pnpm nx run-many -t test
pnpm nx run-many -t lint
```

Opções da CLI:

- `--dry-run` — não executa spawn real
- `--output=<dir>` — pasta de relatórios (padrão: `dist/benchmark-results`)
- `--only=cli-01,cli-03` — filtra adapters

## Specs

Cenários e métricas: [.agents/specs/benchmark-suite/README.md](.agents/specs/benchmark-suite/README.md) (symlink em `.cursor/specs`).

## Skills e specs

Fonte de verdade em `.agents/`; `.cursor/skills` e `.cursor/specs` são symlinks.
