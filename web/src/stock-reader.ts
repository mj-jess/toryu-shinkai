import Anthropic from '@anthropic-ai/sdk';

/**
 * Reads ingredient quantities off an in-game inventory screenshot with Claude.
 * The image only lives in memory for the duration of the request — it is never
 * written to disk, the database or any log.
 */

const MODEL = 'claude-opus-5-5';

export const STOCK_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;
export type StockImageType = (typeof STOCK_IMAGE_TYPES)[number];

export function isStockImageType(value: string): value is StockImageType {
  return (STOCK_IMAGE_TYPES as readonly string[]).includes(value);
}

export type StockReadFailure = 'not_configured' | 'refused' | 'failed';

export type StockReadOutcome =
  | { ok: true; quantities: { id: number; quantity: number }[] }
  | { ok: false; reason: StockReadFailure };

interface CatalogEntry {
  id: number;
  name: string;
}

function buildPrompt(ingredients: CatalogEntry[]): string {
  const catalog = ingredients
    .map((ingredient) => `- ${ingredient.id}: ${ingredient.name}`)
    .join('\n');
  return `The image is a screenshot of a character's inventory in a GTA roleplay server. Each slot shows an item (icon and/or name) and how many units of it there are.

Match the items you can see to this ingredient catalog (id: name, in Brazilian Portuguese):
${catalog}

Rules:
- Names in the game may differ slightly from the catalog (accents, abbreviations, plural, English names). Match by meaning and icon.
- If the same ingredient appears in more than one slot, add the quantities up.
- A slot with no visible number holds 1 unit.
- Leave out catalog ingredients you cannot see in the image, and ignore items that are not in the catalog.
- Only report a quantity you can actually read; do not guess.`;
}

const OUTPUT_SCHEMA = (ids: number[]) => ({
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          ingredient_id: { type: 'integer', enum: ids },
          quantity: { type: 'integer' },
        },
        required: ['ingredient_id', 'quantity'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
});

interface ReaderOutput {
  items: { ingredient_id: number; quantity: number }[];
}

export async function readStockFromImage(
  image: { base64: string; mediaType: StockImageType },
  ingredients: CatalogEntry[],
): Promise<StockReadOutcome> {
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, reason: 'not_configured' };

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: OUTPUT_SCHEMA(ingredients.map((i) => i.id)) },
      },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: image.mediaType, data: image.base64 },
            },
            { type: 'text', text: buildPrompt(ingredients) },
          ],
        },
      ],
    });

    if (response.stop_reason === 'refusal') return { ok: false, reason: 'refused' };
    const text = response.content.find((block) => block.type === 'text')?.text;
    if (!text) return { ok: false, reason: 'failed' };

    const output = JSON.parse(text) as ReaderOutput;
    const known = new Set(ingredients.map((ingredient) => ingredient.id));
    const totals = new Map<number, number>();
    for (const item of output.items) {
      if (!known.has(item.ingredient_id) || !Number.isInteger(item.quantity) || item.quantity < 0) {
        continue;
      }
      totals.set(item.ingredient_id, (totals.get(item.ingredient_id) ?? 0) + item.quantity);
    }
    return {
      ok: true,
      quantities: [...totals].map(([id, quantity]) => ({ id, quantity })),
    };
  } catch (error) {
    console.error('Stock image reading failed:', error);
    return { ok: false, reason: 'failed' };
  }
}
