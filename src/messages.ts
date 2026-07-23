import type { Gym } from './enrollment/types.js';

/**
 * Every user-facing string lives here, in Brazilian Portuguese.
 * Code stays in English; only what the user sees is translated.
 */

export const gymLabels: Record<Gym, string> = {
  sandy: 'Sandy',
  vinewood: 'Vinewood',
  both: 'As duas',
};

export const messages = {
  common: {
    unexpectedError: '❌ Ocorreu um erro inesperado. Tente novamente.',
  },

  setup: {
    commandDescription: 'Publica o painel de matrículas das academias neste canal (admin)',
    panelPublished: '✅ Painel de matrículas publicado neste canal.',
    channelNotSendable: '❌ Não consigo enviar mensagens neste canal.',
  },

  panel: {
    title: '🏋️ Academias — Controle de Matrículas',
    description: [
      'Gerencie as matrículas das academias **Sandy** e **Vinewood**.',
      '',
      '💪 **Adicionar** — registrar uma nova matrícula',
      '📋 **Matrículas** — ver, pesquisar, editar e inativar registros',
      '🕒 **Renovações** — ver quem está com a matrícula vencida e precisa renovar',
    ].join('\n'),
    buttons: {
      add: 'Adicionar',
      browse: 'Matrículas',
      due: 'Renovações',
    },
  },

  addModal: {
    title: 'Nova Matrícula',
    passportLabel: 'Passaporte',
    passportPlaceholder: 'Ex: 12345',
    nameLabel: 'Nome',
    namePlaceholder: 'Nome do personagem',
    phoneLabel: 'Telefone',
    phoneDescription: 'Formato: (999) 999-999 — pode digitar só os números',
    phonePlaceholder: '(999) 999-999',
    gymLabel: 'Academia',
    dateLabel: 'Data da matrícula',
    dateDescription: 'Formato: dd/mm/aaaa',

    invalidPhone: '❌ Telefone inválido. Use o formato `(999) 999-999` (9 dígitos).',
    phoneInUse: (phone: string, passport: string, name: string) =>
      `❌ O telefone **${phone}** já está cadastrado para **${passport} — ${name}**.`,
    invalidDate: (todayExample: string) =>
      `❌ Data inválida. Use o formato \`dd/mm/aaaa\`, ex: \`${todayExample}\`.`,
    alreadyEnrolled: (passport: string, name: string, gymLabel: string, dateBR: string) =>
      `⚠️ O passaporte **${passport}** já tem matrícula ativa em nome de ` +
      `**${name}** (${gymLabel}, desde ${dateBR}).`,

    createdTitle: '✅ Matrícula registrada!',
    reactivatedTitle: '🔄 Matrícula reativada!',
    savedWithLog: (title: string, logUrl: string) =>
      `${title} · 📋 [Ver no log de auditoria](${logUrl})`,
    fields: {
      passport: 'Passaporte',
      name: 'Nome',
      phone: 'Telefone',
      gym: 'Academia',
      enrolledAt: 'Matriculado em',
      registeredBy: 'Registrado por',
    },
  },

  listView: {
    title: '📋 Matrículas',
    emptyAll: 'Nenhuma matrícula cadastrada ainda. Use 💪 Adicionar para registrar a primeira!',
    emptyFiltered: (filter: string) => `Nenhuma matrícula encontrada para \`${filter}\`.`,
    entryLine: (phone: string, gymLabel: string) => `Telefone: ${phone} · Academia: ${gymLabel}`,
    statusActive: 'Status: ✅ Ativa',
    statusInactive: 'Status: 💤 Inativa',
    footer: (page: number, totalPages: number, total: number) =>
      `Página ${page}/${totalPages} · ${total} matrícula(s)`,
    filterNote: (filter: string) => `Filtro: ${filter}`,
    selectPlaceholder: 'Selecionar matrícula para ver detalhes…',
    buttons: {
      filter: 'Filtrar',
      clearFilter: 'Limpar filtro',
      previous: 'Anterior',
      next: 'Próxima',
    },
  },

  filterModal: {
    title: 'Filtrar Matrículas',
    termLabel: 'Passaporte ou nome',
    termDescription: 'Passaporte exato ou parte do nome. Deixe em branco para limpar o filtro.',
    termPlaceholder: 'Ex: 631 ou Ryoko',
  },

  dueView: {
    title: '🕒 Renovações',
    header: (periodLabel: string) => `Matrículas ativas com mais de **${periodLabel}**:`,
    empty: (periodLabel: string) =>
      `Ninguém está com matrícula vencida há mais de ${periodLabel}. 🎉`,
    entryLine: (dateBR: string, days: number, gymLabel: string) =>
      `Matriculado em: ${dateBR} (há ${days} dias) · Academia: ${gymLabel}`,
    periodNote: (periodLabel: string) => `Período: ${periodLabel}`,
    periodLabels: {
      '2w': '2 semanas',
      '1m': '1 mês',
    },
  },

  detailView: {
    title: (passport: string, name: string) => `${passport} — ${name}`,
    statusLabel: 'Status',
    statusActive: '✅ Ativa',
    statusInactive: '💤 Inativa',
    deactivatedByLabel: 'Inativada por',
    deactivationInfo: (by: string, dateBR: string) => `${by} em ${dateBR}`,
    updatedNote: '✏️ Matrícula atualizada!',
    reactivatedNote: '🔄 Matrícula reativada!',
    deactivatedNote: '💤 Matrícula inativada. O registro não foi apagado.',
    renewedNote: '💰 Matrícula renovada — Matriculado em atualizado para hoje!',
    renewedAlreadyNote: 'ℹ️ A matrícula já está com a data de hoje.',
    notFound: 'ℹ️ Matrícula não encontrada — a lista foi atualizada.',
    confirmDeactivation: (name: string) =>
      `Tem certeza que deseja **inativar** a matrícula de **${name}**?\n` +
      'O registro não será apagado — poderá ser reativado depois.',
    buttons: {
      edit: 'Editar',
      renew: 'Renovar',
      deactivate: 'Inativar',
      reactivate: 'Reativar',
      back: 'Voltar',
      confirmDeactivation: 'Sim, inativar',
      cancel: 'Cancelar',
    },
  },

  editModal: {
    title: (passport: string) => `Editar — ${passport}`,
    nothingToChange: 'ℹ️ Nenhum dado foi alterado.',
    changedFieldsLabel: 'Campos alterados',
  },

  auditSetup: {
    commandDescription:
      'Define este canal como destino dos logs de auditoria das matrículas (admin)',
    channelConfigured: '✅ Os logs de auditoria das matrículas serão enviados neste canal.',
  },

  koiSetup: {
    commandDescription: 'Publica o painel do restaurante KOI neste canal (admin)',
    panelPublished: '✅ Painel do KOI publicado neste canal. O resumo semanal virá para cá.',
    logCommandDescription: 'Define este canal como destino dos registros de venda do KOI (admin)',
    logChannelConfigured: '✅ Os registros de venda do KOI serão enviados neste canal.',
  },

  koiPanel: {
    title: '🍜 KOI — Vendas de Rua',
    description: [
      'Vendeu na rua? Registre aqui no fim do turno — leva 30 segundos.',
      '',
      '💰 **Registrar venda** — informe só as quantidades; o sistema calcula o valor',
      '📊 **Semana** — como está o restaurante nesta semana',
      '🧾 **Minhas vendas** — o seu resumo da semana',
    ].join('\n'),
    buttons: {
      sale: 'Registrar venda',
      week: 'Semana',
      mine: 'Minhas vendas',
    },
  },

  koiSale: {
    modalTitle: 'Venda de rua — resumo do turno',
    quantityPlaceholder: 'Quantidade vendida (deixe vazio se não vendeu)',
    pickPrompt: 'Escolha até 5 pratos para registrar:',
    pickPlaceholder: 'Quais pratos você vendeu?',
    noProducts: '❌ Nenhum prato cadastrado no KOI ainda.',
    invalidQuantity: '❌ As quantidades devem ser números inteiros (ex: 12).',
    nothingSold: '❌ Informe a quantidade de pelo menos um prato.',
    saved: (units: number, revenue: string, profit: string, url: string | null) =>
      [
        `✅ Venda registrada: **${units}** ${units === 1 ? 'item' : 'itens'} · ${revenue}`,
        `Lucro estimado: ${profit}`,
        url ? `[Ver registro](${url})` : null,
      ]
        .filter(Boolean)
        .join('\n'),
    logTitle: 'Venda de rua registrada',
    seller: 'Vendedor',
    date: 'Data',
    revenue: 'Valor arrecadado',
    profit: 'Lucro estimado',
  },

  koiSummary: {
    weekTitle: '📊 KOI — Vendas da semana',
    weeklyTitle: '📊 KOI — Fechamento da semana',
    mineTitle: '🧾 KOI — Minhas vendas da semana',
    period: (from: string, to: string) => `Período: ${from} a ${to}`,
    empty: 'Nenhuma venda de rua registrada neste período.',
    revenue: 'Arrecadado',
    profit: 'Lucro estimado',
    units: 'Itens vendidos',
    shifts: 'Turnos registrados',
    topDish: 'Prato campeão',
    topSeller: 'Vendedor destaque',
    byDish: 'Por prato',
    bySeller: 'Ranking de vendedores',
  },

  auditLog: {
    titles: {
      created: 'Matrícula criada',
      updated: 'Matrícula editada',
      deactivated: 'Matrícula inativada',
      reactivated: 'Matrícula reativada',
      renewed: 'Matrícula renovada',
    },
    byLabel: 'Por',
    change: (before: string, after: string) => `${before} → ${after}`,
  },
} as const;
