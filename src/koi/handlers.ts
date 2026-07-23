import { MessageFlags, type Interaction } from 'discord.js';
import { getTodayISO } from '../enrollment/format.js';
import { messages } from '../messages.js';
import { loadKoiCatalog } from './catalog.js';
import { isKoiId, parseKoiId } from './ids.js';
import { priceSaleItems } from './pricing.js';
import type { KoiSalesRepository } from './sales-repository.js';
import type { KoiLog } from './sales-log.js';
import {
  buildDishPicker,
  buildSaleModal,
  MAX_DISHES_PER_MODAL,
  parseModalProductIds,
  parseSaleModal,
} from './sale-modal.js';
import { buildSaleLogEmbed, buildSummaryEmbed, money } from './summary-view.js';
import type { Database } from '../database.js';
import { weekRange } from './week.js';

export interface KoiContext {
  db: Database;
  sales: KoiSalesRepository;
  log: KoiLog;
}

/** Routes every `koi:*` interaction. Returns false when it is not ours. */
export async function handleKoiInteraction(
  interaction: Interaction,
  ctx: KoiContext,
): Promise<boolean> {
  const customId =
    interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit()
      ? interaction.customId
      : null;
  if (customId === null || !isKoiId(customId)) return false;

  const parsed = parseKoiId(customId);
  if (!parsed) return false;

  switch (parsed.action) {
    case 'sale': {
      if (!interaction.isButton()) return false;
      const products = await loadKoiCatalog(ctx.db);
      if (products.length === 0) {
        await interaction.reply({
          content: messages.koiSale.noProducts,
          flags: MessageFlags.Ephemeral,
        });
        return true;
      }
      // One modal fits five dishes; a bigger menu picks which ones first.
      if (products.length > MAX_DISHES_PER_MODAL) {
        await interaction.reply({
          content: messages.koiSale.pickPrompt,
          components: [buildDishPicker(products)],
          flags: MessageFlags.Ephemeral,
        });
        return true;
      }
      await interaction.showModal(buildSaleModal(products));
      return true;
    }

    case 'sale-pick': {
      if (!interaction.isStringSelectMenu()) return false;
      const chosen = new Set(interaction.values.map(Number));
      const products = (await loadKoiCatalog(ctx.db)).filter((product) => chosen.has(product.id));
      await interaction.showModal(buildSaleModal(products));
      return true;
    }

    case 'sale-modal': {
      if (!interaction.isModalSubmit()) return false;
      const { quantities, invalid } = parseSaleModal(
        interaction,
        parseModalProductIds(parsed.payload),
      );

      if (invalid) {
        await interaction.reply({
          content: messages.koiSale.invalidQuantity,
          flags: MessageFlags.Ephemeral,
        });
        return true;
      }
      if (quantities.length === 0) {
        await interaction.reply({
          content: messages.koiSale.nothingSold,
          flags: MessageFlags.Ephemeral,
        });
        return true;
      }

      const products = await loadKoiCatalog(ctx.db);
      const items = priceSaleItems(products, quantities);
      const soldAt = getTodayISO();
      const saleId = await ctx.sales.insert({
        soldAt,
        soldBy: interaction.user.displayName ?? interaction.user.username,
        soldById: interaction.user.id,
        items,
      });

      const revenue = items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
      const cost = items.reduce((total, item) => total + item.unitCost * item.quantity, 0);
      const units = items.reduce((total, item) => total + item.quantity, 0);

      const url = await ctx.log
        .send(
          buildSaleLogEmbed({
            id: saleId,
            soldAt,
            soldBy: interaction.user.displayName ?? interaction.user.username,
            soldById: interaction.user.id,
            revenue,
            cost,
            createdAt: '',
            items,
          }),
        )
        .catch(() => null);

      await interaction.reply({
        content: messages.koiSale.saved(units, money(revenue), money(revenue - cost), url),
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }

    case 'week': {
      if (!interaction.isButton()) return false;
      const range = weekRange(new Date());
      const sales = await ctx.sales.listBetween(range.fromIso, range.toIso);
      await interaction.reply({
        embeds: [
          buildSummaryEmbed(messages.koiSummary.weekTitle, range, sales, { showSellers: true }),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }

    case 'mine': {
      if (!interaction.isButton()) return false;
      const range = weekRange(new Date());
      const sales = await ctx.sales.listBySeller(interaction.user.id, range.fromIso, range.toIso);
      await interaction.reply({
        embeds: [buildSummaryEmbed(messages.koiSummary.mineTitle, range, sales)],
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }

    default:
      return false;
  }
}
