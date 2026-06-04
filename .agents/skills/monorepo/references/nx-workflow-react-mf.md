---
title: Workflow React — Deploy de Micro Frontends (S3/CloudFront)
impact: HIGH
impactDescription: sem pipeline padronizado, deploys de MFs ficam inconsistentes e manuais
tags: nx, pipeline, ci-cd, github-actions, react, microfrontend, s3, cloudfront, deploy
---

## Workflow React — Deploy de Micro Frontends (S3/CloudFront)

Workflow completo de referência para deploy de apps React Microfrontend em S3 com invalidação de CloudFront. Para deploy de SPAs, consulte `nx-workflow-react-spa.md`. Para documentação de cada action, consulte `nx-actions-reference.md`.

### Workflow Completo de Referência (Staging)

```yaml
name: Deploy MFs to Staging
run-name: 'Deploy MF Staging: ${{ github.ref_name }} by @${{ github.actor }}'

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
      mf-dirs: ${{ steps.detect.outputs.mf_dirs }}
      has-mf: ${{ steps.detect.outputs.has_mf }}
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

      - name: Build affected React MF apps
        if: steps.detect.outputs.has_mf == 'true'
        run: |
          echo "🎯 Building affected React MF apps..."
          pnpm nx affected -t build:staging --exclude='*,!tag:framework:react,!tag:type:mf'

      - name: Version and tag affected apps
        if: steps.detect.outputs.has_mf == 'true'
        uses: Hotmart-Org/actions/nx/release-version@master
        with:
          gh-token: ${{ env.GH_TOKEN }}
          framework: react
          actor: ${{ github.actor }}

      - name: Upload build artifacts
        if: steps.detect.outputs.has_mf == 'true'
        uses: Hotmart-Org/actions/nx/upload-artifacts@master
        with:
          framework: react
          artifact-name: dist-artifacts

  deploy:
    name: Deploy MF ${{ matrix.app-dir }}
    needs: [detect-build-and-tag]
    if: needs.detect-build-and-tag.outputs.has-mf == 'true'
    runs-on: buildstaging
    permissions:
      contents: read
      id-token: write
    strategy:
      fail-fast: false
      matrix:
        app-dir: ${{ fromJson(needs.detect-build-and-tag.outputs.mf-dirs) }}
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
          echo "🚀 MF App: ${{ matrix.app-dir }}"
          echo "📦 Version: $VERSION"
          echo "=========================================="

      - name: Deploy Microfrontend to S3
        uses: Hotmart-Org/actions/s3/microfrontend/deploy@master
        with:
          bucket-name: ${{ env.BUCKET_NAME }}
          app-name: ${{ matrix.app-dir }}
          package-json-path: ./apps/${{ matrix.app-dir }}/package.json
          bundle-source: ./apps/${{ matrix.app-dir }}/dist
          account-id: ${{ env.CLOUDFRONT_ACCOUNT_ID }}
          cdn-distribution: ${{ env.CLOUDFRONT_DISTRIBUTION }}
          cdn-url: ${{ env.CLOUDFRONT_URL }}
```

### Workflow Completo de Referência (Production)

Deploy manual via `workflow_dispatch` com seleção de app. Diferente do staging, não usa `detect-affected` — o deploy é explícito e direcionado.

```yaml
name: Deploy MFs to Production
run-name: 'Deploy MF Production: ${{ github.ref_name }} by @${{ github.actor }}'

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
        description: 'Choose the MF app to deploy'
        type: choice
        required: true
        options:
          - app-mf-name-1
          - app-mf-name-2

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
          echo "🚀 MF App: ${{ github.event.inputs.appName }}"
          echo "📦 Version: $VERSION"
          echo "=========================================="

      - name: Deploy Microfrontend to S3
        uses: Hotmart-Org/actions/s3/microfrontend/deploy@master
        with:
          bucket-name: ${{ env.BUCKET_NAME }}
          app-name: ${{ github.event.inputs.appName }}
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
| Detecção | `detect-affected` (MFs afetados) | Input explícito (`appName`) |
| Build | `nx affected -t build:staging` | `nx run <app>:build:production` |
| Concurrency | `staging` (global) | `production-<appName>` (por app) |
| Versionamento | `release-version` + tags | Não versiona (já taggeado no staging) |
| Artifacts | Upload/download entre jobs | Build e deploy no mesmo job |
| Runner | `buildstaging` | `ai` |
| Cancel in-progress | Sim (default) | Não (`cancel-in-progress: false`) |

### O Que Adaptar

| Item | O que mudar | Exemplo |
|------|-------------|---------|
| `BUCKET_NAME` | Nome do bucket S3 do ambiente | `app-hotmart-chat-staging` |
| `CLOUDFRONT_ACCOUNT_ID` | Account ID da AWS | `44XXXX46XXXX` |
| `CLOUDFRONT_DISTRIBUTION` | ID da distribuição CloudFront | `E10XXXBJXXXXBU` |
| `CLOUDFRONT_URL` | URL da distribuição | `https://app-hotmart-chat.buildstaging.com` |
| `node-version` | Versão do Node.js | `22` |
| `concurrency` | Grupo de concorrência por environment | `staging`, `production` |
| `build:staging` | Target de build por environment | `build:production` |

### Checklist de Setup

- [ ] Workflow `.github/workflows/deploy-mf-staging.yml` criado
- [ ] Secrets configurados: `CI_GH_TOKEN`, `NPM_RC`
- [ ] Apps com tags `framework:react` + `type:mf` no `project.json`
- [ ] Target `build:staging` configurado no `project.json` de cada app
- [ ] Bucket S3 e distribuição CloudFront criados (1 bucket compartilhado para N MFs)
- [ ] Permissões OIDC configuradas para o runner (`id-token: write`)
