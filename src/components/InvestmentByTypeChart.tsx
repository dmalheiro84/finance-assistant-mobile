import { Box, Paper, Typography } from '@mui/material';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '../theme/format';
import type { InvestmentByType } from '../data/queries/investimentos';

interface InvestmentByTypeChartProps {
  data: InvestmentByType[];
}

/** Gráfico de barras: valor do portfólio por tipologia, do maior para o menor. */
export function InvestmentByTypeChart({ data }: InvestmentByTypeChartProps) {
  if (data.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">Sem dados de investimentos para mostrar.</Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ width: '100%', height: Math.max(260, data.length * 36) }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tickFormatter={(value: number) => formatCurrency(value)} />
          <YAxis type="category" dataKey="tipologia" width={140} />
          <Tooltip formatter={(value: number) => formatCurrency(value)} />
          <Bar dataKey="valor" name="Valor" fill="#1b6b5a" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}
