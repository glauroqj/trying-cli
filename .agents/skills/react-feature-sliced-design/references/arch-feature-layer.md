---
title: A Camada Features — Slices Independentes por Funcionalidade
impact: CRITICAL
impactDescription: sem separação clara da camada features, slices perdem independência e o acoplamento entre funcionalidades se torna inevitável
tags: architecture, feature-layer, feature-sliced-design, fsd, slices, independence, functionality
---

## A Camada Features

A pasta `features/` é a camada onde vivem os slices da aplicação. Cada feature é um slice independente que encapsula uma funcionalidade específica do usuário — uma interação ou ação que agrega valor de negócio. Features não são domínios nem bounded contexts; são unidades de funcionalidade. A camada features não contém lógica de orquestração nem infraestrutura — apenas módulos funcionais isolados que a camada `app/` compõe.

### Princípio Central

```
Cada feature é um slice independente.
Features não se conhecem. A app/ orquestra.
```

A camada `features/` é simétrica à camada `app/`: enquanto `app/` conhece todas as features (via public API), nenhuma feature conhece outra feature nem a `app/`. Essa regra unidirecional é o que garante independência entre slices.

### O Que Define a Camada Features

| Aspecto | Detalhe |
|---------|---------|
| Papel arquitetural | Agrupar slices independentes por funcionalidade do usuário |
| Dependência | Features dependem apenas de `shared/`. Nunca de `app/` ou de outras features |
| Comunicação | Entre features: via callback props, orquestrada pela `app/` |
| Encapsulamento | Cada feature expõe apenas sua public API (`index.ts`). Internos são inacessíveis |
| Portabilidade | Uma feature pode ser movida entre projetos sem alterar seu código interno |

### Relação entre Layers

```
app/          → conhece features (via public API) e shared
features/     → conhece apenas shared
shared/       → não conhece ninguém (base da pirâmide)
```

A hierarquia de dependência é estrita e unidirecional. Violações criam acoplamento invisível entre funcionalidades.

### Cada Feature é um Slice

No Feature-Sliced Design, cada feature encapsula todos os segments necessários para implementar uma funcionalidade completa. Não existe divisão horizontal por camada técnica — a divisão é vertical por funcionalidade.

### O Que é uma Feature no Frontend

No backend, um caso de uso é uma operação isolada: "listar mensagens" e "copiar mensagem" são dois endpoints, dois handlers, dois slices. No frontend, a granularidade é diferente. A UI que lista mensagens carrega junto o botão de copiar, o menu de ações, o indicador de lida. Essas ações fazem parte da mesma tela, do mesmo contexto visual, do mesmo chunk de código.

O critério no frontend é: tudo que muda junto permanece junto. Se a UI de listagem de mensagens inclui copiar, responder, marcar como lida — tudo isso é a mesma feature, porque:

- Compartilham o mesmo estado (a lista de mensagens)
- Vivem no mesmo contexto visual
- Mudam juntos quando o design evolui
- São carregados no mesmo chunk (lazy loading)

```
// ✅ Frontend — ações relacionadas na mesma feature
features/
├── feature-list-messages/     # Listar, copiar, marcar como lida
├── feature-send-message/      # Input de envio de mensagem (contexto visual próprio)
└── feature-search-messages/   # Buscar mensagens (funcionalidade independente)

// ❌ Granularidade de backend aplicada no frontend
features/
├── feature-list-messages/
├── feature-copy-message/      # Ação dentro da listagem — não é feature separada
├── feature-mark-as-read/      # Ação dentro da listagem — não é feature separada
```

Uma feature no frontend é a UI completa de um caso de uso, incluindo as ações menores que fazem parte daquela experiência. Separe em features diferentes apenas quando a funcionalidade tem contexto visual próprio, estado próprio, e pode ser carregada independentemente.

```
features/
├── feature-checkout/           # Slice: finalizar compra
├── feature-add-cart/           # Slice: adicionar ao carrinho
├── feature-search-products/    # Slice: buscar produtos
└── feature-list-notifications/ # Slice: listar notificações
```

Cada slice contém seus próprios segments internos (`components/`, `hooks/`, `context/`, `domain/`).

### Visão Geral — SPA

```
src/
├── app/                     # Layer: orquestração e composição
│   ├── routes/
│   ├── pages/
│   └── app.tsx
├── features/                # Layer: slices independentes
│   ├── feature-checkout/
│   ├── feature-add-cart/
│   ├── feature-search-products/
│   └── feature-list-notifications/
└── shared/                  # Layer: libs compartilhadas
    ├── ui/
    ├── auth/
    └── query/
```

### Visão Geral — Monorepo

```
apps/
├── app-platform/
│   └── src/
│       ├── routes/
│       ├── pages/
│       └── app.tsx
packages/frontend/
├── feature-checkout/              # Slice como pacote
├── feature-add-cart/
├── feature-search-products/
├── shared/
│   ├── ui/
│   └── auth/
```

A diferença entre SPA e monorepo é a localização física, não o modelo mental. Em ambos os casos, cada feature é um slice isolado com a mesma estrutura interna.

### Regras da Camada

1. Features não importam de outras features — comunicação é via `app/`
2. Features não importam de `app/` — dependência é unidirecional
3. Features importam apenas de `shared/` — a base comum
4. Cada feature expõe uma public API via `index.ts` — internos são privados
5. Features recebem dados externos via props do Provider — nunca acessam estado global
