![](https://img.shields.io/github/stars/titenq/titenq-group-bot.svg) ![](https://img.shields.io/github/forks/titenq/titenq-group-bot.svg) ![](https://img.shields.io/github/issues/titenq/titenq-group-bot.svg)

# 🛡️ TitenQ Group Bot

**Scalable and autonomous moderation bot for Telegram communities.**

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)
![Telegraf](https://img.shields.io/badge/Telegraf-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white)

---

## 📖 Overview

**TitenQ Group Bot** is a multi-purpose autonomous bot for Telegram communities. It combines community-driven moderation, a dynamic FAQ system, a media gallery, a GitHub Gist integration, and full internationalization — all designed to reduce manual overhead and improve the group experience.

Built with **TypeScript** and modern code standards, the project focuses on performance, robustness, and persistent state backed by **SQLite**.

---

## ✨ Features

- **Community-Driven Moderation**: Group members vote on suspicious messages. When the threshold is reached, the message is deleted, the user is instantly muted, and a case is opened for admin review.

- **Vote Deduplication Engine**: Prevents fraud by strictly ensuring only 1 valid vote per user per incident.

- **Admin Override & Snapshotting**: Admins have the power to ignore false alarms or quickly ban offenders. The bot captures and preserves "snapshots" of the original text/media for auditing.

- **Dynamic FAQ System**: Admins register keyword → link pairs. Members trigger them directly or by replying to a question — no repeated answers, no chat pollution.

- **Entry Captcha Protection**: New members can be challenged with an interactive captcha before gaining permission to send messages in the group, reducing automated bot joins and spam waves.

- **Custom Welcome Messages**: Admins can configure a per-group welcome message with placeholders like `{name}`, `{username}`, and `{group}`, preview it inside the chat, and keep it synchronized with the group language when using the default template.

- **Group Rules Button**: Admins can save a Telegram message link with the group rules and let members open it through a reusable inline button in commands and welcome flows.

- **Media Gallery**: Photos and videos sent with `/media` are automatically forwarded to a dedicated public Telegram Channel. The original is deleted and a link is posted back in the group.

- **GitHub Gist Integration**: Members can share code with `/gist <language> <code>`. The bot creates a public Gist on GitHub, deletes the original message, and posts the generated link back to the group.

- **Quick Reference Menu**: Any member can type `/menu` to see all available commands and features. The message auto-deletes after 1 minute.

- **Per-Group Feature Toggles**: Group admins can use `/features` to enable or disable specific bot features such as Captcha, FAQ, Gist, Media, Moderation, Rules, Trust, and Welcome for that specific group.

- **Full Internationalization (i18n)**: All bot messages support 🇧🇷 Portuguese, 🇺🇸 English, and 🇪🇸 Spanish. Admins switch language per group with `/i18n`.

- **Temporary Private Rooms**: Create ephemeral 1-to-1 or group private chat rooms directly from the group via `/chat`. Perfect for discussing sensitive matters without leaving a trace in the main group. Rooms automatically expire.

- **Resilient Persistence**: Voting sessions and infraction snapshots are persisted in SQLite — zero data loss on restart.

- **Group Migration Protection**: Automatically detects when a group chat is upgraded to a supergroup. Migrates all settings, FAQs, and active voting cases to the new Chat ID seamlessly.

- **Trust Weight System**: Admins can assign specific "vote weights" to trusted members. A trusted member's vote counts as multiple votes, allowing for faster moderation.

- **Architecture by Design**: Clear separation between Persistence (`db.ts`), Handlers, and Atomic Logic (`helpers/`), with strict typing and integrated Oxc/Prettier linting.

---

## 🌍 Internationalization (i18n)

The bot natively supports multiple languages to better serve diverse communities:

- 🇺🇸 **English** (Default)
- 🇧🇷 **Português**
- 🇪🇸 **Español**

**How it works:**

- Group Administrators can invoke the `/i18n` command at any time.

- The command message is instantly auto-deleted to keep the chat clean.

- An interactive inline menu appears, allowing the admin to select the community's preferred language.

- Upon selection, a native Telegram "Toast" notification confirms the change, and the menu itself disappears without a trace.

- The chosen language is persisted in SQLite and cached in RAM for zero-latency localized replies.

---

## 🛠️ Architecture and Engineering

The core of the bot is based on event-driven interception using the **Telegraf** library.

1. **Capture Pipeline**: We filter out events that do not originate from supergroups/groups.

2. **Case Creation**: A new offense triggers a `VoteCase` in memory (`Map`) for fast $O(1)$ access, baselined with SQLite via asynchronous upsert.

3. **Escalation**: Inline buttons dispatch encoded payloads, intercepted and authorized by a strict verification layer (RBAC) designed for Telegram admins.

---

## 🚀 Infrastructure Requirements

- **Node.js**: v20 or higher.
- **Package Manager**: npm.
- **Telegram Bot Token**: Officially issued via [@BotFather](https://t.me/botfather).

### 🛡️ Bot Group Permissions

For the bot to function correctly in your group, ensure the following steps are taken:

1. Add the bot to your Telegram group.
2. Promote the bot to **Administrator**.
3. **Hard Permissions Required**: The bot must have **Delete messages** and **Ban users** permissions to enforce moderation actions.
4. **Optional Permission for VIP Tag**: To apply or remove the visual `VIP` label next to member names, the bot must also be an administrator with permission to **manage member tags**. Without this permission, `/trust` and `/untrust` still work for weighted voting, but the Telegram label will not be changed.

---

## ⚙️ Installation and Setup

**1. Clone the repository:**

```bash
git clone https://github.com/titenq/titenq-group-bot.git
cd titenq-group-bot
```

**2. Install dependencies:**

```bash
npm install
```

**3. Environment Variables Setup:**
Create the isolated environment file by copying from the base example:

```bash
cp .env.example .env
```

Edit the `.env` file to provide your confidential keys:

```env
BOT_TOKEN="<your_bot_token_here>"
BOT_USERNAME="YourBotUsername"
BOT_OWNER_ID=<your_telegram_user_id>
REQUIRED_VOTES=10
BAN_KEYWORD="ban"
LANGUAGE="pt"
FAQ_TRIGGER_LENGTH=20
FAQ_ERROR_TTL_MS=60000
DB_PATH="./data/bot.sqlite"
MEDIA_CHANNEL_TARGET=@YourChannelUsername
GITHUB_GIST_TOKEN=<your_github_pat_here>
CHAT_EXPIRATION_TIME=60 # Room expiration in minutes
MAX_USERS_PER_ROOM=10 # Max participants allowed in a room
MAX_MESSAGES_PER_10_SECONDS=5 # Anti-spam rate limit for rooms
```

---

## 🏃‍♀️ Lifecycle and Initialization

### Development Mode

Brings the advantage of hot-reloading (via `tsx`) and dynamic AST scanning to index helpers:

```bash
npm run dev
```

### Production Mode

Build the project and run the compiled bot:

```bash
npm run build
npm start
```

### Code Quality (Lint & Format)

To validate your CI/CD branch:

```bash
npm run lint
```

---

## 🗂️ /menu — Quick Reference

Any member can type `/menu` in the group to get an instant summary of all available features and commands. The message is **auto-deleted after 1 minute** to keep the chat clean.

**Preview of what the menu looks like in Telegram:**

```
🤖 Comandos e Funcionalidades do Bot

🚫 Moderação Comunitária
Responda qualquer mensagem com ban para iniciar uma votação de remoção.
Ao atingir 10 votos (valor padrão), a mensagem é removida, o usuário suspeito é
silenciado e os admins são notificados.

📚 FAQs Dinâmicos
/faq palavra link — Cadastra uma resposta rápida (apenas admins).
/faqs — Lista todos os FAQs do grupo.
/faq rm palavra — Remove um FAQ (apenas admins).
Responda a uma mensagem com /faq palavra-chave para acionar o FAQ correspondente.

🖼 Galeria de Mídia
Envie uma foto ou vídeo com a legenda /media. A mídia será salva na
Galeria oficial e o Bot retornará o link da postagem no grupo.

💻 GitHub Gist
/gist linguagem código — Cria um Gist público no GitHub e envia o link no grupo.

🌐 Idioma
/i18n — Altera o idioma do bot para este grupo (apenas admins).

⚙️ Features
/features — Liga ou desliga as funcionalidades do bot neste grupo (apenas admins).

🧩 Captcha de Entrada
Novos membros precisam concluir um captcha para liberar o envio de mensagens no grupo (quando habilitado por um admin em /features).

👋 Boas-vindas
/welcome — Define a mensagem de boas-vindas personalizada do grupo e permite visualizar um preview (apenas admins, quando habilitado em /features).

📜 Regras do Grupo
/rules link_da_mensagem — Define o link da mensagem das regras do grupo (apenas admins).
/rules — Exibe o botão com as regras.

💬 Chat Temporário
/chat — Cria uma nova sala de chat privada e temporária.
/chat close — Encerra a sala atual (apenas quem criou a sala).
/chat exit — Sai da sala atual.

🛡 Membros Confiáveis (Trust)
/trust [ID] [peso] — Define um membro como confiável e o peso do seu voto no comando ban (apenas admins). O peso deve ser de 1 a 10.
/trustlist — Lista todos os membros confiáveis e seus respectivos pesos dos votos (apenas admins).
/untrust [ID] — Remove o status de membro confiável e reseta o peso para 1 (apenas admins).
Observação: a etiqueta VIP só será aplicada/removida no Telegram se o bot for admin e tiver a permissão de gerenciar etiquetas de membros.


Esta mensagem será apagada automaticamente em 1 minuto para não poluir o Grupo.
```

> The menu text is fully internationalized — it respects the language configured via `/i18n` for each group.

---

## ⚖️ Community Moderation (BAN System)

The core feature of the bot is the community-driven moderation flow to handle spam and offensive behavior:

1. **Infraction**: A malicious user sends spam or offensive content to the group.

2. **Flagging**: Any member replies to the malicious message with the predefined trigger keyword (e.g., `ban`, configurable via `BAN_KEYWORD` in `.env`). Keyword is case-insensitive.

3. **Audit Tracking**: The bot acknowledges the report, removes the reporter's message to keep the chat clean, and starts counting via a public scoreboard: `ban (X of 10)`. Wait time deduplication is enforced to avoid vote spam.

4. **Isolation**: Upon reaching the threshold (e.g. 10 unique votes, configurable via `REQUIRED_VOTES` in `.env`), the original suspicious message is immediately deleted from public view, and the author is **instantly muted** while awaiting the admin verdict.

5. **Final Deliberation**: An admin verdict panel is launched, accessible only by administrators. They can:
   - `View content` (Overlay snapshotting).
   - `View voters` (Auditing).
   - `Ban user` (Definitive Action: **The bot will ONLY ban a user if an Admin explicitly clicks this button**).
   - `Ignore / Restore` (Retraction in case of a false positive, returning the message to the chat and **instantly unmuting** the user).

---

## ⚖️ Trust & Weighted Voting

Admins can delegate moderation power to trusted members by increasing their vote weight.

- **Set Trust**: `/trust [ID] [weight]`. The `weight` must be between 1 and the `REQUIRED_VOTES` limit. If no weight is provided, it defaults to the full requirement (instant action).
- **Reset Trust**: `/untrust [ID]` removes the VIP status and resets the weight back to 1.
- **List Trusted Members**: `/trustlist` shows all members who have a special vote weight in the group.
- **VIP Label in Telegram**: When available, the bot also applies/removes the visual `VIP` member tag in Telegram. This is optional and depends on the bot having the administrator permission to manage member tags.

All trust-related error messages (invalid weight, user not found) and command calls are automatically deleted after 1 minute to keep the group history clean.

---

## ⚙️ /features — Feature Toggles

Group administrators can use `/features` to open an inline control panel and enable or disable specific bot features for that group only.

Alias available: `/feats`

- **Default State**: Most features start as enabled (`ON`). `captcha` and `welcome` start disabled (`OFF`).
- **Tracked Changes**: Each toggle stores the last admin who changed it and the last update timestamp in SQLite.
- **Current Toggles**: `captcha`, `/faq`, `/gist`, `/media`, `ban`, `/rules`, `/trust`, and `welcome`.
- **Inline Controls**: The panel updates in place and includes a button to delete the panel message.

---

## 🧩 Entry Captcha

The bot can protect the group entrance flow with an interactive captcha before a new member is allowed to speak.

- **Activation**: The feature starts disabled by default and must be enabled by an admin in `/features`.
- **How it works**: When a human user joins the group, the bot temporarily restricts their permissions and sends a captcha challenge in the group.
- **Validation Flow**: The new member must click the correct emoji sequence within the allowed time and attempt limit.
- **Failure Handling**: If the user runs out of time or exhausts all attempts, the bot removes them from the group.
- **Bot Join Handling**: Bots do not solve the captcha. If a non-admin adds a bot, the bot can be removed automatically.
- **Admin Test Mode**: Admins can use `/captcha` to simulate the challenge flow without being removed from the group.

This is one of the recommended features to enable in communities that receive frequent spam or automated bot joins.

---

## 👋 Welcome Messages

The bot can send a configurable welcome message to new members after they join the group.

- **Activation**: The feature starts disabled by default and must be enabled by an admin in `/features`.
- **Configuration Command**: Use `/welcome` to start the setup flow, or send `/welcome <message>` directly.
- **Supported Placeholders**: `{name}`, `{username}`, and `{group}`.
- **Preview Flow**: Admins can preview the message in the group before saving, edit it, or cancel the setup.
- **Default Template**: If an admin enables `welcome` in `/features` before configuring a custom message, the bot stores the default localized welcome template automatically.
- **Language Sync**: If the saved welcome message is still the default template, changing the group language with `/i18n` updates the welcome template to the new locale automatically.
- **Captcha Integration**: If both `captcha` and `welcome` are enabled, the welcome message is sent only after the user completes the captcha successfully.

This section is a good place to add future screenshots of:

- the `/welcome` setup panel
- the preview message in the group
- the final welcome message shown to a new member

---

## 📜 Group Rules

The bot can store a Telegram message link containing the group rules and expose it through an inline button for members.

- **Configuration Command**: Use `/rules <message_link>` to save or replace the rules message link for the current group.

- **Display Command**: Use `/rules` without arguments to show the inline rules button in the chat.

- **Removal Command**: Use `/rules rm` to remove the saved rules link.

- **Feature Toggle**: The `/rules` button flow can be enabled or disabled by admins in `/features`.

- **Welcome Integration**: If both `rules` and `welcome` are enabled and a rules link exists, the welcome preview and final welcome message include the rules button.

- **Captcha Integration**: If `captcha`, `welcome`, and `rules` are enabled together, the post-captcha welcome message also includes the rules button.

---

## 📚 Dynamic FAQ System

To avoid repetitive questions in the community, the bot features a robust SQL-backed FAQ system:

- **Create FAQ (Admins)**: Use `/faq <keyword> <link>`. Example: `/faq rules https://t.me/group_name/123`. The bot automatically validates the link in the background. If invalid, the error message auto-erases after 1 minute (configurable via `FAQ_ERROR_TTL_MS` in `.env`).

- **List FAQs (Anyone)**: Send `/faqs`. The bot will display an inline keyboard with all registered topics for the current group.

- **FAQ Display (Anyone)**: Reply to someone's message with `/faq <keyword>`. The bot will delete your command message and reply to the target user with the saved link.

- **Remove FAQ (Admins)**: Use `/faq rm <keyword>`.

- **Intelligent Parser**: Commands are accent and case insensitive (`/fáq`, `/FáQs`). Long texts (>20 chars, configurable via `FAQ_TRIGGER_LENGTH` in `.env`) are discarded instantly to save database hits.

---

## 🖼️ Media Gallery

The bot can forward photos and videos sent in a group to a dedicated public Telegram Channel, acting as an official media gallery.

**Setup**: Create a public Telegram Channel, add the bot as an **Administrator** with "Post Messages" permission, then set the channel username in `.env`:

```env
MEDIA_CHANNEL_TARGET=@YourChannelUsername
```

**How to use**: Send a photo or video with the caption starting with `/media` in the group. The bot will:

1. Copy the media to the configured channel, crediting the original author and group name.
2. Delete the original message from the group.
3. Reply with a direct link to the channel post.

If the forwarding fails (e.g. file too large for the API), an error message is sent and auto-deleted after 1 minute (configurable via `FAQ_ERROR_TTL_MS` in `.env`).

> If `MEDIA_CHANNEL_TARGET` is not set, the `/media` trigger is silently ignored and the bot behaves normally.

---

## 💻 GitHub Gist

The bot can create a public GitHub Gist from a code snippet sent in the group, delete the original message, and reply with a link to the generated Gist — crediting the original author.

**Setup**: You need a GitHub Personal Access Token (PAT) with Gist permissions:

1. Click your profile picture (top-right corner on GitHub) → **Settings**

2. Scroll down and click **Developer Settings** (bottom of the left sidebar)

3. Navigate to **Personal access tokens → Fine-grained tokens**

4. Click **Generate new token**

5. Authenticate with your 2FA code or account password if prompted

6. Fill in the **Token name** (e.g. `gist_token`)

7. Under **Expiration**, select **No expiration**

8. Under **Repository access**, select **Public repositories** _(don't worry — the Gist permission is set separately below)_

9. Under **Permissions**, click **Add a permission**, select **Gists**, and set **Access** to **Read and write**

10. Click **Generate token**, then confirm by clicking **Generate token** again

11. Copy the generated token and paste it in your `.env`:

```env
GITHUB_GIST_TOKEN=your_generated_token_here
```

**How to use**: Send a message in the following format in the group:

```
/gist <language> <your code here>
```

Example:

```
/gist python
def add(a, b):
    return a + b
```

The bot will:

1. Create a public Gist on GitHub with the code, crediting the author and group.

2. Delete the original message from the group.

3. Reply with a direct link to the Gist.

Supported languages include: `bash`, `c`, `cpp`, `c#`, `csharp`, `css`, `go`, `html`, `java`, `js`, `javascript`, `json`, `kotlin`, `lua`, `php`, `python`, `py`, `ruby`, `rust`, `sql`, `swift`, `ts`, `typescript`, `xml`, `yaml` and more. Unknown languages default to `.txt`.

If the Gist creation fails, an error message is sent and auto-deleted after 1 minute (configurable via `FAQ_ERROR_TTL_MS` in `.env`).

> If `GITHUB_GIST_TOKEN` is not set, the `/gist` command is silently ignored and the bot behaves normally.

---

## 💬 Temporary Private Rooms

The bot facilitates ephemeral private conversations to keep your main group focused and secure:

- **Create a Room**: Type `/chat` in any group. The bot sends a message with a "Join" button and a "Copy Link" button.

- **Join a Room**: Use the invite link or type `/chat <ROOM_ID>`.

- **Privacy First**: When you join a room, the bot sends management instructions (`/chat close`, `/chat exit`) directly to your **Private Message (PM)** with the bot.

- **Relaying System**: Once in a room, any message you send to the **Bot in PM** is automatically relayed to all other participants in that room.

- **Expiration**: Rooms have a TTL (Time-To-Live) defined by `CHAT_EXPIRATION_TIME`. Once expired, the room and its participant list are permanently deleted.

- **Anti-Spam**: Each participant is subject to a rate limit (`MAX_MESSAGES_PER_10_SECONDS`) to ensure a smooth conversation for everyone.

**Commands Summary**:
| Command | Action |
| :--- | :--- |
| `/chat` | Creates a new room and returns an invite. |
| `/chat <ID>` | Joins an existing room. |
| `/chat close` | Deletes the room (Owner only). |
| `/chat exit` | Leaves the room. |

---

## 🤝 Contributing

Pull requests are very welcome. For significant changes, please open an _issue_ beforehand to discuss the proposed architecture. Ensure you adhere to the atomic pattern in `src/helpers` and always run `npm run format && npm run lint` before committing.

---

## 📜 License

This project is licensed under the GPL3.0 License - see the [LICENSE](LICENSE.txt) file for details.

---

<!-- Stargazers generated automatically with npx @titenq/stargazers -->

## ⭐ Stargazers

This repository has no stargazers yet. Be the first!
