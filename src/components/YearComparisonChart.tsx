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
import { formatCurrency, formatMonthLabel } from '../theme/format';

interface YearComparisonChartProps {
  data: { mes: number; total1: number | null; total2: number | null }[];
  ano1: number;
  ano2: number;
}

/** Comparação mensal entre dois anos — réplica do gráfico de linhas de get_monthly_by_tipo. */
export function YearComparisonChart({ data, ano1, ano2 }: YearComparisonChartProps) {
  if (data.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">Sem dados para comparar.</Typography>
      </Paper>
    );
  }

  const chartData = data.map((row) => ({
    mes: formatMonthLabel(ano1, row.mes).split('/')[0],
    [ano1]: row.total1 ?? 0,
    [ano2]: row.total2 ?? 0,
  }));

  return (
    <Box sx={{ width: '100%', height: 260 }}>
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="mes" />
          <YAxis tickFormatter={(value: number) => formatCurrency(value)} width={90} />
          <Tooltip formatter={(value: number) => formatCurrency(value)} />
          <Legend />
          <Line type="monotone" dataKey={ano1} stroke="#3b5bdb" strokeWidth={2} />
          <Line type="monotone" dataKey={ano2} stroke="#f59f00" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
