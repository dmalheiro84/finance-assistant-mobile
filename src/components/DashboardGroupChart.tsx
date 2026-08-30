import { Box, Paper, Typography } from '@mui/material';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '../theme/format';
import type { GrupoDespesa } from '../data/queries/dashboard';

interface DashboardGroupChartProps {
  data: GrupoDespesa[];
}

/**
 * Despesas por grupo principal (Visão Geral, inclui imobiliário). O
 * desktop usa um donut; em ecrã estreito uma lista de barras horizontais
 * lê-se melhor do que uma coroa com 6-10 fatias e legendas sobrepostas.
 */
export function DashboardGroupChart({ data }: DashboardGroupChartProps) {
  if (data.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">Sem despesas para mostrar neste ano.</Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ width: '100%', height: Math.max(220, data.length * 36) }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tickFormatter={(value: number) => formatCurrency(value)} />
          <YAxis type="category" dataKey="grupo" width={110} />
          <Tooltip formatter={(value: number) => formatCurrency(value)} />
          <Bar dataKey="total" name="Despesas" fill="#ba1a1a" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}
