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
    ].join('\n'),
    buttons: {
      add: 'Adicionar',
      browse: 'Matrículas',
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
    notFound: 'ℹ️ Matrícula não encontrada — a lista foi atualizada.',
    confirmDeactivation: (name: string) =>
      `Tem certeza que deseja **inativar** a matrícula de **${name}**?\n` +
      'O registro não será apagado — poderá ser reativado depois.',
    buttons: {
      edit: 'Editar',
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

  auditLog: {
    titles: {
      created: 'Matrícula criada',
      updated: 'Matrícula editada',
      deactivated: 'Matrícula inativada',
      reactivated: 'Matrícula reativada',
    },
    byLabel: 'Por',
    change: (before: string, after: string) => `${before} → ${after}`,
  },
} as const;
