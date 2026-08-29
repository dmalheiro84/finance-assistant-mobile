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
import type { FireYearData } from '../data/queries/fire';

interface FireTrajectoryChartProps {
  data: FireYearData[];
}

/** Trajetória FIRE: rendimento passivo vs. despesas pessoais, por ano. */
export function FireTrajectoryChart({ data }: FireTrajectoryChartProps) {
  if (data.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">Sem dados para mostrar a trajetória FIRE.</Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="ano" />
          <YAxis tickFormatter={(value: number) => formatCurrency(value)} width={90} />
          <Tooltip formatter={(value: number) => formatCurrency(value)} />
          <Legend />
          <Line
            type="monotone"
            dataKey="rendimentoPassivo"
            name="Rendimento passivo"
            stroke="#1b6b5a"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="despesasPessoais"
            name="Despesas pessoais"
            stroke="#ba1a1a"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
