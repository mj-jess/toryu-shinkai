import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { KoiView } from '@/components/koi-view';
import { KOI_WEEKLY_POST_ENABLED_SETTING_KEY } from '@bot/koi/types';
import { getKoiCatalog, getKoiIngredients, getSetting, listKoiSales } from '@/db';
import { messages } from '@/messages';
import { requireUser } from '@/session';

export default async function KoiPage() {
  await requireUser();
  const [products, ingredients, sales, weeklyPost] = await Promise.all([
    getKoiCatalog(),
    getKoiIngredients(),
    listKoiSales(),
    getSetting(KOI_WEEKLY_POST_ENABLED_SETTING_KEY),
  ]);

  return (
    <Box>
      <Typography variant="h5" component="h1" gutterBottom>
        {messages.koi.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {messages.koi.subtitle}
      </Typography>
      <KoiView
        products={products}
        ingredients={ingredients}
        sales={sales}
        weeklyPostEnabled={weeklyPost === 'true'}
      />
    </Box>
  );
}
