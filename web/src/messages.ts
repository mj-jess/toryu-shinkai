/**
 * Every user-facing string of the dashboard, in Brazilian Portuguese.
 * Mirrors the bot convention (src/messages.ts): code in English, UI text here.
 */
export const messages = {
  appName: 'Tōryū Shinkai',
  tagline: 'Painel de administração da família',
  footer: 'Tōryū Shinkai — uso interno da família',
  login: {
    button: 'Entrar com Discord',
    restricted: 'Acesso restrito a membros autorizados da família.',
    accessDenied: 'Sua conta do Discord não tem autorização para acessar este painel.',
    error: 'Não foi possível entrar. Tente novamente.',
  },
  nav: {
    matriculas: 'Matrículas',
  },
  userMenu: {
    logout: 'Sair',
  },
  theme: {
    light: 'Tema claro',
    dark: 'Tema escuro',
  },
  notFound: {
    title: 'Página não encontrada',
    back: 'Voltar para as matrículas',
  },
  enrollments: {
    title: 'Matrículas',
    subtitle: (total: number) =>
      total === 1 ? '1 matrícula registrada' : `${total} matrículas registradas`,
    columns: {
      passport: 'Passaporte',
      name: 'Nome',
      phone: 'Telefone',
      status: 'Status',
      actions: 'Ações',
    },
    statusActive: 'Ativa',
    statusInactive: 'Inativa',
    view: 'Ver detalhes',
  },
  detail: {
    back: 'Voltar para a lista',
    labels: {
      passport: 'Passaporte',
      name: 'Nome',
      phone: 'Telefone',
      gym: 'Academia',
      enrolledAt: 'Matriculado em',
      status: 'Status',
      registeredBy: 'Registrado por',
      deactivatedBy: 'Inativado por',
      deactivatedAt: 'Inativado em',
      createdAt: 'Criado em',
      updatedAt: 'Atualizado em',
    },
    daysAgo: (days: number) =>
      days === 0 ? '(hoje)' : days === 1 ? '(há 1 dia)' : `(há ${days} dias)`,
  },
} as const;
