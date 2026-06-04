---
title: Agrupamento por Domínio — Quando Features Compartilham Entidades
impact: HIGH
impactDescription: FSD sem domínio compartilhado escala mal quando múltiplas features operam sobre as mesmas entidades
tags: architecture, domain-grouping, feature-sliced-design, fsd, scaling, bounded-context, entities
---

## Agrupamento por Domínio

Feature-Sliced Design funciona bem quando features são independentes — checkout não precisa saber de cart. Mas quando múltiplas features pertencem ao mesmo domínio de negócio e operam sobre as mesmas entidades, manter tipos duplicados em cada feature cria problemas reais.

### O Problema: Duplicação de Entidades

Imagine um domínio de messaging com três features independentes:

```
src/features/
├── feature-list-messages/
│   └── domain/
│       └── types.ts          # Message { id, content, author, readAt }
├── feature-send-message/
│   └── domain/
│       └── types.ts          # Message { id, content, recipientId }
└── feature-search-messages/
    └── domain/
        └── types.ts          # Message { id, content, author, createdAt }
```

Três versões de `Message`. Qual é a verdade? Mudar um campo exige tocar três features. Regras de validação se duplicam. Novos devs não entendem o modelo — entendem features isoladas, mas não o domínio.

### Sinais de Que Você Precisa de Domínio Compartilhado

- Mesma entidade definida em 3+ features com campos diferentes
- Mudar uma regra de negócio exige alterar múltiplas features
- Features do mesmo contexto importam umas das outras (acoplamento horizontal)
- Novos devs entendem features isoladas mas não o domínio como um todo

### A Solução: Domínio Agrupador

Domínios complexos com múltiplas features que compartilham entidades vivem em `modules/`, separados de `features/`. Isso deixa claro na estrutura o que é uma feature independente e o que é um domínio com múltiplos slices internos.

```
src/
├── features/     # Features independentes — sem entidades compartilhadas
├── modules/      # Domínios complexos — múltiplas features com entidades compartilhadas
└── shared/
```

As features dentro de um módulo continuam sendo slices independentes — a diferença é que compartilham o modelo de domínio do módulo.

#### SPA

```
src/modules/messaging/
├── domain/                          # Domínio compartilhado entre features
│   ├── types.ts                     # Message como fonte única de verdade
│   └── constants.ts
├── features/
│   ├── feature-list-messages/       # Slice — listar, copiar, marcar como lida
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── context/
│   │   └── index.ts
│   ├── feature-send-message/        # Slice — input de envio
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── context/
│   │   └── index.ts
│   └── feature-search-messages/     # Slice — busca de mensagens
│       ├── components/
│       ├── hooks/
│       └── index.ts
├── index.ts                         # Public API do módulo
└── README.md
```

#### Monorepo

```
packages/frontend/modules/messaging/
├── src/
│   ├── domain/
│   ├── features/
│   │   ├── feature-list-messages/
│   │   ├── feature-send-message/
│   │   └── feature-search-messages/
│   └── index.ts
├── package.json
├── project.json
└── README.md
```

### O Que Muda e O Que Não Muda

| Aspecto | Feature independente | Feature em domínio agrupador |
|---------|---------------------|------------------------------|
| Segments internos | components, hooks, context, domain | components, hooks, context (sem domain próprio) |
| Tipos de domínio | Definidos no `domain/` da feature | Importados do `domain/` do agrupador |
| Public API | `index.ts` da feature | `index.ts` do agrupador exporta as features |
| Isolamento entre features | Features não se conhecem | Features não se conhecem — compartilham apenas domain |
| Comunicação | Via app (callback props) | Via app (callback props) — mesma regra |

### Regras do Domínio Agrupador

1. O `domain/` do agrupador contém apenas tipos, constantes e regras de validação — nunca componentes, hooks ou context
2. Features dentro do agrupador importam do `domain/` do agrupador, não definem tipos de domínio próprios
3. Features dentro do agrupador continuam não se conhecendo — comunicação é via app
4. O agrupador expõe uma public API única que exporta componentes React das features internas e, opcionalmente, types via `export type`
5. Features que não compartilham entidades com outras continuam independentes — não force agrupamento

### Isolamento e Enforcement

A mudança para módulos é organizacional. As regras de isolamento são as mesmas — só ganham um nível a mais:

```
app/          → conhece modules e features (via public API) e shared
modules/      → conhece apenas shared
features/     → conhece apenas shared
shared/       → não conhece ninguém
```

| Regra | Detalhe |
|-------|---------|
| Módulo não conhece outro módulo | `modules/messaging` nunca importa de `modules/checkout` |
| Feature não conhece outra feature | Dentro ou fora do módulo — mesma regra de sempre |
| Módulo não conhece features externas | `modules/messaging` não importa de `features/feature-checkout` |
| Comunicação entre módulos | Via app (callback props) — mesma regra das features |
| Módulo não conhece app | Dependência é unidirecional |

No monorepo, o enforcement via Nx boundaries segue o mesmo padrão — módulos recebem a tag `type:module` e só podem depender de `type:shared`:

```json
{ "sourceTag": "type:module", "onlyDependOnLibsWithTags": ["type:shared"] }
```

### Quando Usar

| Cenário | Abordagem |
|---------|-----------|
| Feature independente, sem entidades compartilhadas | Feature flat com domain próprio |
| 2 features compartilham 1 tipo simples | Duplicação aceitável — mantenha flat |
| 3+ features operam sobre as mesmas entidades | Domínio agrupador |
| Features de domínios diferentes (checkout vs notifications) | Nunca agrupar — são contextos distintos |

### Quando NÃO Usar

Não agrupe features só porque parecem relacionadas. Agrupe quando compartilham entidades de domínio. Checkout e cart parecem relacionados, mas operam sobre entidades diferentes (pedido vs carrinho). Cada um tem seu próprio modelo — não precisam de agrupador.

```
# ❌ Agrupamento forçado — entidades diferentes
src/modules/store/
├── domain/
│   └── types.ts           # Store? Não existe essa entidade
├── features/
│   ├── feature-checkout/  # Opera sobre Order
│   └── feature-add-cart/  # Opera sobre Cart

# ✅ Features independentes — cada uma com seu domínio
src/features/
├── feature-checkout/      # domain/types.ts → CheckoutOrder
└── feature-add-cart/      # domain/types.ts → CartItem
```
