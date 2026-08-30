import { Box, Chip, List, ListItemButton, Paper, Stack, Typography } from '@mui/material';
import { formatCurrency } from '../theme/format';

export interface CategoriaListItem {
  categoria: string;
  grupo: string | null;
  total: number;
  n: number;
  media: number;
}

interface TopCategoriesListProps {
  data: CategoriaListItem[];
  /** Quando definido, cada linha fica clicável (usado no drill-down para Transacções). */
  onSelect?: (item: CategoriaListItem) => void;
}

/**
 * Top categorias — lista compacta em vez da tabela densa do desktop
 * (table_top_categories), mais legível em ecrã estreito. Reutilizada
 * pelo Dashboard (top 10 do ano) e pela Análise "Por Grupo" (top 20
 * filtrado por ano/tipo/grupo).
 */
export function TopCategoriesList({ data, onSelect }: TopCategoriesListProps) {
  if (data.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">Sem categorias para mostrar.</Typography>
      </Paper>
    );
  }

  const maxTotal = Math.max(...data.map((row) => row.total));

  return (
    <List dense disablePadding>
      {data.map((row, index) => {
        const conteudo = (
          <>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1} width="100%">
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
            <Box sx={{ height: 3, borderRadius: 1, bgcolor: 'action.hover', mt: 0.5, overflow: 'hidden', width: '100%' }}>
              <Box
                sx={{
                  height: '100%',
                  width: `${maxTotal > 0 ? (row.total / maxTotal) * 100 : 0}%`,
                  bgcolor: 'error.main',
                }}
              />
            </Box>
          </>
        );

        return onSelect ? (
          <ListItemButton
            key={row.categoria}
            disableGutters
            onClick={() => onSelect(row)}
            sx={{ display: 'block', py: 0.75, px: 0.5, borderRadius: 1 }}
          >
            {conteudo}
          </ListItemButton>
        ) : (
          <Box key={row.categoria} sx={{ display: 'block', py: 0.75 }}>
            {conteudo}
          </Box>
        );
      })}
    </List>
  );
}
