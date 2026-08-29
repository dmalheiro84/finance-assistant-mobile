import { Box, Paper, Typography } from '@mui/material';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '../theme/format';
import type { ExpenseByGroup } from '../data/queries/analise';

interface ExpenseByGroupChartProps {
  data: ExpenseByGroup[];
}

/** Gráfico de barras: despesas por grupo principal, ordenado do maior para o menor. */
export function ExpenseByGroupChart({ data }: ExpenseByGroupChartProps) {
  if (data.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">Sem despesas para mostrar neste período.</Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ width: '100%', height: Math.max(260, data.length * 40) }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tickFormatter={(value: number) => formatCurrency(value)} />
          <YAxis type="category" dataKey="grupo" width={110} />
          <Tooltip formatter={(value: number) => formatCurrency(value)} />
          <Bar dataKey="despesas" name="Despesas" fill="#ba1a1a" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}
