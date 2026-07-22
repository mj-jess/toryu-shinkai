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
    underDevelopment: '🚧 Essa função ainda está em desenvolvimento.',
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
} as const;
