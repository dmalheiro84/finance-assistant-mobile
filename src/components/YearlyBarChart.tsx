import { Box, Paper, Typography } from '@mui/material';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '../theme/format';

interface YearlyBarChartProps {
  data: { ano: number; valor: number }[];
  cor?: string;
}

/** Barras por ano — evolução histórica de um grupo ou de um total anual (get_group_trend / get_annual_trend). */
export function YearlyBarChart({ data, cor = '#3b5bdb' }: YearlyBarChartProps) {
  if (data.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">Sem dados históricos para mostrar.</Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ width: '100%', height: 240 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="ano" />
          <YAxis tickFormatter={(value: number) => formatCurrency(value)} width={90} />
          <Tooltip formatter={(value: number) => formatCurrency(value)} />
          <Bar dataKey="valor" fill={cor} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}
