---
title: Princípios Fundamentais da Arquitetura Feature-Sliced Design
impact: CRITICAL
impactDescription: sem esses princípios, features crescem acopladas e inviabilizam migração, remoção e evolução independente
tags: architecture, feature-sliced-design, fsd, principles, encapsulation, isolation, portability, colocation, discoverability, testability, solid, clean-architecture
---

## Princípios Fundamentais

Feature-Sliced Design organiza código por funcionalidade em camadas com dependência unidirecional. Cada feature contém tudo que precisa para funcionar: componentes, estado, lógica, tipos. Features são independentes entre si.

A arquitetura se organiza em 3 layers com dependência unidirecional:

```
app/          → conhece features (via public API) e shared
features/     → conhece apenas shared
shared/       → não conhece ninguém (base da pirâmide)
```

### 1. Encapsulamento Real de Escopo

Cada feature é uma unidade isolada com seu próprio Provider, estado, componentes e domínio. A feature é tratada como um micro-frontend dentro do monolito/monorepo. O único ponto de contato é a public API (`index.ts`).

```
[Feature Checkout]
  ├── componentes internos (não exportados)
  ├── estado próprio (Provider dedicado)
  ├── lógica de domínio (types, regras)
  └── public API (index.ts) ← componentes React + export type
```

### 2. Isolamento de Estado

Cada feature gerencia seu próprio estado via Context/Provider dedicado. Sem estado global compartilhado entre features. Quando você remove uma feature, nenhuma outra quebra.

```tsx
// ✅ Cada feature com seu próprio Provider e estado
<Checkout.Provider>   {/* estado do checkout */}
  <Checkout.Form />
</Checkout.Provider>

<Cart.Provider>       {/* estado do cart */}
  <Cart.Items />
</Cart.Provider>

// ❌ Estado global compartilhado entre features
const globalStore = create({
  checkout: { ... },
  cart: { ... },
})
```

Isolamento de estado habilita testabilidade isolada: cada slice é testável de forma independente, sem precisar montar o contexto da aplicação inteira. Testes são co-localizados com o código que validam.

```tsx
// ✅ Teste monta apenas o Provider da feature
render(
  <Checkout.Provider environment="test" user={mockUser}>
    <Checkout.Form />
  </Checkout.Provider>
)

// ❌ Teste precisa montar a aplicação inteira
render(
  <AppProvider>
    <AuthProvider>
      <QueryProvider>
        <Checkout.Form />
      </QueryProvider>
    </AuthProvider>
  </AppProvider>
)
```

Se um teste de feature precisa importar ou montar outra feature para funcionar, o isolamento está comprometido.

### 3. Independência entre Features

Ausência de importações cruzadas entre features. A comunicação acontece via callback props ou eventos, orquestrada pela `app/`.

```
✅ [Cart] --callback--> [App] --props--> [Checkout]
❌ [Cart] --> [Checkout]  (acoplamento direto)
```

### 4. Boundaries Claros e Descobríveis

Cada feature tem fronteiras bem definidas. O que é exposto passa pela public API (`index.ts`). Em contextos multi-team, isso habilita ownership por feature.

Boundaries claros também garantem discoverability: a estrutura do projeto deve responder "onde fica isso?" sem precisar perguntar. Um dev novo deve localizar qualquer funcionalidade apenas navegando a árvore de diretórios.

Práticas que garantem boundaries descobríveis:

- Convenção de nomes descritivos: `feature-checkout/`, `feature-add-cart/`, `feature-search-products/`
- Estrutura interna consistente entre features: mesmos segments (`components/`, `hooks/`, `context/`, `domain/`)
- Public API como ponto de entrada único: `index.ts` é o primeiro lugar que qualquer dev olha
- Prefixo `feature-` torna explícito o que é um slice vs o que é shared ou app

```
// ✅ Descobrível — nomes claros, estrutura previsível
features/
├── feature-checkout/        → "finalizar compra" — óbvio
├── feature-add-cart/        → "adicionar ao carrinho" — óbvio
├── feature-search-products/ → "buscar produtos" — óbvio

// ❌ Não descobrível — nomes genéricos, estrutura ambígua
src/
├── modules/
│   ├── core/
│   ├── utils/
│   └── services/
```

### 5. Portabilidade

Uma feature bem encapsulada pode ser extraída para outro repositório, transformada em micro-frontend, ou removida sem impacto no resto da aplicação.

**Checklist de portabilidade:**

- [ ] A app importa apenas do `index.ts` da feature
- [ ] Nenhum estado global é compartilhado entre app e feature
- [ ] A feature não importa de outras features
- [ ] A feature não importa de `app/`
- [ ] Comunicação com o mundo externo é via callback props ou eventos
- [ ] Dependências são apenas de `shared/` ou pacotes npm

### 6. Uma Feature, Uma Funcionalidade

Cada feature representa uma única funcionalidade do usuário — uma ação ou interação que agrega valor de negócio. Feature não é um bounded context do DDD nem um domínio inteiro. É um slice vertical de uma funcionalidade específica: "adicionar ao carrinho", "finalizar compra", "buscar produtos".

A segregação clara de escopos minimiza a carga cognitiva e facilita o onboarding. A evolução de uma funcionalidade não gera efeitos colaterais em outras.

### 7. Resiliência Isolada (Error Boundaries)

Para que o isolamento seja real, uma feature não deve derrubar a aplicação inteira. Cada slice é auto-contido também em sua resiliência.

- Ação: envolver a feature em um ErrorBoundary próprio no nível da App
- Princípio: uma falha no Cart não deve impedir o usuário de navegar no ProductCatalog

```tsx
<Cart.ErrorBoundary fallback={<Cart.Fallback />}>
  <Cart.Provider>
    <Cart.Form />
  </Cart.Provider>
</Cart.ErrorBoundary>

<ProductCatalog.ErrorBoundary fallback={<ProductCatalog.Fallback />}>
  <ProductCatalog.Provider>
    <ProductCatalog.Form />
  </ProductCatalog.Provider>
</ProductCatalog.ErrorBoundary>
```

### 8. Colocation (Coesão Física)

Código relacionado vive junto e evolui junto. Componentes, hooks, tipos, contexto e testes de uma feature ficam no mesmo diretório — não espalhados por pastas técnicas globais. Colocation reduz a distância cognitiva entre "o que eu preciso mudar" e "onde está o código".

```
// ✅ Colocation — tudo da feature junto
features/
└── feature-checkout/
    ├── components/
    ├── hooks/
    ├── context/
    ├── domain/
    └── index.ts

// ❌ Organização por tipo — feature espalhada
src/
├── components/checkout-form.tsx
├── hooks/use-checkout.ts
├── context/checkout-context.tsx
├── types/checkout.ts
└── utils/checkout-helpers.ts
```

O teste ácido: para entender ou modificar uma feature, você deveria precisar olhar apenas dentro da pasta dela. Se precisa navegar por 5 diretórios diferentes, a colocation está quebrada.
