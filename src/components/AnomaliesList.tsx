import { Box, Paper, Stack, Typography, alpha } from '@mui/material';
import { formatCurrency } from '../theme/format';
import type { Anomalia } from '../data/queries/dashboard';

interface AnomaliesListProps {
  data: Anomalia[];
  thresholdPct: number;
}

/**
 * Categorias com desvio significativo vs média histórica (get_anomalies).
 * Lista compacta em vez dos cartões largos do desktop — aumentos (vermelho)
 * antes de reduções (verde), tal como no dash_v1.
 */
export function AnomaliesList({ data, thresholdPct }: AnomaliesListProps) {
  const aumentos = data.filter((row) => row.desvioPct > 0);
  const reducoes = data.filter((row) => row.desvioPct < 0);

  if (data.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="success.main">
          Sem anomalias detectadas neste ano com threshold de {thresholdPct}%.
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="caption" color="text.secondary">
        Categorias com variação superior a {thresholdPct}% vs média histórica e desvio absoluto
        &gt; 100 €.
      </Typography>

      {aumentos.length > 0 && (
        <Stack spacing={1}>
          <Typography variant="subtitle2">⬆ Aumentos ({aumentos.length})</Typography>
          {aumentos.map((row) => (
            <AnomaliaCard key={`${row.categoria}-${row.grupo}`} row={row} positive={false} />
          ))}
        </Stack>
      )}

      {reducoes.length > 0 && (
        <Stack spacing={1}>
          <Typography variant="subtitle2">⬇ Reduções ({reducoes.length})</Typography>
          {reducoes.map((row) => (
            <AnomaliaCard key={`${row.categoria}-${row.grupo}`} row={row} positive />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

function AnomaliaCard({ row, positive }: { row: Anomalia; positive: boolean }) {
  const cor = positive ? 'success.main' : 'error.main';
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 1.5,
        py: 1,
        borderRadius: 2,
        borderLeft: 3,
        borderColor: cor,
        bgcolor: (theme) => alpha(theme.palette[positive ? 'success' : 'error'].main, 0.08),
      }}
    >
      <Stack sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} noWrap>
          {row.categoria}
        </Typography>
        {row.grupo && (
          <Typography variant="caption" color="text.secondary">
            {row.grupo}
          </Typography>
        )}
      </Stack>
      <Stack alignItems="flex-end">
        <Typography variant="body2" fontWeight={700} color={cor}>
          {row.desvioPct >= 0 ? '+' : ''}
          {row.desvioPct.toFixed(0)}%
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {formatCurrency(row.totalAtual)}
        </Typography>
      </Stack>
    </Box>
  );
}
