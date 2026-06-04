---
title: Workflow React — Deploy de SPAs (S3/CloudFront)
impact: HIGH
impactDescription: sem pipeline padronizado, deploys de SPAs ficam inconsistentes e manuais
tags: nx, pipeline, ci-cd, github-actions, react, spa, s3, cloudfront, deploy
---

## Workflow React — Deploy de SPAs (S3/CloudFront)

Workflow completo de referência para deploy de apps React SPA em S3 com invalidação de CloudFront. Para deploy de Microfrontends, consulte `nx-workflow-react-mf.md`. Para documentação de cada action, consulte `nx-actions-reference.md`.

> Diferença-chave vs MF: SPA usa `s3/spa/deploy` e faz deploy na raiz do bucket (1 bucket = 1 app). MF usa `s3/microfrontend/deploy` e organiza por subpasta (1 bucket = N apps).

### Workflow Completo de Referência (Staging)

```yaml
name: Deploy SPAs to Staging
run-name: 'Deploy SPA Staging: ${{ github.ref_name }} by @${{ github.actor }}'

concurrency: staging

env:
  GH_TOKEN: ${{ secrets.CI_GH_TOKEN }}
  BUCKET_NAME: <app>-staging
  AWS_DEFAULT_REGION: us-east-1
  CLOUDFRONT_ACCOUNT_ID: '<account-id>'
  CLOUDFRONT_DISTRIBUTION: '<distribution-id>'
  CLOUDFRONT_URL: https://<app>.buildstaging.com

on:
  push:
    branches:
      - main

jobs:
  detect-build-and-tag:
    name: Detect, Build & Tag
    runs-on: buildstaging
    permissions:
      contents: write
      actions: read
      pull-requests: read
      id-token: write
    outputs:
      spa-dirs: ${{ steps.detect.outputs.spa_dirs }}
      has-spa: ${{ steps.detect.outputs.has_spa }}
    steps:
      - name: Checkout Code
        uses: actions/checkout@v6
        with:
          token: ${{ env.GH_TOKEN }}
          fetch-depth: 0
          ref: ${{ github.ref }}
          fetch-tags: true

      - name: Setup Node
        uses: actions/setup-node@v6
        with:
          node-version: 22

      - name: Retrieve .npmrc
        uses: Hotmart-Org/actions/codeartifact@master
        with:
          npmrc: '${{ secrets.NPM_RC }}'

      - name: Setup PNPM
        uses: Hotmart-Org/actions/nx/setup-pnpm@master

      - name: Setup Cache
        uses: Hotmart-Org/actions/nx/setup-nx-cache@master

      - name: Install Dependencies
        run: pnpm install --frozen-lockfile

      - name: Detect affected projects
        id: detect
        uses: Hotmart-Org/actions/nx/detect-affected@master
        with:
          gh-token: ${{ env.GH_TOKEN }}

      - name: Build affected React SPA apps
        if: steps.detect.outputs.has_spa == 'true'
        run: |
          echo "🎯 Building affected React SPA apps..."
          pnpm nx affected -t build:staging --exclude='*,!tag:framework:react,!tag:type:spa'

      - name: Version and tag affected apps
        if: steps.detect.outputs.has_spa == 'true'
        uses: Hotmart-Org/actions/nx/release-version@master
        with:
          gh-token: ${{ env.GH_TOKEN }}
          framework: react
          actor: ${{ github.actor }}

      - name: Upload build artifacts
        if: steps.detect.outputs.has_spa == 'true'
        uses: Hotmart-Org/actions/nx/upload-artifacts@master
        with:
          framework: react
          artifact-name: dist-artifacts

  deploy:
    name: Deploy SPA ${{ matrix.app-dir }}
    needs: [detect-build-and-tag]
    if: needs.detect-build-and-tag.outputs.has-spa == 'true'
    runs-on: buildstaging
    permissions:
      contents: read
      id-token: write
    strategy:
      fail-fast: false
      matrix:
        app-dir: ${{ fromJson(needs.detect-build-and-tag.outputs.spa-dirs) }}
    steps:
      - name: Checkout Code
        uses: actions/checkout@v6
        with:
          token: ${{ env.GH_TOKEN }}
          sparse-checkout: |
            apps/${{ matrix.app-dir }}/package.json

      - name: Download artifacts
        uses: actions/download-artifact@v4
        with:
          name: dist-artifacts
          path: apps

      - name: Extract app info
        id: app-info
        run: |
          VERSION=$(jq -r '.version' apps/${{ matrix.app-dir }}/package.json)
          echo "version=$VERSION" >> $GITHUB_OUTPUT
          echo "=========================================="
          echo "🚀 SPA App: ${{ matrix.app-dir }}"
          echo "📦 Version: $VERSION"
          echo "=========================================="

      - name: Deploy SPA to S3
        uses: Hotmart-Org/actions/s3/spa/deploy@master
        with:
          bucket-name: ${{ env.BUCKET_NAME }}
          package-json-path: ./apps/${{ matrix.app-dir }}/package.json
          bundle-source: ./apps/${{ matrix.app-dir }}/dist
          account-id: ${{ env.CLOUDFRONT_ACCOUNT_ID }}
          cdn-distribution: ${{ env.CLOUDFRONT_DISTRIBUTION }}
          cdn-url: ${{ env.CLOUDFRONT_URL }}
```

### Workflow Completo de Referência (Production)

Deploy manual via `workflow_dispatch` com seleção de app. Diferente do staging, não usa `detect-affected` — o deploy é explícito e direcionado.

```yaml
name: Deploy SPAs to Production
run-name: 'Deploy SPA Production: ${{ github.ref_name }} by @${{ github.actor }}'

concurrency:
  group: production-${{ inputs.appName }}
  cancel-in-progress: false

env:
  GH_TOKEN: ${{ secrets.CI_GH_TOKEN }}
  BUCKET_NAME: <app>-production
  AWS_DEFAULT_REGION: us-east-1
  CLOUDFRONT_ACCOUNT_ID: '<account-id>'
  CLOUDFRONT_DISTRIBUTION: '<distribution-id>'
  CLOUDFRONT_URL: https://<app>.hotmart.com

on:
  workflow_dispatch:
    inputs:
      appName:
        description: 'Choose the SPA app to deploy'
        type: choice
        required: true
        options:
          - app-spa-name-1
          - app-spa-name-2

jobs:
  build-and-deploy:
    name: Build & Deploy ${{ github.event.inputs.appName }}
    runs-on: ai
    timeout-minutes: 15
    permissions:
      contents: read
      actions: read
      id-token: write
    steps:
      - name: Checkout Code
        uses: actions/checkout@v6
        with:
          token: ${{ env.GH_TOKEN }}
          fetch-depth: 0
          ref: main
          fetch-tags: true

      - name: Setup Node
        uses: actions/setup-node@v6
        with:
          node-version: 22

      - name: Retrieve .npmrc
        uses: Hotmart-Org/actions/codeartifact@master
        with:
          npmrc: '${{ secrets.NPM_RC }}'

      - name: Setup PNPM
        uses: Hotmart-Org/actions/nx/setup-pnpm@master

      - name: Setup Cache
        uses: Hotmart-Org/actions/nx/setup-nx-cache@master

      - name: Install Dependencies
        run: pnpm install --frozen-lockfile

      - name: Build app
        run: |
          echo "🎯 Building ${{ github.event.inputs.appName }} for production..."
          pnpm nx run ${{ github.event.inputs.appName }}:build:production

      - name: Extract app info
        id: app-info
        run: |
          VERSION=$(jq -r '.version' apps/${{ github.event.inputs.appName }}/package.json)
          echo "version=$VERSION" >> $GITHUB_OUTPUT
          echo "=========================================="
          echo "🚀 SPA App: ${{ github.event.inputs.appName }}"
          echo "📦 Version: $VERSION"
          echo "=========================================="

      - name: Deploy SPA to S3
        uses: Hotmart-Org/actions/s3/spa/deploy@master
        with:
          bucket-name: ${{ env.BUCKET_NAME }}
          package-json-path: ./apps/${{ github.event.inputs.appName }}/package.json
          bundle-source: ./apps/${{ github.event.inputs.appName }}/dist
          account-id: ${{ env.CLOUDFRONT_ACCOUNT_ID }}
          cdn-distribution: ${{ env.CLOUDFRONT_DISTRIBUTION }}
          cdn-url: ${{ env.CLOUDFRONT_URL }}
```

#### Diferenças-chave entre Staging e Production

| Aspecto | Staging | Production |
|---------|---------|------------|
| Trigger | `push` na `main` (automático) | `workflow_dispatch` (manual) |
| Detecção | `detect-affected` (SPAs afetados) | Input explícito (`appName`) |
| Build | `nx affected -t build:staging` | `nx run <app>:build:production` |
| Concurrency | `staging` (global) | `production-<appName>` (por app) |
| Versionamento | `release-version` + tags | Não versiona (já taggeado no staging) |
| Artifacts | Upload/download entre jobs | Build e deploy no mesmo job |
| Runner | `buildstaging` | `ai` |
| Cancel in-progress | Sim (default) | Não (`cancel-in-progress: false`) |

#### Diferenças-chave entre SPA e MF Deploy

| Aspecto | SPA (`s3/spa/deploy`) | MF (`s3/microfrontend/deploy`) |
|---------|----------------------|-------------------------------|
| Action | `Hotmart-Org/actions/s3/spa/deploy` | `Hotmart-Org/actions/s3/microfrontend/deploy` |
| Input `app-name` | Não tem | Obrigatório |
| Estrutura no bucket | Raiz (`/`) + `versions/v{version}/` | `{app-name}/_current/` + `{app-name}/v{version}/` |
| Bucket por app | 1 bucket = 1 app | 1 bucket = N apps |
| Health check | `index.html` | `remoteEntry.js` |
| Invalidação CDN | `/*` (raiz) | `/{app-name}/_current/*` |

### O Que Adaptar

| Item | O que mudar | Exemplo |
|------|-------------|---------|
| `BUCKET_NAME` | Nome do bucket S3 do ambiente (1 por SPA) | `app-hotmart-spa-staging` |
| `CLOUDFRONT_ACCOUNT_ID` | Account ID da AWS | `44XXXX46XXXX` |
| `CLOUDFRONT_DISTRIBUTION` | ID da distribuição CloudFront | `E10XXXBJXXXXBU` |
| `CLOUDFRONT_URL` | URL da distribuição | `https://app-hotmart-spa.buildstaging.com` |
| `node-version` | Versão do Node.js | `22` |
| `concurrency` | Grupo de concorrência por environment | `staging`, `production` |
| `build:staging` | Target de build por environment | `build:production` |

### Checklist de Setup

- [ ] Workflow `.github/workflows/deploy-spa-staging.yml` criado
- [ ] Secrets configurados: `CI_GH_TOKEN`, `NPM_RC`
- [ ] Apps com tags `framework:react` + `type:spa` no `project.json`
- [ ] Target `build:staging` configurado no `project.json` de cada app
- [ ] Bucket S3 dedicado por SPA e distribuição CloudFront criados
- [ ] Permissões OIDC configuradas para o runner (`id-token: write`)
