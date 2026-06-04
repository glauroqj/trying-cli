---
name: react-feature-sliced-design
description: >
  Adaptação do Feature-Sliced Design (FSD) para aplicações React/Next.js na Hotmart.
  Simplifica as 7 layers do FSD oficial em 3 layers (app → features → shared)
  mantendo os princípios de dependência unidirecional, slices por funcionalidade
  e segments por propósito técnico.
  Cobre princípios de encapsulamento, estrutura de features, public API,
  comunicação entre módulos, regras de importação, enforcement e migração.
  Aplicável a monorepos (Nx) e projetos SPA.
  Use ao criar, estruturar ou revisar features, definir comunicação entre módulos
  ou avaliar acoplamento entre camadas.
keywords:
  - react
  - architecture
  - feature-sliced-design
  - fsd
  - vertical-slice
  - feature-module
  - encapsulation
  - public-api
  - lazy-loading
  - code-splitting
  - communication
  - decoupling
  - clean-architecture
  - solid
  - monorepo
  - spa
  - hotmart
license: Apache-2.0
metadata:
  author: Hotmart
  version: "5.0"
---

# React Architecture — Feature-Sliced Design

Adaptação do [Feature-Sliced Design](https://feature-sliced.design/) (FSD) para aplicações React/Next.js na Hotmart. Simplifica as 7 layers do FSD oficial em 3 layers (`app → features → shared`) mantendo os princípios de dependência unidirecional, slices por funcionalidade e segments por propósito técnico. Cada feature é um módulo independente, encapsulado e portável. Aplicável a monorepos (`packages/feature-*`) e SPAs (`features/*`).

> **Nota sobre nomenclatura:** O FSD oficial define 7 layers (app, pages, widgets, features, entities, shared, processes). Esta adaptação simplifica para 3 layers (app, features, shared) adequadas ao contexto frontend da Hotmart. Não confundir com Vertical Slice Architecture (Jimmy Bogard), que organiza por caso de uso individual sem hierarquia de layers.

## Quando Aplicar

Consulte esta skill ao:
- Criar uma nova feature ou módulo
- Definir estrutura de pastas e public API de uma feature
- Estruturar comunicação entre features
- Avaliar acoplamento entre camadas
- Mover uma feature entre repositórios ou plataformas
- Revisar se uma feature está bem encapsulada
- Migrar código legado para Feature-Sliced Design

## Categorias de Regras por Prioridade

| Prioridade | Categoria | Impacto | Prefixo |
|------------|-----------|---------|---------|
| 1 | Princípios e Fundamentos | CRÍTICO | `arch-` |
| 2 | Estrutura de Feature | CRÍTICO-ALTO | `feature-` |
| 3 | Segments da Feature | CRÍTICO-ALTO | `segment-` |
| 4 | Regras e Enforcement | CRÍTICO-ALTO | `rules-` |
| 5 | Migração e Escala | ALTO-MÉDIO | `scale-` |

## Referência Rápida

### 1. Princípios e Fundamentos (CRÍTICO)

- `arch-principles` — Encapsulamento, isolamento de estado, independência, boundaries, portabilidade
- `arch-app-layer` — A camada app como orquestradora, composição de features, comunicação via callback props
- `arch-feature-layer` — A camada features como agrupadora de slices independentes por funcionalidade
- `arch-anti-patterns` — Organização por camada técnica, estado global entre features, imports cruzados
- `arch-shared-layer` — A camada shared como base comum, regra do 3, tipos utilitários vs domínio, UI kit

### 2. Estrutura de Feature (CRÍTICO-ALTO)

- `feature-structure` — Estrutura de pastas da feature (SPA e monorepo), os 4 segments, convenções
- `feature-public-api` — Public API exporta componentes React (lazy-loadable) e opcionalmente types via `export type`, regras de exportação

### 3. Segments da Feature (CRÍTICO-ALTO)

- `segment-domain` — Tipos locais por feature, exportação via `export type`, modelagem de domínio por feature
- `segment-hooks` — Camada de hooks: service layer, React Query + Axios, nomeação `useAçãoOuIntenção`
- `segment-context` — Camada de context: custom Provider, hook de acesso com validação, split state/actions
- `segment-components` — Camada de componentes: estado de UI vs lógica de negócio, smart/dumb sem pastas separadas

### 4. Regras e Enforcement (CRÍTICO-ALTO)

- `rules-enforcement` — ESLint config, Nx boundaries, validação no CI

### 5. Migração e Escala (ALTO-MÉDIO)

- `scale-migration` — Estratégia de migração de código legado para Feature-Sliced Design
- `scale-domain-grouping` — Agrupamento por domínio quando múltiplas features compartilham entidades

## Ordem de Leitura Recomendada

1. `arch-principles` — fundamentos da arquitetura
2. `arch-app-layer` — a camada app, composição e comunicação
3. `arch-feature-layer` — a camada features e slices
4. `arch-anti-patterns` — o que evitar
5. `arch-shared-layer` — a camada shared, base comum
6. `feature-structure` — estrutura interna de um slice (segments e convenções)
7. `feature-public-api` — contrato público da feature
8. `segment-domain` — modelagem de domínio local
9. `segment-hooks` — segment de hooks (service layer)
10. `segment-context` — segment de context (Provider e estado)
11. `segment-components` — segment de componentes
12. `rules-enforcement` — enforcement automatizado
13. `scale-migration` — migração de código legado
14. `scale-domain-grouping` — agrupamento por domínio compartilhado
