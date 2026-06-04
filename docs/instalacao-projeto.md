# Instalação em projeto (escopo projeto)

Quando o usuário escolhe "Em um projeto" no wizard (passo 6 — Escopo), a CLI exibe um **navegador de pastas interativo** (sem digitar caminho) para selecionar o projeto. Usa `.agents/` como **fonte de verdade** e cria symlinks nas pastas nativas do agente escolhido, garantindo que os recursos possam ser versionados junto com o código do projeto.

## Estrutura gerada — Skill

```
<project>/
├── .agents/
│   └── skills/
│       └── <itemId>/          ← fonte de verdade (commitada no git)
│           ├── SKILL.md
│           ├── scripts/
│           ├── references/
│           │   └── README.md
│           └── assets/
└── .<agentDir>/               ← ex: .cursor/, .claude/, .kiro/
    └── skills/
        └── <itemId>           ← symlink → ../../.agents/skills/<itemId>
```

Por exemplo, com Cursor:

```
my-project/
├── .agents/skills/cursor-rules/SKILL.md
└── .cursor/skills/cursor-rules  →  ../../.agents/skills/cursor-rules
```

## Estrutura gerada — Hook

```
<project>/
├── .agents/
│   └── hooks/
│       └── hooks.json         ← fonte de verdade (commitada)
└── .<agentDir>/
    └── hooks.json             ← symlink → ../.agents/hooks/hooks.json
```

## Git

Adicione `.agents/` ao controle de versão. As pastas do agente (`.cursor/`, `.claude/`, etc.) podem ser ignoradas ou incluídas — como são symlinks, elas não duplicam conteúdo.

Sugestão de `.gitignore`:

```gitignore
# Pastas nativas dos agentes (symlinks, não precisam ser commitadas)
.cursor/
.claude/
.kiro/
# Mas .agents/ deve ser commitada — remova-a do gitignore se estiver lá
```

## Navegador de pastas

Ao escolher "Em um projeto", o wizard abre um navegador interativo:

```
Pasta atual: /Users/you
  ← Voltar
  ✓  Usar esta pasta
  ↑  Subir para /
    Documents/
    projects/
    my-app/
```

Navegue com as setas, confirme com Enter. Não é necessário digitar nenhum caminho.

## Como a CLI cria o symlink

O `installResources()` em `agents-core` executa:

1. `mkdir -p <project>/.agents/skills/<itemId>/` + scaffold `SKILL.md`
2. `mkdir -p <project>/.<agentDir>/skills/`
3. `symlink('../../.agents/skills/<itemId>', '<project>/.<agentDir>/skills/<itemId>')`

O caminho relativo do symlink é calculado via `path.relative()` para funcionar independentemente de onde o projeto esteja no disco.

## Verificar symlink

```bash
ls -la .cursor/skills/
# cursor-rules -> ../../.agents/skills/cursor-rules

readlink .cursor/skills/cursor-rules
# ../../.agents/skills/cursor-rules
```
