import { Box, Paper, Typography } from '@mui/material';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency } from '../theme/format';
import type { AnnualTrendRow } from '../data/queries/dashboard';

interface AnnualTrendChartProps {
  data: AnnualTrendRow[];
}

/** Evolução histórica anual (receitas/despesas/saldo) — Recharts, réplica de chart_historical_area. */
export function AnnualTrendChart({ data }: AnnualTrendChartProps) {
  if (data.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">Sem dados históricos para mostrar ainda.</Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ width: '100%', height: 260 }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="ano" />
          <YAxis tickFormatter={(value: number) => formatCurrency(value)} width={90} />
          <Tooltip formatter={(value: number) => formatCurrency(value)} />
          <Legend />
          <Area
            type="monotone"
            dataKey="receitas"
            name="Receitas"
            stroke="#1b6b5a"
            fill="#1b6b5a"
            fillOpacity={0.12}
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="despesas"
            name="Despesas"
            stroke="#ba1a1a"
            fill="#ba1a1a"
            fillOpacity={0.12}
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="saldo"
            name="Saldo"
            stroke="#3b5bdb"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
}
