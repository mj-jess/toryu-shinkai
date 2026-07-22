# Família Bot 🎮

Bot de administração do servidor da família (GTA RP). Primeira funcionalidade: controle de matrículas das academias **Sandy** e **Vinewood**.

## 1. Criar o bot no Discord (só na primeira vez)

1. Acesse o [Discord Developer Portal](https://discord.com/developers/applications) e clique em **New Application**. Dê um nome (ex: `Família Bot`) e crie.
2. Em **General Information**, copie o **Application ID** → ele é o `CLIENT_ID`.
3. Vá na aba **Bot**:
   - Clique em **Reset Token** e copie o token → ele é o `DISCORD_TOKEN` (⚠️ não compartilhe com ninguém).
   - Desmarque **Public Bot** se quiser que só você possa adicioná-lo.
4. Pegue o ID do seu servidor: no Discord, ative o _Modo Desenvolvedor_ (Configurações → Avançado), depois clique com o botão direito no nome do servidor → **Copiar ID do servidor** → ele é o `GUILD_ID`.

## 2. Adicionar o bot no servidor

Monte a URL abaixo trocando `SEU_CLIENT_ID` pelo Application ID, abra no navegador e escolha o servidor:

```
https://discord.com/oauth2/authorize?client_id=SEU_CLIENT_ID&scope=bot%20applications.commands&permissions=19456
```

_(As permissões incluem: ver canais, enviar mensagens e embeds.)_

## 3. Configurar e rodar

```bash
cp .env.example .env   # depois edite o .env com token e IDs
npm install
npm run deploy         # registra os comandos no servidor (rodar 1x, ou quando mudar comandos)
npm start              # liga o bot
```

### Scripts de desenvolvimento

```bash
npm run typecheck      # verificação de tipos (TypeScript estrito)
npm test               # roda os testes (Vitest)
npm run test:watch     # testes em modo watch
npm run format         # formata o código (Prettier)
npm run format:check   # só verifica a formatação
```

Padrões do projeto (código em inglês, texto de usuário em português, testes, etc.): veja o [CLAUDE.md](CLAUDE.md).

## 4. Publicar o painel de matrículas

1. Crie a categoria **Academia** e o canal **#matricula** no Discord.
2. Recomendado: nas permissões do canal, bloqueie _Enviar mensagens_ para @everyone (assim a mensagem do painel fica sempre visível).
3. No canal, digite `/academia-setup` → o bot publica a mensagem fixa com os botões.

## Funcionalidades

| Botão        | Descrição                                                                                                                                                                   |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 💪 Adicionar | Modal com passaporte, nome, telefone, academia (padrão: As duas) e data (padrão: hoje). Se o passaporte já existir inativo, a matrícula é **reativada** com os novos dados. |
| ✏️ Editar    | Informa o passaporte e preenche **só o que quer mudar** — campos em branco mantêm o valor atual.                                                                            |
| 🔍 Pesquisar | Por passaporte exato ou parte do nome; `*` lista as últimas 20. Mostra status (✅/💤) e totais.                                                                             |
| 💤 Inativar  | Nunca apaga o registro, só marca como inativo — guardando quem inativou e quando.                                                                                           |

## Dados

Os registros ficam em `data/family.db` (SQLite). Para backup, basta copiar esse arquivo.

O schema é versionado em `migrations/` (SQL puro) e aplicado automaticamente quando o bot sobe. Plano futuro (registrado no [CLAUDE.md](CLAUDE.md)): migrar para Drizzle + Postgres (Neon) quando o hosting for definido / o dashboard web começar.
