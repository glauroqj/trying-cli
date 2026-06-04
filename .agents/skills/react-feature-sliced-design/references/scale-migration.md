---
title: Estratégia de Migração — De Código Legado para Feature-Sliced Design
impact: MEDIUM
impactDescription: migração sem estratégia cria período prolongado de inconsistência e aumenta risco de regressões
tags: architecture, migration, strangler-fig, legacy, refactoring, feature-sliced-design, fsd
---

## Estratégia de Migração

Migrar um projeto existente (organizado por camada técnica) para Feature-Sliced Design não é um big bang. É um processo incremental, feature por feature, usando o padrão Strangler Fig.

### Strangler Fig Pattern

O Strangler Fig é uma planta que cresce ao redor de uma árvore existente até substituí-la completamente. Na migração de software, você cria a nova estrutura ao lado da antiga e migra funcionalidades gradualmente.

```
# Fase 1: Coexistência
src/
├── components/          # Legado (camada técnica)
│   ├── order-form.tsx
│   └── payment-form.tsx
├── hooks/               # Legado
│   ├── use-orders.ts
│   └── use-payments.ts
├── features/            # Novo (feature-sliced design)
│   └── checkout/        # Primeira feature migrada
│       ├── components/
│       ├── context/
│       ├── hooks/
│       ├── domain/
│       └── index.ts
├── shared/              # Compartilhado (novo)
│   └── ui/
└── app/
    └── routes/
```

```
# Fase N: Migração completa
src/
├── features/
│   ├── checkout/
│   ├── cart/
│   ├── orders/
│   └── payments/
├── shared/
└── app/
```

### Ordem de Migração

1. Comece pelas features com mais acoplamento — são as que mais se beneficiam do encapsulamento
2. Features que estão sendo ativamente desenvolvidas — aproveite o momentum de mudança
3. Features isoladas e simples — ganho rápido, valida o padrão com baixo risco

### Passo a Passo para Migrar uma Feature

#### 1. Identifique os limites da feature

Mapeie todos os arquivos que pertencem à funcionalidade no código legado e identifique em qual segment cada um se encaixa.

```
# Exemplo: feature "orders" — mapeamento legado → segment
components/order-form.tsx       → components/
components/order-list.tsx       → components/
hooks/use-orders.ts             → hooks/
services/order-service.ts       → hooks/ (hooks absorvem services)
types/order.ts                  → domain/
```

#### 2. Crie a estrutura da feature

```
features/orders/
├── components/
│   ├── order-form/
│   │   ├── order-form.tsx      # Movido de components/
│   │   └── index.tsx
│   └── order-list/
│       ├── order-list.tsx      # Movido de components/
│       └── index.tsx
├── hooks/
│   └── use-list-orders/
│       ├── use-list-orders.ts  # Movido de hooks/ (absorve services/)
│       └── index.ts
├── domain/
│   └── types.ts               # Movido de types/
├── context/
│   └── orders-context.tsx
└── index.ts                   # Public API — componentes React + export type
```

#### 3. Defina a public API

A public API exporta componentes React e, opcionalmente, types via `export type`. Hooks, constantes e services são internos.

```ts
// features/orders/index.ts
export { Orders } from './orders-module'
```

#### 4. Atualize os imports no código existente

```tsx
// Antes (legado — imports espalhados)
import { OrderForm } from '@/components/order-form'
import { OrderList } from '@/components/order-list'

// Depois (FSD — composição via app)
import { Orders } from '@/features/orders'

// Na page
<Orders.Provider environment={environment} user={user}>
  <Orders.Form />
  <Orders.List />
</Orders.Provider>
```

#### 5. Delete os arquivos antigos

Após atualizar todos os imports, remova os arquivos das pastas legadas.

#### 6. Configure enforcement

Adicione regras ESLint para a nova feature.

### Convivência com Código Legado

Durante a migração, código legado e novo coexistem. Regras para o período de transição:

- Features novas seguem Feature-Sliced Design desde o início
- Features migradas seguem Feature-Sliced Design
- Código legado não migrado continua nas pastas antigas
- Shared libs podem ser usadas por código legado e novo
- Não crie dependências do código novo para o legado (exceto shared)

### Sinais de que a Migração Está Funcionando

- Novas features são criadas mais rápido (criar pasta, não tocar em nada existente)
- Bugs em uma feature não afetam outras
- Onboarding de novos devs é mais rápido (entender uma feature sem navegar o projeto inteiro)
- Code reviews são mais focados (PR toca apenas uma feature)


