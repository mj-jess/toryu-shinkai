import { EmbedBuilder } from 'discord.js';
import { formatDateBR } from '../enrollment/format.js';
import { messages } from '../messages.js';
import { KOI_COLOR } from './panel.js';
import { summarizeSales } from './sales-summary.js';
import type { KoiSale } from './types.js';

/** In-game currency, written the way the game does ($ 5.225). */
export function money(value: number): string {
  return `$ ${value.toLocaleString('pt-BR')}`;
}

/** Summary of a period — used by the weekly button, /mine and the weekly post. */
export function buildSummaryEmbed(
  title: string,
  period: { fromIso: string; toIso: string },
  sales: KoiSale[],
  options: { showSellers?: boolean } = {},
): EmbedBuilder {
  const summary = summarizeSales(sales);
  const text = messages.koiSummary;

  const embed = new EmbedBuilder()
    .setColor(KOI_COLOR)
    .setTitle(title)
    .setFooter({ text: text.period(formatDateBR(period.fromIso), formatDateBR(period.toIso)) });

  if (summary.shifts === 0) {
    embed.setDescription(text.empty);
    return embed;
  }

  const lines = [
    `**${text.revenue}:** ${money(summary.revenue)}`,
    `**${text.profit}:** ${money(summary.profit)}`,
    `**${text.units}:** ${summary.units}`,
    `**${text.shifts}:** ${summary.shifts}`,
  ];

  if (summary.topDish) {
    lines.push(`**${text.topDish}:** ${summary.topDish.name} (${summary.topDish.quantity})`);
  }
  if (options.showSellers && summary.topSeller) {
    lines.push(
      `**${text.topSeller}:** ${summary.topSeller.soldBy} (${money(summary.topSeller.revenue)})`,
    );
  }
  embed.setDescription(lines.join('\n'));

  if (summary.byDish.length > 0) {
    embed.addFields({
      name: text.byDish,
      value: summary.byDish
        .map((dish) => `${dish.name}: ${dish.quantity} · ${money(dish.revenue)}`)
        .join('\n'),
    });
  }

  if (options.showSellers && summary.bySeller.length > 0) {
    embed.addFields({
      name: text.bySeller,
      value: summary.bySeller
        .map(
          (seller, index) =>
            `${index + 1}. ${seller.soldBy}: ${money(seller.revenue)} (${seller.quantity} itens)`,
        )
        .join('\n'),
    });
  }

  return embed;
}

/** The public record of one registered shift. */
export function buildSaleLogEmbed(sale: KoiSale): EmbedBuilder {
  const text = messages.koiSale;
  const profit = sale.revenue - sale.cost;
  return new EmbedBuilder()
    .setColor(KOI_COLOR)
    .setAuthor({ name: text.logTitle })
    .setDescription(
      [
        `**${text.seller}:** ${sale.soldBy}`,
        `**${text.date}:** ${formatDateBR(sale.soldAt)}`,
        `**${text.revenue}:** ${money(sale.revenue)}`,
        `**${text.profit}:** ${money(profit)}`,
        '',
        sale.items.map((item) => `${item.productName}: ${item.quantity}`).join('\n'),
      ].join('\n'),
    )
    .setTimestamp(new Date());
}
