---
title: Estrutura de Pastas da Feature
impact: CRITICAL
impactDescription: estrutura inconsistente entre features aumenta carga cognitiva e dificulta onboarding
tags: architecture, feature-structure, folder-structure, feature-sliced-design, fsd, monorepo, spa
---

## Estrutura de Pastas da Feature

Toda feature segue a mesma estrutura com 4 segments. Se uma feature cresce a ponto de ter muitos arquivos ou responsabilidades acumuladas, isso é um sinal de que ela deve ser analisada e possivelmente quebrada em features menores.

### Estrutura Padrão

#### SPA

```
src/features/checkout/
├── components/              # Componentes internos (não exportados diretamente)
│   ├── checkout-form/
│   │   ├── checkout-form.tsx
│   │   ├── checkout-form.spec.tsx
│   │   └── index.tsx
│   ├── checkout-summary/
│   │   ├── checkout-summary.tsx
│   │   ├── checkout-summary.spec.tsx
│   │   └── index.tsx
│   └── checkout-submit/
│       ├── checkout-submit.tsx
│       ├── checkout-submit.spec.tsx
│       └── index.tsx
├── context/                 # Context e Provider da feature
│   ├── checkout-context.tsx
│   └── index.tsx
├── hooks/                   # Hooks internos — lógica, requisições, estado
│   ├── use-submit-order/
│   │   ├── use-submit-order.ts
│   │   ├── use-submit-order.spec.ts
│   │   └── index.ts
│   └── use-calculate-total/
│       ├── use-calculate-total.ts
│       ├── use-calculate-total.spec.ts
│       └── index.ts
├── domain/                  # Tipos, constantes e regras de negócio
│   ├── types.ts
│   └── constants.ts
├── index.ts                 # Public API — único ponto de saída
└── README.md                # Documentação da feature
```

#### Monorepo

```
packages/frontend/feature-checkout/
├── src/
│   ├── components/
│   ├── context/
│   ├── hooks/
│   ├── domain/
│   └── index.ts
├── package.json
├── project.json
└── README.md
```

A diferença entre SPA e monorepo é a localização física.

### Os 4 Segments

Cada segment existe por uma razão. Entender o propósito de cada um é mais importante do que a quantidade de arquivos dentro dele.

#### components/

Componentes de UI internos da feature. A distinção entre smart components (usam hooks de negócio, consomem context) e dumb components (recebem props, renderizam UI) é natural pela composição — não precisa de pastas separadas como `containers/`. Com hooks, a separação de responsabilidades acontece no código, não na estrutura de pastas.

| Aspecto | Detalhe |
|---------|---------|
| Responsabilidade | Apresentação, estado de UI, composição visual |
| Exportada? | Não diretamente — exposta via compound ou módulo na public API |

#### hooks/

Hooks são o service layer da feature no React. Cada hook encapsula uma responsabilidade completa: requisição HTTP (via React Query + Axios), gerenciamento de estado da requisição, e tratamento de erro. Não existe pasta `api/` ou `services/` separada — o hook já resolve isso.

| Aspecto | Detalhe |
|---------|---------|
| Responsabilidade | Lógica de negócio, requisições HTTP, estado, tratamento de erro |
| Exportada? | Não |

#### context/

Context e Provider da feature. Encapsula estado compartilhado entre componentes. A camada context contém dois artefatos: o Provider (componente que gerencia estado) e o hook de acesso (que valida uso dentro do Provider).

| Aspecto | Detalhe |
|---------|---------|
| Responsabilidade | Estado compartilhado entre componentes, orquestração interna |
| Exportada? | Não diretamente — exposta via public API |

#### domain/

Tipos, constantes e regras de negócio da feature. Define o modelo de domínio local. Cada feature é dona do seu modelo de domínio — tipos de domínio (Order, Product, User) nunca vivem em shared. Tipos utilitários e genéricos que não pertencem a nenhum domínio (PaginatedResponse, ApiError) vivem em `shared/types/`.

| Aspecto | Detalhe |
|---------|---------|
| Responsabilidade | Modelo de domínio local — tipos, constantes, validações |
| Exportada? | Types podem ser exportados via `export type` na public API. Constantes e validações são internos |

### Convenções de Arquivo

- Componentes: pasta própria com `component.tsx`, `component.spec.tsx`, `index.tsx`
- Hooks: pasta própria com `hook.ts`, `hook.spec.ts`, `index.ts`
- Testes colocados junto ao arquivo que testam (co-location)
- Nomes em kebab-case

### README.md

Toda feature deve conter um `README.md` na raiz. Não é um segment nem uma camada — é documentação da feature como unidade. O README foca em:

- Como usar a feature (como importar, como compor na page)
- Quais regras de negócio a feature atende
- A qual domínio a feature pertence
- Dependências externas relevantes (APIs, shared libs)

O README é o primeiro lugar que um dev novo olha para entender o propósito e o uso da feature sem precisar ler o código.
