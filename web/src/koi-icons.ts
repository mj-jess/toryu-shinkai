/** Emoji roughly matching each dish's in-game icon; a plate for anything new. */
const PRODUCT_EMOJI: Record<string, string> = {
  'Vegan Kimchi': '🥗',
  'Koi Roll': '🍣',
  'Sundubu Kuiu': '🍲',
  'Leite de Banana': '🥤',
  'Caos Cream': '🍨',
};

export function productEmoji(name: string): string {
  return PRODUCT_EMOJI[name] ?? '🍽️';
}

/** Emoji roughly matching each ingredient's in-game icon. */
const INGREDIENT_EMOJI: Record<string, string> = {
  Sal: '🧂',
  Óleo: '🫗',
  'Farinha de Trigo': '🌾',
  Açúcar: '🍬',
  Mel: '🍯',
  'Garrafão de Água': '💧',
  Ovo: '🥚',
  Tomate: '🍅',
  Cebola: '🧅',
  Batata: '🥔',
  Alface: '🥬',
  Cenoura: '🥕',
  Abóbora: '🎃',
  Banana: '🍌',
  Morango: '🍓',
  Leite: '🥛',
  Carne: '🥩',
  Tilápia: '🐟',
};

export function ingredientEmoji(name: string): string {
  return INGREDIENT_EMOJI[name] ?? '🧺';
}
