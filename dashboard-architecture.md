# Arquitetura Enterprise: Dashboard do TitenQ Bot

Este documento descreve o plano arquitetural de longo prazo para a construção de um Painel de Administração (Backoffice) para o TitenQ Bot, permitindo uma "Visão Panorâmica" das métricas, estatísticas e listagens dos grupos sem a necessidade de comandos dentro do Telegram.

---

## 1. A Camada de Dados (O que já temos)

Como utilizamos o **SQLite** rodando nativamente no mesmo servidor do Bot (em modo WAL), as informações já estão perfeitamente estruturadas. Para extrair as métricas necessárias para o dashboard, as queries SQL seriam diretas e performáticas, sem sobrecarregar o bot:

- **Grupos Ativos:**
  ```sql
  SELECT * FROM groups WHERE is_active = 1 ORDER BY added_at DESC;
  ```
- **Volume de BANs (por grupo):**
  ```sql
  SELECT chat_title, COUNT(*) as ban_count FROM vote_cases WHERE status = 'banned' GROUP BY chat_id;
  ```
- **Lista Global de FAQs:**
  ```sql
  SELECT g.title, f.trigger_keyword FROM group_faqs f JOIN groups g ON f.chat_id = g.chat_id;
  ```

---

## 2. A Camada de API (Backend - Fastify)

Para escalar, o padrão enterprise estipula que o Bot **não** deve renderizar relatórios ou responder comandos com tabelas gigantes. O correto é expor uma API HTTP mínima, que consome o banco `bot.sqlite` de forma separada.

- **Tecnologia:** `Fastify` + `Node.js` (conforme `.cursorrules`).
- **Endpoints de Leitura (Read-Only):**
  - `GET /api/metrics` (Números totais para os KPIs iniciais)
  - `GET /api/groups` (Lista de grupos com paginação)
  - `GET /api/faqs` (Lista de perguntas frequentes configuradas)
- **Autenticação (SSO do Telegram):**
  - Em vez de usuários e senhas nativos, a API implementará o **Telegram Login Widget**.
  - O Fastify valida o Hash de autenticação fornecido pelo Widget. Se o `id` retornado bater com o seu `SUPER_ADMIN_ID` configurado no `.env`, ele libera um JWT (Json Web Token) ou Cookie de Sessão. Caso contrário, devolve código `401 Unauthorized`.

---

## 3. A Camada Visual (Frontend - React / Next.js)

Uma aplicação Web SPA (Single Page Application) responsiva para acessar do celular e computador.

- **Tecnologia:** `React` ou `Next.js` consumindo a API interna do Fastify através de Hooks (`useFetch` ou `useSWR`).
- **Dashboard Principal:**
  - **Cards de KPIs no Topo:** Componentes visuais chamativos informando: "Total de Grupos (42)", "Bans Hoje (15)", "Mensagens Ocultadas (130)".
  - **Gráficos de Linhas/Barras:** Utilizando _Recharts_ ou _Chart.js_ para demonstrar a variação diária de denúncias no TitenQ.
- **Tabelas de Auditoria:** Listagens com filtro, ordenação e barra de busca. Ao clicar na fileira de um grupo específico, ele destrincharia todos os FAQs ativos e infrações julgadas naquele chat.

---

## 🏗️ O Diferencial do Desacoplamento

**Por que esse é o padrão ouro de escalabilidade?**
A separação de responsabilidades cria tolerância à falhas perfeita. Se o Bot crescer e for convidado para 5 mil grupos, todo o seu processador e memória ficarão dedicados à biblioteca do Telegraf para moderar e apagar spam na velocidade da luz.

O painel visual e a API do Fastify não brigam com o Telegraf. Se a API do site de admin cair porque você fez deploy errado, o Bot continua punindo spam normalmente. Se o Telegram cair e o Bot desconectar, o seu site Dashboard de Analytics continua 100% no ar renderizando os últimos dados do SQLite.
