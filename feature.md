Estou desenvolvendo um **bot de Telegram** e quero implementar um sistema de **salas de chat temporárias usando grupos temporários reais do Telegram** (em vez de relay de mensagens).

A implementação será em **Node.js com TypeScript**, mas a lógica deve ser independente de framework. Pode usar exemplos com **Telegraf**.

Quero que você me ajude a projetar e implementar **toda a arquitetura dessa funcionalidade**.

---

# Objetivo da funcionalidade

Usuários podem criar **grupos temporários automaticamente** através do bot.

O bot cria um **grupo real do Telegram**, gera um link de convite e depois **encerra o grupo automaticamente após um tempo configurado**.

Esse tempo de expiração deve ser configurado através de uma variável no **arquivo `.env`**.

---

# Variáveis de ambiente

No `.env`:

```
CHAT_EXPIRE_MINUTES=60
```

Essa variável define **quantos minutos o grupo temporário deve existir antes de ser encerrado automaticamente**.

---

# Fluxo esperado

1. Um usuário executa o comando:

```
/chat
```

2. O bot cria automaticamente um **grupo temporário do Telegram**.

3. O bot define um nome para o grupo, por exemplo:

```
Chat TitenQ Group Bot #<id>
```

4. O bot gera um **link de convite para o grupo**.

5. O bot envia o link para quem executou o comando.

Exemplo de resposta:

```
Chat temporário criado.

Entre usando o link abaixo:

https://t.me/....

Este chat será encerrado automaticamente em 60 minutos.
```

6. Pessoas entram no grupo usando o link.

7. Os usuários conversam normalmente no grupo (sem relay do bot).

8. Quando o tempo definido em `CHAT_EXPIRE_MINUTES` expira:

* o bot remove todos os usuários
* o bot encerra o grupo ou o deixa inacessível
* o bot invalida o link de convite

---

# Regras do sistema

### criação do chat

Comando:

```
/chat
```

Comportamento:

* gerar `chatId` interno único
* criar grupo do Telegram
* gerar link de convite
* registrar o tempo de expiração
* enviar o link no Grupo

---

### entrada de usuários

Usuários entram **diretamente pelo link do Telegram**, sem passar pelo bot.

---

### funcionamento do chat

* usuários conversam normalmente
* mensagens não passam pelo bot
* o bot apenas administra o ciclo de vida do grupo

---

### expiração automática

Quando o tempo definido em `.env` for atingido:

O bot deve:

1. revogar o link de convite
2. remover usuários do grupo
3. encerrar o grupo ou torná-lo inutilizável
4. remover o chat da base de dados

---

# Estrutura de dados sugerida

Sugira uma estrutura simples para controle interno.

Exemplo:

```
chats = Map<chatId, Chat>
```

Estrutura Chat:

```
{
 id: string
 telegramChatId: number
 inviteLink: string
 createdBy: number
 createdAt: number
 expiresAt: number
}
```

---

# Funções necessárias

Preciso que você implemente funções como:

```
createChat(userId)
generateInviteLink(telegramChatId)
scheduleChatExpiration(chatId)
expireChat(chatId)
revokeInviteLink(chatId)
```

---

# Requisitos técnicos

* usar **TypeScript**
* ler configuração do `.env`
* arquitetura limpa
* tratamento de erros
* evitar vazamento de memória
* lidar corretamente com falhas da API do Telegram

---

# Recursos extras (opcional)

Se possível, implemente também:

1. comando `/close` para o criador encerrar o chat antes do tempo
2. comando `/chats` para listar chats ativos (somente o dono do Bot)

---

# Resultado esperado

Quero que você gere:

1. arquitetura da solução
2. estrutura de dados
3. código TypeScript completo
4. exemplo usando uma biblioteca de bot Telegram, Telegraf

Não esquecer de usar o i18n para as mensagens
