import { Box, Paper, Stack, Typography } from '@mui/material';
import { formatCurrency } from '../theme/format';
import type { BudgetVsActual } from '../data/queries/dashboard';

interface BudgetVsActualListProps {
  data: BudgetVsActual[];
}

/**
 * Orçamento anual (mensal × 12, de finance_config.json) vs realizado por
 * grupo (get_budgets_vs_actual). Só mostra grupos com orçamento definido
 * — tal como o desktop ("Define orçamentos acima para ver a comparação").
 */
export function BudgetVsActualList({ data }: BudgetVsActualListProps) {
  const comOrcamento = data.filter((row) => row.orcamento > 0);

  if (comOrcamento.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          Sem orçamentos definidos no finance_config.json (campo "budgets") para comparar.
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={1.5}>
      {comOrcamento.map((row) => {
        const pct = row.pctExecucao ?? 0;
        const acimaDoOrcamento = pct > 100;
        return (
          <Box key={row.grupo}>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline">
              <Typography variant="body2">{row.grupo}</Typography>
              <Typography variant="caption" color="text.secondary">
                {formatCurrency(row.realizado)} / {formatCurrency(row.orcamento)}
              </Typography>
            </Stack>
            <Box sx={{ height: 8, borderRadius: 1, bgcolor: 'action.hover', overflow: 'hidden', mt: 0.5 }}>
              <Box
                sx={{
                  height: '100%',
                  width: `${Math.min(pct, 100)}%`,
                  bgcolor: acimaDoOrcamento ? 'error.main' : 'success.main',
                }}
              />
            </Box>
            <Typography
              variant="caption"
              color={acimaDoOrcamento ? 'error.main' : 'text.secondary'}
              display="block"
              mt={0.25}
            >
              {pct.toFixed(0)}% executado
              {acimaDoOrcamento && ` · +${formatCurrency(row.desvio)} acima do orçamento`}
            </Typography>
          </Box>
        );
      })}
    </Stack>
  );
}
