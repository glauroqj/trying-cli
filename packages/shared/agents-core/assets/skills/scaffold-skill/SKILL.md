---
name: scaffold-skill
description: >
  Skill de exemplo no padrão Vercel Agent Resources. Use ao iniciar fluxos de IA
  padronizados no projeto. Inclui scripts/, references/ e assets/ para progressive disclosure.
---

# Scaffold Skill

Skill instalada pela **Agents CLI**.

## Quando usar

- Padronizar como o agente deve agir neste repositório
- Documentar fluxos repetíveis de desenvolvimento com IA

## Estrutura

```
scaffold-skill/
├── SKILL.md          # Este arquivo (obrigatório)
├── scripts/          # Helpers executáveis
├── references/       # Docs sob demanda
└── assets/           # Templates e artefatos
```

## Próximos passos

1. Edite o `description` no frontmatter para refletir o domínio do projeto
2. Adicione scripts em `scripts/` se precisar de automação determinística
3. Coloque documentação longa em `references/`
