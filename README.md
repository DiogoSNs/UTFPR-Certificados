# UTFPR Certificados

Plataforma de consulta unificada para certificados públicos de extensão e eventos emitidos pelo **SGCE da UTFPR** ([apl.utfpr.edu.br/extensao/certificados/listaPublica](https://apl.utfpr.edu.br/extensao/certificados/listaPublica)).

O portal oficial exige seleção manual de câmpus, ano e evento sem busca direta por participante. Este projeto indexa os registros públicos em uma base otimizada para permitir busca instantânea por pessoa, evento, câmpus e ano — mantendo a validação e emissão oficial diretamente nos links da universidade.

---

## Principais Melhorias e Funcionalidades

- **Cobertura completa da UTFPR:** indexação de todos os câmpus e unidades (13.900+ eventos e 180.000+ participantes desde 2013 até o ano vigente).
- **Busca por Pessoa e por Evento:** autocomplete com debounce, filtros combinados por **câmpus**, **ano** e **texto**, além de ordenação e seleção em lote.
- **Emissão e Validação Direta:** links diretos para o PDF oficial e validação no SGCE, além de download em lote compactado em ZIP.
- **Interface Responsiva (Desktop, Tablet e Mobile):** construída em **React + Vite + Tailwind CSS**, com layout em cards dedicado para telas pequenas.
- **Sincronização Automática:** scraper resiliente em Python (`sync_sgce.py`) com detecção dinâmica de novos anos e câmpus, executável via Docker ou GitHub Actions.
- **Proteção de Recursos e Cota Gratuita:** rate limiting por IP, controle de concorrência para geração de ZIPs, limites diários/mensais configuráveis, cache LRU em memória e proteção contra sobrecarga no servidor da UTFPR.

---

## Arquitetura

```text
utfpr-certificados/
├── backend/sgceScripts/     # Scraper Python + agendador diário (MongoDB)
├── frontend/utfCerts/       # Servidor Express + API REST + segurança/cotas
│   └── client/              # Interface React + Vite + Tailwind CSS + react-icons
├── .github/workflows/       # Sync diário automático via GitHub Actions
├── docker-compose.yml       # Ambiente local isolado (Mongo + Backend + Frontend)
├── render.yaml              # Blueprint de deploy no Render
└── DEPLOY.md                # Guia passo a passo de publicação gratuita
```

---

## Como Rodar Localmente com Docker

Pré-requisito: apenas **Docker Desktop** aberto.

```bash
# 1. Subir MongoDB, scraper agendado e frontend
docker compose up -d --build

# 2. (Opcional) Popular inicialmente com o snapshot estático
docker exec utfcerts_backend python create.py

# 3. Sincronizar eventos recentes (ano atual e anterior) ou base completa
docker exec utfcerts_backend python sync_sgce.py --mode recent
# ou para todos os anos e câmpus:
docker exec utfcerts_backend python sync_sgce.py --mode full
```

Acesse: **http://localhost:8022**

---

## Deploy em Produção (100% Gratuito)

O projeto está preparado para rodar gratuitamente sem cartão de crédito utilizando **MongoDB Atlas (M0)** + **Render (Docker Web Service)** + **GitHub Actions (cron diário)**. Consulte as instruções completas em [DEPLOY.md](./DEPLOY.md).

---

## Créditos e Origem

- **Atualização, escala para todos os câmpus/anos, segurança e novo frontend:** [Diogo (DiogoSNs)](https://github.com/DiogoSNs)
- **Projeto original (TCC em Engenharia de Computação — UTFPR-CP):** [Lucas do Prado Pinto](https://github.com/pradoplucas) — repositórios originais [utfCerts](https://github.com/pradoplucas/utfCerts) e [sgceScripts](https://github.com/pradoplucas/sgceScripts)
