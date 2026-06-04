# Guia de uso da Agents CLI

A Agents CLI é um wizard interativo para instalar **skills** e **hooks** de agentes de IA. O fluxo é inspirado no `npx skills` da Vercel, com suporte a múltiplos agentes e navegação para trás em qualquer etapa.

## Ações disponíveis

| Ação | O que faz |
|------|-----------|
| `add` | Instala um skill ou hook de um pacote curado |
| `find` | Aponta para o catálogo da comunidade em skills.sh |
| `list` | Aponta para os caminhos de instalação local |
| `init` | Cria um scaffold de skill ou hook no projeto atual |

## Fluxo do wizard (add) — 6 passos

```
╔══════════════════════════════════════════════════════╗
║            Agents CLI — wizard add                   ║
╚══════════════════════════════════════════════════════╝

Passo 1 de 6 — Ação
O que você quer fazer?
  ▸ Instalar (add)
    Buscar (find)
    Listar (list)
    Criar (init)

Passo 2 de 6 — Tipo de recurso
O que deseja instalar?
  ← Voltar
  ▸ Skill — SKILL.md (padrão Vercel Agent Resources)
    Hook  — hooks.json

Passo 3 de 6 — Origem
De qual pacote você quer instalar?
  ← Voltar
  ▸ Vercel Labs — agent-skills  [registry]
    Built-in scaffold            [bundled]

Passo 4 de 6 — Itens
Quais itens do pacote deseja instalar?
  ← Voltar
  ▸ cursor-rules    — Regras de comportamento do Cursor
    code-review     — Revisão de código automática
    ...

Passo 5 de 6 — Agente
Em qual agente instalar?
  ← Voltar
  ▸ ✓  Cursor          detectado · ~/.cursor/skills/
       Claude Code     não detectado · ~/.claude/skills/
       OpenCode        não detectado · ~/.config/opencode/skills/
       Codex           não detectado · ~/.codex/skills/
       GitHub Copilot  não detectado · ~/.copilot/skills/
    ...  (todos os 11 agentes aparecem)

Passo 6 de 6 — Escopo
Onde instalar?
  ← Voltar
  ▸ Global          ~/.cursor/skills/
    Em um projeto   .agents/skills/ + symlink

  [se "Em um projeto"]

Passo 6 de 6 — Pasta do projeto
Navegar até a pasta do projeto
  ← Voltar
  ✓  Usar esta pasta         /Users/you/my-project
  ↑  Subir para /Users/you
    my-project/
    other-project/
    ...

✔ Skill "cursor-rules" instalada em:
    /Users/you/my-project/.agents/skills/cursor-rules/
    /Users/you/my-project/.cursor/skills/cursor-rules  → symlink
```

### Breadcrumb persistente (Ink / Pastel)

Em cada passo, um resumo das respostas já dadas aparece no topo:

```
╭──────────────────────────────╮
│ ✓ Tipo de recurso  Skill     │
│ ✓ Origem           Vercel    │
│ ✓ Itens            cursor-r… │
│ ▸ Agente           …         │
╰──────────────────────────────╯
```

### Navegação para trás

Todos os passos têm a opção **"← Voltar"** como primeiro item.

No **Ink** e **Pastel**: Esc ou seta esquerda também voltam.

No **Clack**: o breadcrumb é nativo (respostas anteriores ficam visíveis no log do terminal).

### Logo animado

- **Ink / Pastel**: o logo inicial anima ciclando entre gradientes de cores (~350ms/frame).
- **Clack**: intro com revelação letra a letra + spinner de carregamento (~600ms).

## Implementações disponíveis

```bash
pnpm run cli           # Commander + Clack (padrão)
pnpm run cli:clack     # Commander + Clack
pnpm run cli:pastel    # Pastel (Ink com gradiente)
pnpm run cli:ink       # Ink puro
```
