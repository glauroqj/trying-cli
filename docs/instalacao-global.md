# Instalação global (escopo global)

Quando o usuário escolhe "— Global" no wizard, a CLI instala diretamente nas pastas nativas do agente escolhido. Não é criado nenhum diretório `~/.agents/` nem symlink.

## Onde cada agente instala

| Agente | Skill global | Hook global |
|--------|--------------|-------------|
| Cursor | `~/.cursor/skills/<itemId>/` | `~/.cursor/hooks.json` |
| Claude Code | `~/.claude/skills/<itemId>/` | `~/.claude/hooks.json` |
| OpenCode | `~/.config/opencode/skills/<itemId>/` | `~/.config/opencode/hooks.json` |
| Codex | `~/.codex/skills/<itemId>/` | `~/.codex/hooks.json` |
| GitHub Copilot | `~/.copilot/skills/<itemId>/` | `~/.copilot/hooks.json` |
| Windsurf | `~/.codeium/windsurf/skills/<itemId>/` | `~/.codeium/windsurf/hooks.json` |
| Roo Code | `~/.roo/skills/<itemId>/` | `~/.roo/hooks.json` |
| Gemini CLI | `~/.gemini/skills/<itemId>/` | `~/.gemini/hooks.json` |
| Goose | `~/.config/goose/skills/<itemId>/` | `~/.config/goose/hooks.json` |
| Continue | `~/.continue/skills/<itemId>/` | `~/.continue/hooks.json` |
| Kiro (AWS) | `~/.kiro/skills/<itemId>/` | `~/.kiro/hooks.json` |

## Regra: `~/.agents/` nunca é usado no escopo global

O caminho `~/.agents/` não existe como destino de instalação global. Ele só aparece como subdiretório dentro de projetos (`.agents/`, relativo ao projeto), onde funciona como fonte de verdade para symlinks.

## Estrutura gerada — Skill global (ex: Cursor)

```
~/.cursor/
└── skills/
    └── cursor-rules/          ← instalado diretamente aqui
        ├── SKILL.md
        ├── scripts/
        ├── references/
        │   └── README.md
        └── assets/
```

## Estrutura gerada — Hook global (ex: Cursor)

O arquivo `~/.cursor/hooks.json` é criado ou mesclado com o conteúdo do template de hook. Hooks existentes são preservados.

## Como a CLI instala globalmente

`installResources()` com `destination.scope === 'global'` faz:

1. Resolve o `globalSkillRoot` ou `globalHookFile` do `AgentDef` correspondente.
2. Chama `scaffoldSkillDir(globalSkillRoot/<itemId>/)` ou `mergeHooksJson(globalHookFile)`.
3. Não cria `~/.agents/`, não cria symlinks.
