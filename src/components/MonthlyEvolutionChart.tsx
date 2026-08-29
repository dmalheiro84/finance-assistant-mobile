import { Box, Paper, Typography } from '@mui/material';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency } from '../theme/format';

export interface MonthlyEvolutionPoint {
  mes: string;
  receitas: number;
  despesas: number;
}

interface MonthlyEvolutionChartProps {
  data: MonthlyEvolutionPoint[];
}

/** Gráfico de evolução mensal (receitas vs. despesas) — Recharts. */
export function MonthlyEvolutionChart({ data }: MonthlyEvolutionChartProps) {
  if (data.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          Sem dados de evolução mensal para mostrar ainda.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="mes" />
          <YAxis tickFormatter={(value: number) => formatCurrency(value)} width={90} />
          <Tooltip formatter={(value: number) => formatCurrency(value)} />
          <Legend />
          <Line type="monotone" dataKey="receitas" name="Receitas" stroke="#1b6b5a" strokeWidth={2} />
          <Line type="monotone" dataKey="despesas" name="Despesas" stroke="#ba1a1a" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
