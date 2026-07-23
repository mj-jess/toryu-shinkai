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

Dois ambientes, dois arquivos de env (ambos gitignorados):

| Arquivo          | Aplicação                 | Banco (Neon)  | Scripts                       |
| ---------------- | ------------------------- | ------------- | ----------------------------- |
| `.env`           | Tōryū Bot (produção)      | branch `main` | `npm start`, `npm run deploy` |
| `.env.local`     | Tōryū Bot Dev             | branch `dev`  | `npm run dev`, `deploy:dev`   |
| `web/.env.local` | Dashboard web (dev local) | branch `dev`  | `npm run dev -w web`          |

```bash
cp .env.example .env.local  # edite com o token do bot dev + connection string do branch dev
npm install
npm run deploy:dev          # registra os comandos do bot dev (1x, ou quando mudarem)
npm run dev                 # liga o bot dev localmente
```

⚠️ `npm start` sobe o bot de **produção** — só a VM roda isso. Localmente, sempre `npm run dev`.

### Scripts de desenvolvimento

```bash
npm run typecheck      # verificação de tipos (TypeScript estrito)
npm test               # roda os testes (Vitest)
npm run test:watch     # testes em modo watch
npm run format         # formata o código (Prettier)
npm run format:check   # só verifica a formatação
npm run seed:dev       # reseta o banco DEV com 24 matrículas de teste
npm run db:migrate:dev # aplica as migrations no banco DEV sem subir o bot
npm run typecheck -w web   # tipos do dashboard
npm run build -w web       # build de produção do dashboard
```

Padrões do projeto (código em inglês, texto de usuário em português, testes, etc.): veja o [CLAUDE.md](CLAUDE.md).

## 4. Publicar o painel de matrículas

1. Crie a categoria **Academia** e o canal **#matricula** no Discord.
2. Recomendado: nas permissões do canal, bloqueie _Enviar mensagens_ para @everyone (assim a mensagem do painel fica sempre visível).
3. No canal, digite `/academia-setup` → o bot publica a mensagem fixa com os botões.

## Funcionalidades

| Botão         | Descrição                                                                                                                                                                   |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 💪 Adicionar  | Modal com passaporte, nome, telefone, academia (padrão: As duas) e data (padrão: hoje). Se o passaporte já existir inativo, a matrícula é **reativada** com os novos dados. |
| 📋 Matrículas | Navegador completo (efêmero, cada pessoa vê o seu): lista paginada com filtro por passaporte/nome → seleciona um registro → card com todos os dados e ações.                |
| 🕒 Renovações | Matrículas ativas vencidas há mais de **1 mês** (padrão) ou **2 semanas**, da mais atrasada para a mais recente — a fila de cobrança do RP.                                 |

Dentro do card de um registro:

- ✏️ **Editar** — modal **pré-preenchida** com os dados atuais; é só corrigir e enviar
- 💰 **Renovar** — após cobrar no RP, um clique atualiza o "Matriculado em" para hoje
- 💤 **Inativar** — com confirmação; nunca apaga, e guarda quem inativou e quando
- 🔄 **Reativar** — para registros inativos, reativa mantendo os dados

Validações: passaporte e telefone são **únicos** (a mensagem de erro informa quem já usa o número).

Auditoria: rode `/academia-log-setup` dentro de um canal (ex: **#log-matriculas**) e toda ação — criar, editar, inativar, reativar, renovar — vira um embed colorido lá, com os dados completos e quem fez.

## Dashboard web (`web/`)

Painel em **Next.js + Material UI** (workspace npm dentro do repo) que lê o mesmo banco do bot: login com Discord (restrito à allowlist `ALLOWED_DISCORD_IDS`), a página **Matrículas** (tabela com busca, filtro por coluna, ordenação e paginação + página de detalhe, somente leitura) e a página **KOI** (margens do restaurante comprando vs coletando ingredientes, simulador de preço de rua e edição dos preços — que espelham o jogo e são configuráveis).

```bash
cp web/.env.example web/.env.local   # preencha (veja o comentário em cada variável)
npm run dev -w web                   # http://localhost:3000
```

Requisitos no Discord Developer Portal (uma vez, por aplicação):

1. Abra a aplicação (dev: **Tōryū Bot Dev**) → **OAuth2**.
2. Em **Redirects**, adicione `http://localhost:3000/api/auth/callback/discord`.
3. Copie o **Client Secret** para `AUTH_DISCORD_SECRET`.

O dashboard reaproveita o schema/tipos do bot via alias `@bot/*` → `src/` — uma fonte de verdade só.

**Produção**: https://toryu-shinkai-web-mu.vercel.app — projeto `toryu-shinkai-web` na Vercel (Root Directory `web`, envs no painel da Vercel, banco Neon `main`, login pelo app Discord de produção). Todo push na `main` redeploya sozinho.

## Dados

Os registros ficam num **Postgres gerenciado (Neon, free tier)**: branch `main` = produção, branch `dev` = desenvolvimento — o bot dev nunca enxerga dados de produção.

O schema mora em `src/db/schema.ts` (Drizzle). Para mudar o banco: edite o schema → `npm run db:generate` → a migration SQL cai em `drizzle/` (commitada) e é aplicada automaticamente quando o bot sobe. Backups e restauração ficam no painel do Neon (histórico point-in-time).

## Produção (24/7 na Oracle Cloud)

O bot roda numa VM **Always Free** da Oracle Cloud (Ubuntu 24.04, `VM.Standard.E2.1.Micro`, região São Paulo), gerenciado pelo **systemd** (`familia-bot.service`): sobe no boot da VM, reinicia sozinho em caso de crash e loga no `journalctl`. O banco fica no **Neon** (fora da VM) — a VM é descartável: recriá-la é só repetir a tabela abaixo.

### Como o servidor foi montado

| Passo      | Comando-chave                                 | Por quê                                                 |
| ---------- | --------------------------------------------- | ------------------------------------------------------- |
| Swap 1GB   | `fallocate` + `mkswap` + `/etc/fstab`         | 1GB de RAM é pouco; swap evita OOM no `npm install`     |
| Node 24    | script NodeSource + `apt install nodejs`      | o apt padrão do Ubuntu traz Node antigo                 |
| Deploy key | `ssh-keygen` na VM + `gh repo deploy-key add` | acesso **somente-leitura** a um único repo, revogável   |
| Código     | `git clone` + `npm ci`                        | `ci` instala o lockfile exato, sem resolver versões     |
| Segredos   | `scp .env` + `chmod 600`                      | token viaja criptografado e só o usuário do serviço lê  |
| Serviço    | unit systemd + `systemctl enable --now`       | boot automático, restart em crash, logs no `journalctl` |

### Comandos do dia a dia

Da sua máquina (chave SSH em `~/.ssh/oracle-bot.key`):

```bash
# ver logs ao vivo
ssh -i ~/.ssh/oracle-bot.key ubuntu@146.235.44.150 'journalctl -u familia-bot -f'

# atualizar a produção depois de um push
# (--workspaces=false instala só as deps do bot — a VM não precisa das do dashboard)
ssh -i ~/.ssh/oracle-bot.key ubuntu@146.235.44.150 'cd toryu-shinkai && git pull && npm ci --workspaces=false && sudo systemctl restart familia-bot'

# status / reiniciar / parar
ssh -i ~/.ssh/oracle-bot.key ubuntu@146.235.44.150 'systemctl status familia-bot --no-pager'
ssh -i ~/.ssh/oracle-bot.key ubuntu@146.235.44.150 'sudo systemctl restart familia-bot'
ssh -i ~/.ssh/oracle-bot.key ubuntu@146.235.44.150 'sudo systemctl stop familia-bot'

# entrar na VM
ssh -i ~/.ssh/oracle-bot.key ubuntu@146.235.44.150
```

⚠️ **Uma instância por token**: a produção usa o token do Tōryū Bot — nunca rode `npm start` local com esse token enquanto a VM estiver de pé. Para desenvolver, use o bot **dev** (aplicação Discord separada, token próprio no `.env` local).
