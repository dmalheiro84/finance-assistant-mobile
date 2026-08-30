import { Box, Chip, List, ListItem, Paper, Stack, Typography } from '@mui/material';
import { formatCurrency } from '../theme/format';
import type { TopCategoria } from '../data/queries/dashboard';

interface TopCategoriesListProps {
  data: TopCategoria[];
}

/**
 * Top categorias de despesa do ano — lista compacta em vez da tabela densa
 * do desktop (table_top_categories), mais legível em ecrã estreito.
 */
export function TopCategoriesList({ data }: TopCategoriesListProps) {
  if (data.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">Sem categorias para mostrar neste ano.</Typography>
      </Paper>
    );
  }

  const maxTotal = Math.max(...data.map((row) => row.total));

  return (
    <List dense disablePadding>
      {data.map((row, index) => (
        <ListItem key={row.categoria} disableGutters sx={{ display: 'block', py: 0.75 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.disabled" sx={{ width: 18 }}>
                {index + 1}
              </Typography>
              <Typography variant="body2" noWrap>
                {row.categoria}
              </Typography>
              {row.grupo && (
                <Chip label={row.grupo} size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
              )}
            </Stack>
            <Typography variant="body2" fontWeight={600} whiteSpace="nowrap">
              {formatCurrency(row.total)}
            </Typography>
          </Stack>
          <Box
            sx={{
              height: 3,
              borderRadius: 1,
              bgcolor: 'action.hover',
              mt: 0.5,
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                height: '100%',
                width: `${maxTotal > 0 ? (row.total / maxTotal) * 100 : 0}%`,
                bgcolor: 'error.main',
              }}
            />
          </Box>
        </ListItem>
      ))}
    </List>
  );
}
