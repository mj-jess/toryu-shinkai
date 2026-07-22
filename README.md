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

## Dados

Os registros ficam em `data/family.db` (SQLite). Para backup, basta copiar esse arquivo.

O schema é versionado em `migrations/` (SQL puro) e aplicado automaticamente quando o bot sobe. Plano futuro (registrado no [CLAUDE.md](CLAUDE.md)): migrar para Drizzle + Postgres (Neon) quando o dashboard web começar.

## Produção (24/7 na Oracle Cloud)

O bot roda numa VM **Always Free** da Oracle Cloud (Ubuntu 24.04, `VM.Standard.E2.1.Micro`, região São Paulo), gerenciado pelo **systemd** (`familia-bot.service`): sobe no boot da VM, reinicia sozinho em caso de crash e loga no `journalctl`. O banco de produção vive só na VM (`~/toryu-shinkai/data/family.db`).

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
ssh -i ~/.ssh/oracle-bot.key ubuntu@146.235.44.150 'cd toryu-shinkai && git pull && npm ci && sudo systemctl restart familia-bot'

# status / reiniciar / parar
ssh -i ~/.ssh/oracle-bot.key ubuntu@146.235.44.150 'systemctl status familia-bot --no-pager'
ssh -i ~/.ssh/oracle-bot.key ubuntu@146.235.44.150 'sudo systemctl restart familia-bot'
ssh -i ~/.ssh/oracle-bot.key ubuntu@146.235.44.150 'sudo systemctl stop familia-bot'

# entrar na VM
ssh -i ~/.ssh/oracle-bot.key ubuntu@146.235.44.150
```

⚠️ **Uma instância por token**: a produção usa o token do Tōryū Bot — nunca rode `npm start` local com esse token enquanto a VM estiver de pé. Para desenvolver, use o bot **dev** (aplicação Discord separada, token próprio no `.env` local).
