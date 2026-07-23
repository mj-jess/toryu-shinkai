'use client';

import EditIcon from '@mui/icons-material/Edit';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import type { KoiIngredient } from '@bot/koi/types';
import { formatMoney } from '@/format';
import { ingredientEmoji } from '@/koi-icons';
import { messages } from '@/messages';

const text = messages.koi.ingredients;

export function KoiIngredientsTable({ ingredients }: { ingredients: KoiIngredient[] }) {
  return (
    <TableContainer component={Paper}>
      <Table size="small" sx={{ minWidth: 560 }}>
        <TableHead>
          <TableRow>
            <TableCell>{text.name}</TableCell>
            <TableCell>{text.buyPrice}</TableCell>
            <TableCell align="center">{text.collectible}</TableCell>
            <TableCell>{text.collectCost}</TableCell>
            <TableCell align="center">{text.actions}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {ingredients.map((ingredient) => (
            <TableRow key={ingredient.id} hover>
              <TableCell>
                <Typography variant="body2">
                  {ingredientEmoji(ingredient.name)} {ingredient.name}
                </Typography>
                {ingredient.note ? (
                  <Typography variant="caption" color="text.secondary">
                    {ingredient.note}
                  </Typography>
                ) : null}
              </TableCell>
              <TableCell>{formatMoney(ingredient.buyPrice)}</TableCell>
              <TableCell align="center">
                <Chip
                  size="small"
                  label={ingredient.collectible ? text.yes : text.no}
                  color={ingredient.collectible ? 'success' : 'default'}
                  variant={ingredient.collectible ? 'filled' : 'outlined'}
                />
              </TableCell>
              <TableCell>
                {ingredient.collectible ? formatMoney(ingredient.collectCost) : '—'}
              </TableCell>
              <TableCell align="center">
                <Tooltip title={text.edit}>
                  <IconButton
                    component={Link}
                    href={`/koi/ingredientes/${ingredient.id}/editar`}
                    size="small"
                    aria-label={text.edit}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
