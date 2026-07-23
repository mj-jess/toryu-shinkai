import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import type { DishTotal } from '@bot/koi/sales-summary';
import { formatMoney } from '@/format';
import { productEmoji } from '@/koi-icons';
import { messages } from '@/messages';

const text = messages.koi.sales;

/** Dishes ordered by how many units were sold in the period. */
export function DishRankingTable({ dishes }: { dishes: DishTotal[] }) {
  if (dishes.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {text.empty}
      </Typography>
    );
  }

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{text.dish}</TableCell>
            <TableCell align="right">{text.quantity}</TableCell>
            <TableCell align="right">{text.revenue}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {dishes.map((dish, index) => (
            <TableRow key={dish.productId}>
              <TableCell>
                {index + 1}. {productEmoji(dish.name)} {dish.name}
              </TableCell>
              <TableCell align="right">{dish.quantity}</TableCell>
              <TableCell align="right">{formatMoney(dish.revenue)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
