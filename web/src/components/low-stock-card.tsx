import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { restockCost, stockShortage, type StockShortage } from '@bot/koi/stock';
import type { KoiIngredient } from '@bot/koi/types';
import { ButtonLink } from '@/components/button-link';
import { ChartCard } from '@/components/chart-card';
import { formatMoney } from '@/format';
import { ingredientEmoji } from '@/koi-icons';
import { messages } from '@/messages';

const text = messages.inicio.koi;
const stockText = messages.koi.stock;

/** Saved stock below each ingredient's minimum, with what it costs to restock. */
export function LowStockCard({ ingredients }: { ingredients: KoiIngredient[] }) {
  const shortages = ingredients
    .map((ingredient) => stockShortage(ingredient, ingredient.stockQuantity))
    .filter((shortage): shortage is StockShortage => shortage !== null);
  const hasMinimums = ingredients.some((ingredient) => ingredient.minStock > 0);

  // On the home page collectibles are assumed collected; the Estoque tab can mark them as bought.
  const detail = (shortage: StockShortage) =>
    shortage.ingredient.collectible
      ? stockText.collectDetail(shortage.collectCost > 0 ? formatMoney(shortage.collectCost) : null)
      : shortage.cost > 0
        ? stockText.buyDetail(formatMoney(shortage.cost))
        : null;

  return (
    <ChartCard title={text.lowStock}>
      {!hasMinimums ? (
        <Typography variant="body2" color="text.secondary">
          {text.lowStockNoMinimum}
        </Typography>
      ) : shortages.length === 0 ? (
        <Typography variant="body2" color="success.main">
          {stockText.allAboveMinimum}
        </Typography>
      ) : (
        <>
          <List dense disablePadding>
            {shortages.map((shortage) => (
              <ListItem key={shortage.ingredient.id} disableGutters>
                <ListItemText
                  primary={`${ingredientEmoji(shortage.ingredient.name)} ${shortage.ingredient.name}`}
                  secondary={stockText.belowMinimum(shortage.missing, detail(shortage))}
                />
              </ListItem>
            ))}
          </List>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {stockText.restockTotal(formatMoney(restockCost(shortages, () => false)))}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {text.lowStockCaption}
            </Typography>
          </Box>
        </>
      )}
      <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 1 }}>
        <ButtonLink href="/koi?tab=estoque" size="small">
          {text.seeStock}
        </ButtonLink>
      </Stack>
    </ChartCard>
  );
}
