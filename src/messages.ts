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
      'Use os botões abaixo para gerenciar as matrículas das academias **Sandy** e **Vinewood**.',
      '',
      '💪 **Adicionar** — registrar uma nova matrícula',
      '✏️ **Editar** — corrigir dados de uma matrícula',
      '🔍 **Pesquisar** — consultar matrículas',
      '💤 **Inativar** — desativar uma matrícula (nada é apagado)',
    ].join('\n'),
    buttons: {
      add: 'Adicionar',
      edit: 'Editar',
      search: 'Pesquisar',
      deactivate: 'Inativar',
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
    invalidDate: (todayExample: string) =>
      `❌ Data inválida. Use o formato \`dd/mm/aaaa\`, ex: \`${todayExample}\`.`,
    alreadyEnrolled: (passport: string, name: string, gymLabel: string, dateBR: string) =>
      `⚠️ O passaporte **${passport}** já tem matrícula ativa em nome de ` +
      `**${name}** (${gymLabel}, desde ${dateBR}).`,

    createdTitle: '✅ Matrícula registrada!',
    reactivatedTitle: '🔄 Matrícula reativada!',
    fields: {
      passport: 'Passaporte',
      name: 'Nome',
      phone: 'Telefone',
      gym: 'Academia',
      enrolledAt: 'Data da matrícula',
      registeredBy: 'Registrado por',
    },
  },

  searchModal: {
    title: 'Pesquisar Matrículas',
    termLabel: 'Passaporte ou nome',
    termDescription: 'Passaporte exato ou parte do nome. Digite * para listar as últimas 20.',
    termPlaceholder: 'Ex: 631, Ryoko ou *',

    resultsTitle: '🔍 Resultado da pesquisa',
    recentTitle: '🕐 Últimas matrículas',
    noResults: (term: string) => `🔍 Nenhuma matrícula encontrada para \`${term}\`.`,
    resultLine: (phone: string, gymLabel: string, dateBR: string) =>
      `📞 ${phone} · 🏋️ ${gymLabel} · 📅 ${dateBR}`,
    statusActive: '✅ Ativa',
    statusInactive: (dateBR: string) => `💤 Inativa desde ${dateBR}`,
    totalsFooter: (active: number, inactive: number) =>
      `Total: ${active} ativa(s) · ${inactive} inativa(s)`,
  },

  editModal: {
    title: 'Editar Matrícula',
    passportLabel: 'Passaporte',
    passportDescription: 'Identifica a matrícula — o passaporte em si não é alterado',
    optionalHint: 'Deixe em branco para manter o valor atual',
    nameLabel: 'Novo nome',
    phoneLabel: 'Novo telefone',
    gymLabel: 'Academia',
    keepGymOption: '— não alterar —',
    dateLabel: 'Nova data da matrícula',

    notFound: (passport: string) =>
      `❌ Nenhuma matrícula encontrada para o passaporte \`${passport}\`. ` +
      'Confira o número ou use 🔍 Pesquisar.',
    nothingToChange: 'ℹ️ Nenhum campo foi preenchido — nada para alterar.',
    updatedTitle: '✏️ Matrícula atualizada!',
    changedFieldsLabel: 'Campos alterados',
  },

  deactivateModal: {
    title: 'Inativar Matrícula',
    passportLabel: 'Passaporte',
    passportPlaceholder: 'Ex: 631',

    notFound: (passport: string) =>
      `❌ Nenhuma matrícula encontrada para o passaporte \`${passport}\`. ` +
      'Confira o número ou use 🔍 Pesquisar.',
    alreadyInactive: (name: string) => `ℹ️ A matrícula de **${name}** já está inativa.`,
    deactivatedTitle: '💤 Matrícula inativada',
    deactivatedNote:
      'O registro não foi apagado — se a pessoa se matricular de novo, será reativado automaticamente.',
    deactivatedBy: 'Inativada por',
  },
} as const;
