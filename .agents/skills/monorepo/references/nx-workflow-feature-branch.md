---
title: Workflow — Feature Branch Deploy (Docker + Helm)
impact: HIGH
impactDescription: sem pipeline de feature branch, desenvolvedores não conseguem testar mudanças em ambiente isolado antes de mergear
tags: nx, pipeline, ci-cd, github-actions, feature-branch, docker, helm, branchRelease
---

## Workflow — Feature Branch Deploy (Docker + Helm)

Workflow de referência para deploy de feature branches em ambiente isolado via Docker + Helm. Cada push em branch `feature/**` builda todas as apps do monorepo e deploya cada uma como container separado com URL dinâmica baseada no nome da branch.

> Diferença-chave vs Staging/Production: Feature branch usa Docker + Helm (container por app), enquanto staging/production usam S3 + CloudFront (static deploy). Feature builda **todas** as apps (não apenas affected), garantindo que tudo funciona junto no ambiente de teste.

Para entender cada artefato necessário por app, consulte `feature-branch-app-setup.md`. Para detalhes de cada step e troubleshooting, consulte `feature-branch-cicd-setup.md`.

### Pré-requisitos

#### Estrutura por App

Cada app em `apps/` precisa de 5 arquivos para feature branch:

```
apps/
└── <app-name>/
    ├── Dockerfile          # Build da imagem Docker
    ├── feature.yml         # Config Helm + base-module (branchRelease, host, resources)
    ├── nginx.conf          # Config do servidor web
    ├── project.json        # Nx project config (precisa ter configuration "feature")
    └── env/
        └── .feature        # Variáveis de ambiente para feature
```

> Não é necessário um `feature.yml` na raiz do repo. O workflow usa `apps/${{ matrix.app }}/feature.yml` para base-module, Docker e Helm.

### Workflow Completo de Referência

```yaml
name: Deploy in Feature
run-name: 'Feature Deploy: ${{ github.ref_name }} by @${{ github.actor }}'

on:
  push:
    branches:
      - feature/**
      - refactor/**
      - fix/**

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  AWS_DEFAULT_REGION: us-east-1
  GH_TOKEN: ${{ secrets.CI_GH_TOKEN }}

jobs:
  detect-apps:
    name: Detect Apps
    runs-on: buildstaging
    outputs:
      apps: ${{ steps.list.outputs.apps }}
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: List all apps
        id: list
        run: |
          APPS=$(ls -d apps/*/ | xargs -I{} basename {} | jq -R -s -c 'split("\n") | map(select(. != ""))')
          echo "apps=$APPS" >> $GITHUB_OUTPUT
          echo "📋 Apps found: $APPS"

  build-and-deploy:
    name: Feature — ${{ matrix.app }}
    runs-on: buildstaging
    needs: [detect-apps]
    strategy:
      fail-fast: false
      matrix:
        app: ${{ fromJson(needs.detect-apps.outputs.apps) }}

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Base Module (Infra)
        uses: Hotmart-Org/actions/base-module@master
        with:
          gh-token: ${{ secrets.CI_GH_TOKEN }}
          pingdom-key: ${{ secrets.PINGDOM_API_TOKEN }}
          statping-key: ${{ secrets.STATPING_API_KEY }}
          newrelic-key: ${{ secrets.NEW_RELIC_API_KEY }}
          datadog-api-key: ${{ secrets.DATADOG_API_KEY }}
          datadog-app-key: ${{ secrets.DATADOG_APP_KEY }}
          cloudflare-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          sentry-auth-token: ${{ secrets.SENTRY_AUTH_TOKEN }}
          mongodb_atlas_private_key: ${{ secrets.MONGODB_ATLAS_PRIVATE_KEY }}
          mongodb_atlas_public_key: ${{ secrets.MONGODB_ATLAS_PUBLIC_KEY }}
          file: apps/${{ matrix.app }}/feature.yml
          environment: staging
          cluster: buildstaging
          namespace: <namespace>

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Retrieve .npmrc
        uses: Hotmart-Org/actions/codeartifact@master
        with:
          npmrc: '${{ secrets.NPM_RC }}'

      - name: Setup PNPM
        uses: Hotmart-Org/actions/nx/setup-pnpm@master

      - name: Setup Cache
        uses: Hotmart-Org/actions/nx/setup-nx-cache@master

      - name: Install Dependencies
        run: |
          echo "shamefully-hoist=true" >> .npmrc
          echo "strict-peer-dependencies=false" >> .npmrc
          echo "auto-install-peers=true" >> .npmrc
          pnpm install --frozen-lockfile

      - name: Build app
        env:
          TARGET_ENV: feature
        run: |
          BRANCH_NAME="${{ github.ref_name }}"
          CLEAN_BRANCH=$(echo "$BRANCH_NAME" | tr -cd '[:alnum:]\n' | tr '[:upper:]' '[:lower:]')
          export APP_HOST="${CLEAN_BRANCH}-<app>.buildstaging.com"
          echo "🎯 Building ${{ matrix.app }} for feature (host: $APP_HOST)..."
          pnpm nx run ${{ matrix.app }}:build:feature

      - name: Docker Build
        uses: Hotmart-Org/actions/docker@master
        with:
          file: apps/${{ matrix.app }}/feature.yml
          dockerfile: apps/${{ matrix.app }}/Dockerfile

      - name: Deploy Feature
        uses: Hotmart-Org/actions/helm@master
        with:
          file: apps/${{ matrix.app }}/feature.yml
          environment: staging
          cluster: buildstaging
          namespace: <namespace>
```

### Fluxo do Pipeline

```
push em feature/**
  │
  ├─ Job 1: detect-apps
  │     └─ ls apps/*/ → JSON array de apps
  │
  └─ Job 2: build-and-deploy (matrix por app, depende de Job 1)
        ├─ checkout
        ├─ base-module (Terraform: namespace, ingress — usa feature.yml da app)
        ├─ setup (node, pnpm, codeartifact, cache)
        ├─ pnpm install (com flags de compatibilidade)
        ├─ build (TARGET_ENV=feature + APP_HOST dinâmico + nx run <app>:build:feature)
        ├─ docker build (Dockerfile da app, context = raiz)
        └─ helm deploy (feature.yml da app, branchRelease = true)
```

### URL Gerada

O Helm com `branchRelease: true` gera URLs no formato:

```
https://{branch-sanitizado}-{host-da-app}
```

O branch é sanitizado: lowercase, apenas alfanuméricos (sem `/`, `-`, `_`).

Exemplo: monorepo com 3 apps (`app`, `astrobox`, `astroflow`), branch `feature/bwtest`:

| App | Host no `feature.yml` | URL gerada |
|-----|----------------------|------------|
| `app` | `app.buildstaging.com` | `https://featurebwtest-app.buildstaging.com` |
| `astrobox` | `astrobox.buildstaging.com` | `https://featurebwtest-astrobox.buildstaging.com` |
| `astroflow` | `astroflow.buildstaging.com` | `https://featurebwtest-astroflow.buildstaging.com` |

Outro exemplo com branch `feature/ONB-2099`:

| App | URL gerada |
|-----|------------|
| `app` | `https://featureonb2099-app.buildstaging.com` |
| `astrobox` | `https://featureonb2099-astrobox.buildstaging.com` |
| `astroflow` | `https://featureonb2099-astroflow.buildstaging.com` |

> Cada app do monorepo recebe sua própria URL. O prefixo é sempre o nome da branch sanitizado, e o host vem do `lb.hosts[].host` do `feature.yml` de cada app.

### Diferenças-chave vs Staging/Production

| Aspecto | Feature Branch | Staging | Production |
|---------|---------------|---------|------------|
| Trigger | Push em `feature/**` | Push em `main` | `workflow_dispatch` |
| Detecção | Todas as apps (`ls apps/*/`) | `detect-affected` | Input explícito |
| Deploy | Docker + Helm | S3 + CloudFront | S3 + CloudFront |
| URL | Dinâmica por branch | Fixa | Fixa |
| Versionamento | Não versiona | `release-version` | Não versiona |
| Infra | `base-module` (step por app) | Não precisa | Não precisa |
| Cleanup | Automático (`branchReleaseCollapseTime`) | N/A | N/A |

### Actions Utilizadas

| Action | Função |
|--------|--------|
| `Hotmart-Org/actions/base-module` | Configura infra (Terraform, namespace, ingress) — roda como step, não como job |
| `Hotmart-Org/actions/codeartifact` | Configura `.npmrc` com tokens do registry privado |
| `Hotmart-Org/actions/nx/setup-pnpm` | Instala e configura pnpm |
| `Hotmart-Org/actions/nx/setup-nx-cache` | Cache do pnpm store + `.nx/cache` |
| `Hotmart-Org/actions/docker` | Build e push da imagem Docker (`dockerfile` e `file` como inputs) |
| `Hotmart-Org/actions/helm` | Deploy via Helm no EKS (`file` como input, lê `branchRelease`) |

### O Que Adaptar

| Item | O que mudar | Exemplo |
|------|-------------|---------|
| `<namespace>` | Namespace do Kubernetes | `vulcano` |
| `<app>` | Nome da app usado no host dinâmico | `app` (gera `featurexyz-app.buildstaging.com`) |
| `node-version` | Versão do Node.js | `20` |
| Branches trigger | Padrões de branch | `feature/**`, `fix/**` |
| `TARGET_ENV` | Nome da env var que controla o env file | Depende do bundler config |
| Flags de pnpm | Remover se não necessário | Testar sem `shamefully-hoist` |
| Secrets do base-module | Apenas os que o monorepo usa | Nem todos são obrigatórios |

### Checklist de Setup

- [ ] Para cada app em `apps/`:
  - [ ] `apps/<app>/Dockerfile` com paths corretos de dist e nginx
  - [ ] `apps/<app>/feature.yml` com `branchRelease: true`, host correto e `name` = nome do repositório
  - [ ] `apps/<app>/nginx.conf` configurado
  - [ ] Configuration `feature` no target `build` do `project.json`
  - [ ] Arquivo de env para feature (ex: `env/.feature`) com URLs de staging
- [ ] Workflow `.github/workflows/feature.yml` criado
- [ ] Secrets configurados (ver tabela em `feature-branch-cicd-setup.md`)
- [ ] `TARGET_ENV=feature` definido no step de build
- [ ] `APP_HOST` dinâmico gerado no step de build (sanitiza branch name → export)
