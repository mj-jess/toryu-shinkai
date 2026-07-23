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
    koi: 'KOI',
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
  koi: {
    title: 'KOI',
    subtitle: 'Cardápio, custos e margens por fornada. Os valores espelham o jogo e são editáveis.',
    highlight: (name: string, profit: string) =>
      `Coletando os ingredientes, o prato mais lucrativo é ${name}: ${profit} de lucro por fornada no totem.`,
    tabs: {
      margins: 'Margens',
      ingredients: 'Ingredientes',
    },
    margins: {
      buying: 'Comprando tudo',
      collecting: 'Coletando',
      street: 'Simular preço de rua',
      edit: 'Editar prato',
      batchHeader: (batchYield: number, totem: string) =>
        `totem ${totem} · fornada de ${batchYield} un`,
      costLabel: 'Custo por fornada',
      profitLabel: 'Lucro por fornada',
      streetResult: 'Lucro vendendo na rua a esse preço:',
      buyingShort: 'comprando',
      collectingShort: 'coletando',
      invalidPrice: '—',
    },
    ingredients: {
      name: 'Ingrediente',
      buyPrice: 'Preço de compra',
      collectible: 'Coletável',
      collectCost: 'Custo ao coletar',
      actions: 'Ações',
      edit: 'Editar ingrediente',
      yes: 'Sim',
      no: 'Não',
    },
    breadcrumbs: {
      pratos: 'Pratos',
      ingredientes: 'Ingredientes',
    },
    edit: {
      productTitle: 'Editar prato',
      ingredientTitle: 'Editar ingrediente',
      name: 'Nome',
      totemPrice: 'Preço no totem',
      streetPrice: 'Preço de rua',
      buyPrice: 'Preço de compra',
      collectible: 'Coletável (dá para conseguir sem comprar)',
      collectCost: 'Custo ao coletar (por unidade)',
      collectCostHelp: 'Ex.: o leite gasta 1 garrafa vazia (R$ 10) por unidade coletada.',
      note: 'Observação',
      save: 'Salvar',
      invalid: 'Confira os campos: preços são inteiros ≥ 0 e o nome não pode ficar vazio.',
    },
  },
  detail: {
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
