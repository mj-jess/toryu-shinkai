import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { getTodayISO, isoDaysAgo } from '@bot/enrollment/format';
import { summarizeSales } from '@bot/koi/sales-summary';
import { SalesPerDayChart } from '@/components/sales-per-day-chart';
import { ButtonLink } from '@/components/button-link';
import { ChartCard } from '@/components/chart-card';
import { DishRankingTable } from '@/components/dish-ranking-table';
import { DueQueueList } from '@/components/due-queue-list';
import { EnrollmentsPerMonthChart } from '@/components/enrollments-per-month-chart';
import { GymDistributionChart } from '@/components/gym-distribution-chart';
import { IngredientSourceChart } from '@/components/ingredient-source-chart';
import { KoiProfitChart } from '@/components/koi-profit-chart';
import { SalesPeriodFilter } from '@/components/sales-period-filter';
import { StatCard } from '@/components/stat-card';
import { getKoiCatalog, getKoiIngredients, listEnrollments, listKoiSales } from '@/db';
import { formatMoney } from '@/format';
import { messages } from '@/messages';
import { SALES_PERIODS } from '@/sales-periods';
import { requireUser } from '@/session';
import { enrollmentStats, koiStats } from '@/stats';

export default async function DashboardHomePage({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>;
}) {
  await requireUser();
  const { dias } = await searchParams;
  const days = Number(dias);
  const period = SALES_PERIODS.find((candidate) => candidate === days) ?? 30;

  const [enrollments, products, ingredients, sales] = await Promise.all([
    listEnrollments(),
    getKoiCatalog(),
    getKoiIngredients(),
    listKoiSales(isoDaysAgo(period - 1), getTodayISO()),
  ]);
  const academia = enrollmentStats(enrollments);
  const koi = koiStats(products, ingredients);
  const salesSummary = summarizeSales(sales);
  const t = messages.inicio;

  return (
    <Box>
      <Typography variant="h5" component="h1" gutterBottom>
        {t.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t.subtitle}
      </Typography>

      {/* Academia */}
      <Typography variant="h6" sx={{ mb: 1.5 }}>
        {t.academia.section}
      </Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard label={t.academia.active} value={academia.active} color="primary" />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard label={t.academia.inactive} value={academia.inactive} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard
            label={t.academia.due}
            value={academia.dueCount}
            caption={t.academia.dueCaption}
            color="warning"
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <ChartCard title={t.academia.byGym}>
            <GymDistributionChart byGym={academia.byGym} />
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ChartCard title={t.academia.perMonth}>
            <EnrollmentsPerMonthChart months={academia.perMonth} />
          </ChartCard>
        </Grid>

        <Grid size={12}>
          <ChartCard title={t.academia.dueQueue}>
            <DueQueueList entries={academia.dueList} />
            <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 1 }}>
              <ButtonLink href="/matriculas" size="small">
                {t.academia.seeAll}
              </ButtonLink>
            </Stack>
          </ChartCard>
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      {/* KOI */}
      <Typography variant="h6" sx={{ mb: 1.5 }}>
        {t.koi.section}
      </Typography>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 1.5 }}
      >
        <Typography variant="subtitle1" color="text.secondary">
          {t.koi.salesSection}
        </Typography>
        <SalesPeriodFilter period={period} />
      </Stack>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={t.koi.salesRevenue}
            value={formatMoney(salesSummary.revenue)}
            color="primary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={t.koi.salesProfit}
            value={formatMoney(salesSummary.profit)}
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={t.koi.salesUnits}
            value={salesSummary.units}
            caption={t.koi.salesShifts(salesSummary.shifts)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={t.koi.salesTopSeller}
            value={salesSummary.topSeller?.soldBy ?? '—'}
            caption={
              salesSummary.topSeller ? formatMoney(salesSummary.topSeller.revenue) : t.koi.salesNone
            }
          />
        </Grid>

        {salesSummary.byDay.length > 0 ? (
          <Grid size={{ xs: 12, md: 7 }}>
            <ChartCard title={t.koi.salesByDay}>
              <SalesPerDayChart days={salesSummary.byDay} />
            </ChartCard>
          </Grid>
        ) : null}
        <Grid size={{ xs: 12, md: salesSummary.byDay.length > 0 ? 5 : 12 }}>
          <ChartCard title={t.koi.salesDishRanking}>
            <DishRankingTable dishes={salesSummary.byDish} />
          </ChartCard>
        </Grid>
      </Grid>

      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 1.5 }}>
        {t.koi.catalogSection}
      </Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard label={t.koi.dishes} value={koi.dishCount} color="primary" />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard
            label={t.koi.topDish}
            value={koi.topDish?.name ?? '—'}
            caption={
              koi.topDish ? t.koi.topDishCaption(formatMoney(koi.topDish.collecting)) : undefined
            }
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard
            label={t.koi.priciest}
            value={koi.priciestIngredient?.name ?? '—'}
            caption={koi.priciestIngredient ? formatMoney(koi.priciestIngredient.price) : undefined}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <ChartCard title={t.koi.profitByDish}>
            <KoiProfitChart dishes={koi.dishProfits} />
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <ChartCard title={t.koi.ingredientSource}>
            <IngredientSourceChart collectible={koi.collectibleCount} buyOnly={koi.buyOnlyCount} />
          </ChartCard>
        </Grid>

        <Grid size={12}>
          <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
            <ButtonLink href="/koi" size="small">
              {t.koi.seeAll}
            </ButtonLink>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
