---
title: Camada Components — Apresentação e Estado de UI
impact: HIGH
impactDescription: misturar lógica de negócio em componentes cria acoplamento e dificulta testes e reutilização
tags: architecture, components, ui-state, business-logic, separation, smart-dumb
---

## Camada Components

Componentes de UI internos da feature. A distinção entre smart components (usam hooks de negócio, consomem context) e dumb components (recebem props, renderizam UI) é natural pela composição — não precisa de pastas separadas como `containers/`. Com hooks, a separação de responsabilidades acontece no código, não na estrutura de pastas.

### Regras

- Estado de UI pertence ao componente: toggle, loading local, form input, controle de visibilidade, animação, scroll position. Não extraia para hook o que é estado de renderização
- Lógica de negócio vai para hooks: fetch, mutations, validações, cálculos, regras de domínio. Se o componente está fazendo fetch ou processando dados, extraia para um hook
- Não crie hooks só para wrappear useState: um hook que só faz `const [isOpen, setIsOpen] = useState(false)` é abstração desnecessária. O componente gerencia seu próprio estado de UI
- Componentes consomem context via hook de acesso: usam `useCheckoutContext()` para acessar estado compartilhado da feature
- Componentes consomem hooks de negócio: usam `useSubmitOrder()` para ações que envolvem lógica

### Exemplos

```tsx
// ✅ Estado de UI no componente — pertence aqui
function CheckoutForm() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<'card' | 'pix'>('card')
  const { state } = useCheckoutContext()
  const { submit, isPending } = useSubmitOrder()

  return (
    <form onSubmit={submit}>
      <TabSelector active={activeTab} onChange={setActiveTab} />
      {activeTab === 'card' && <CardFields />}
      {activeTab === 'pix' && <PixFields />}
      <button disabled={isPending}>Finalizar</button>
    </form>
  )
}
```

```tsx
// ❌ Hook desnecessário — só wrappeia estado de UI
function useCheckoutFormState() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<'card' | 'pix'>('card')
  return { isExpanded, setIsExpanded, activeTab, setActiveTab }
}

// ❌ Lógica de negócio no componente — deveria estar em hook
function CheckoutForm() {
  const [data, setData] = useState(null)
  useEffect(() => {
    fetch('/api/checkout').then(res => res.json()).then(setData)
  }, [])
  const total = data?.items.reduce((sum, item) => sum + item.price, 0) ?? 0
  // ...
}
```

### Regra Resumida

Se o estado controla como o componente renderiza (UI), fica no componente. Se o estado representa dados de negócio ou envolve side effects (API, cálculos, regras), vai para um hook.

### Referências Externas

- [Presentational and Container Components](https://medium.com/@dan_abramov/smart-and-dumb-components-7ca2f9a7c7d0) — Dan Abramov (2019 update): hooks substituem a necessidade de containers como componentes separados
- [Decoupling Business Logic from UI with Custom React Hooks](https://www.emoosavi.com/blog/decoupling-business-logic-from-ui-with-custom-react-hooks) — Separação de lógica de negócio da UI via hooks
