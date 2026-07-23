import {
  ActionRowBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
  type MessageActionRowComponentBuilder,
  type ModalSubmitInteraction,
} from 'discord.js';
import { messages } from '../messages.js';
import { koiId, quantityFieldId } from './ids.js';
import type { KoiProduct } from './types.js';

/** Discord allows at most five inputs per modal — one per dish here. */
export const MAX_DISHES_PER_MODAL = 5;

/**
 * The shift modal: one quantity field per dish. Members leave what they did
 * not sell blank; the system prices everything from the street prices.
 */
export function buildSaleModal(products: KoiProduct[]): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId(koiId('sale-modal', products.map((product) => product.id).join(',')))
    .setTitle(messages.koiSale.modalTitle);

  for (const product of products.slice(0, MAX_DISHES_PER_MODAL)) {
    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(quantityFieldId(product.id))
          .setLabel(product.name.slice(0, 45))
          .setPlaceholder(messages.koiSale.quantityPlaceholder)
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(5),
      ),
    );
  }

  return modal;
}

/** Select shown when the catalog outgrows one modal: pick up to five dishes. */
export function buildDishPicker(
  products: KoiProduct[],
): ActionRowBuilder<MessageActionRowComponentBuilder> {
  const select = new StringSelectMenuBuilder()
    .setCustomId(koiId('sale-pick'))
    .setPlaceholder(messages.koiSale.pickPlaceholder)
    .setMinValues(1)
    .setMaxValues(Math.min(MAX_DISHES_PER_MODAL, products.length))
    .addOptions(
      products
        .slice(0, 25)
        .map((product) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(product.name.slice(0, 100))
            .setValue(String(product.id)),
        ),
    );
  return new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(select);
}

export interface ParsedQuantities {
  quantities: { productId: number; quantity: number }[];
  /** Field values that were filled in but are not whole numbers ≥ 0. */
  invalid: boolean;
}

/** The product ids a shift modal was built for, taken from its custom ID. */
export function parseModalProductIds(payload: string): number[] {
  return payload
    .split(',')
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);
}

/** Reads the quantity fields, treating blank as zero. */
export function parseSaleModal(
  interaction: ModalSubmitInteraction,
  productIds: number[],
): ParsedQuantities {
  const quantities: { productId: number; quantity: number }[] = [];
  let invalid = false;

  for (const productId of productIds) {
    const raw = interaction.fields.getTextInputValue(quantityFieldId(productId)).trim();
    if (raw === '') continue;

    const quantity = Number(raw);
    if (!Number.isInteger(quantity) || quantity < 0) {
      invalid = true;
      continue;
    }
    if (quantity > 0) quantities.push({ productId, quantity });
  }

  return { quantities, invalid };
}
