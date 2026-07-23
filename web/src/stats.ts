import { daysSince } from '@bot/enrollment/format';
import type { Enrollment, Gym } from '@bot/enrollment/types';
import { batchProfit, productEconomics } from '@bot/koi/pricing';
import type { KoiIngredient, KoiProductWithRecipe } from '@bot/koi/types';

/** An enrollment is "due for renewal" once it is this many days old (see the bot). */
export const RENEWAL_DAYS = 30;

export interface MonthBucket {
  label: string;
  count: number;
}

export interface EnrollmentStats {
  active: number;
  inactive: number;
  dueCount: number;
  byGym: Record<Gym, number>;
  perMonth: MonthBucket[];
  /** Active enrollments past the renewal window, most overdue first. */
  dueList: { passport: string; name: string; days: number }[];
}

/** Last `monthsBack` months (oldest→newest) with how many enrollments each. */
function enrollmentsPerMonth(enrollments: Enrollment[], monthsBack: number): MonthBucket[] {
  const now = new Date();
  const buckets = new Map<string, MonthBucket>();
  const order: string[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const month = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    buckets.set(key, { label: `${month}/${String(date.getFullYear()).slice(2)}`, count: 0 });
    order.push(key);
  }
  for (const enrollment of enrollments) {
    const bucket = buckets.get(enrollment.enrolledAt.slice(0, 7));
    if (bucket) bucket.count += 1;
  }
  return order.map((key) => buckets.get(key)!);
}

export function enrollmentStats(enrollments: Enrollment[]): EnrollmentStats {
  const active = enrollments.filter((enrollment) => enrollment.active);
  const byGym: Record<Gym, number> = { sandy: 0, vinewood: 0, both: 0 };
  for (const enrollment of active) byGym[enrollment.gym] += 1;

  const dueList = active
    .map((enrollment) => ({
      passport: enrollment.passport,
      name: enrollment.name,
      days: daysSince(enrollment.enrolledAt),
    }))
    .filter((entry) => entry.days >= RENEWAL_DAYS)
    .sort((a, b) => b.days - a.days);

  return {
    active: active.length,
    inactive: enrollments.length - active.length,
    dueCount: dueList.length,
    byGym,
    perMonth: enrollmentsPerMonth(enrollments, 6),
    dueList: dueList.slice(0, 5),
  };
}

export interface KoiDishProfit {
  name: string;
  collecting: number;
  buying: number;
}

export interface KoiStats {
  dishCount: number;
  dishProfits: KoiDishProfit[];
  topDish: KoiDishProfit | null;
  priciestIngredient: { name: string; price: number } | null;
  collectibleCount: number;
  buyOnlyCount: number;
}

export function koiStats(products: KoiProductWithRecipe[], ingredients: KoiIngredient[]): KoiStats {
  const dishProfits = products.map((product) => {
    const { costBuying, costCollecting } = productEconomics(product);
    return {
      name: product.name,
      collecting: batchProfit(product, costCollecting, product.totemPrice),
      buying: batchProfit(product, costBuying, product.totemPrice),
    };
  });

  const topDish =
    dishProfits.length === 0
      ? null
      : dishProfits.reduce((best, dish) => (dish.collecting > best.collecting ? dish : best));

  const priciest =
    ingredients.length === 0
      ? null
      : ingredients.reduce((max, ingredient) =>
          ingredient.buyPrice > max.buyPrice ? ingredient : max,
        );

  const collectibleCount = ingredients.filter((ingredient) => ingredient.collectible).length;

  return {
    dishCount: products.length,
    dishProfits,
    topDish,
    priciestIngredient: priciest ? { name: priciest.name, price: priciest.buyPrice } : null,
    collectibleCount,
    buyOnlyCount: ingredients.length - collectibleCount,
  };
}
