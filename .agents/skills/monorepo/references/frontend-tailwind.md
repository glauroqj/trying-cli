---
title: Tailwind Centralizado em Monorepo — Configuração e Padrões
impact: HIGH
impactDescription: sem centralização, cada package duplica CSS e o bundle final fragmenta ativos estáticos, degradando FCP
tags: tailwind, css, monorepo, frontend, postcss, cosmos, performance, fcp, bundle
---

## Tailwind Centralizado em Monorepo

Em monorepos frontend, o Tailwind é configurado exclusivamente na camada de `apps/`. Packages nunca declaram dependência de Tailwind nem possuem configuração CSS própria. A app é responsável por escanear as classes usadas nos packages que consome, gerando um único bundle CSS otimizado.

### Por Que Centralizar

Quando cada package configura Tailwind independentemente:

- CSS duplicado no bundle final (mesmas utility classes geradas N vezes)
- Fragmentação de ativos estáticos — múltiplos arquivos CSS carregados em paralelo
- FCP degradado — browser precisa baixar e parsear CSS redundante antes do primeiro paint
- Conflito de versões de preset/tokens entre packages

Com Tailwind centralizado na app:

- Um único CSS gerado com todas as classes usadas (app + packages)
- Tokens do design system aplicados uma vez, consistentes em todo o bundle
- Tree-shaking natural — só classes efetivamente usadas entram no build

### Estrutura de Arquivos

```
/
├── package.json                   # tailwindcss, @tailwindcss/postcss, cosmos-ds como dependências
│
├── apps/
│   └── app-platform/
│       └── src/
│           └── index.css          # @import tailwind + preset Cosmos + @source packages
│
└── packages/
    └── frontend/
        └── feature-chat/
            └── src/
                └── component.tsx  # Usa classes Tailwind livremente (sem config local)
```

### Dependências na Raiz

Tailwind e Cosmos DS são dependências exclusivas da raiz. Packages não declaram nenhuma dependência de Tailwind.

```jsonc
// package.json (raiz)
{
  "dependencies": {
    "@tryingcli-org-ca/cosmos-ds-core": "^1.x",
    "@tryingcli-org-ca/cosmos-ds-react": "^1.x",
  },
  "devDependencies": {
    "tailwindcss": "^4.x",
    "@tailwindcss/postcss": "^4.x",
    "tw-animate-css": "^1.x",
  },
}
```

### CSS Entry Point por App

O `index.css` de cada app importa o Tailwind, o preset do Cosmos e declara `@source` para escanear os packages consumidos.

```css
/* apps/app-platform/src/index.css */
@import "tailwindcss";
@import "tw-animate-css";
@import "../../../node_modules/@tryingcli-org-ca/cosmos-ds-core/dist/tailwind-preset/v4/index.css";
@source '../../../node_modules/@tryingcli-org-ca/cosmos-ds-react';

/* Escaneia packages para classes Tailwind usadas em componentes */
@source '../../../../packages/*/src/**/*.{ts,tsx,js,jsx}';
```

Em monorepos multi-stack com Technology Grouping Folders:

```css
@source '../../../../packages/frontend/*/src/**/*.{ts,tsx,js,jsx}';
```

O path do `@source` é relativo ao arquivo CSS. Ajuste conforme a profundidade da app no monorepo.

### Regras

```
❌ Errado: package com tailwind.config.js ou postcss.config.js próprio
✅ Correto: package usa classes Tailwind sem nenhuma configuração local

❌ Errado: package declara tailwindcss como dependência no package.json
✅ Correto: tailwindcss é devDependency apenas na raiz do monorepo

❌ Errado: package importa CSS do Tailwind (@import 'tailwindcss')
✅ Correto: apenas o index.css da app importa Tailwind e escaneia packages via @source
```

### IntelliSense para Packages

Packages não têm configuração Tailwind local, o que pode desabilitar o IntelliSense no editor. Para resolver, crie um arquivo CSS na raiz que importa os presets:

```css
/* tailwind-intellisense.css (raiz) */
@import "tailwindcss";
@import "./node_modules/@tryingcli-org-ca/cosmos-ds-core/dist/tailwind-preset/v4/index.css";
@source './node_modules/@tryingcli-org-ca/cosmos-ds-react';
```

Configure no settings.json do vscode:

```js
{
  ...
  "tailwindCSS.experimental.configFile": "./tailwind-intelisense.css"
}
```

### Checklist de Setup

- [ ] `tailwindcss`, `@tailwindcss/postcss`, como dependências na raiz
- [ ] Cada app com `index.css` importando Tailwind, preset Cosmos e `@source` para packages
- [ ] Nenhum package com dependência de Tailwind ou arquivo CSS de configuração
- [ ] Arquivo de IntelliSense na raiz e configuração settings.json do vscode (opcional, melhora DX)
