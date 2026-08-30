import { useMemo } from 'react';
import { Alert, Box, Paper, Typography } from '@mui/material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getInvestAnnualFlow, getInvestPortfolioHistory } from '../../data/queries/investimentos';
import { formatCurrency } from '../../theme/format';

const TIPO_CORES: Record<string, string> = {
  'Aquisição inicial': '#3b5bdb',
  Reforço: '#8b5cf6',
  'Amortização/venda': '#10b981',
  'Juros recebidos': '#f59f00',
};

/**
 * Réplica da tab "📈 Evolução" de investments.py — evolução do portfólio
 * total (lida diretamente da view v_invest_portfolio do finance.db) e
 * fluxo anual por tipo de operação (get_invest_annual_flow).
 */
export function EvolucaoTab() {
  const { historico, fluxo, erro } = useMemo(() => {
    try {
      return {
        historico: getInvestPortfolioHistory(),
        fluxo: getInvestAnnualFlow(),
        erro: null as string | null,
      };
    } catch (err) {
      return {
        historico: [],
        fluxo: [],
        erro: err instanceof Error ? err.message : 'Não foi possível calcular a evolução.',
      };
    }
  }, []);

  const fluxoPorAno = useMemo(() => {
    const mapa = new Map<number, Record<string, number>>();
    for (const row of fluxo) {
      const anoRow = mapa.get(row.ano) ?? {};
      anoRow[row.tipo] = row.total;
      mapa.set(row.ano, anoRow);
    }
    return Array.from(mapa.entries())
      .sort(([a], [b]) => a - b)
      .map(([ano, tipos]) => ({ ano, ...tipos }));
  }, [fluxo]);

  const tiposPresentes = useMemo(
    () => Array.from(new Set(fluxo.map((row) => row.tipo))),
    [fluxo],
  );

  if (erro) return <Alert severity="warning">{erro}</Alert>;

  return (
    <Box>
      <Typography variant="h6" component="h3" gutterBottom>
        Evolução do portfólio total
      </Typography>
      {historico.length === 0 ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          Evolução do portfólio indisponível — sem histórico de valores na base de dados.
        </Alert>
      ) : (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Box sx={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <ComposedChart data={historico} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v: number) => formatCurrency(v)} width={90} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="portfolioTotal"
                  name="Portfólio"
                  stroke="#3b5bdb"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="ragAcumulado"
                  name="RAG acumulado"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      )}

      <Typography variant="h6" component="h3" gutterBottom>
        Fluxo anual por tipo de operação
      </Typography>
      {fluxoPorAno.length === 0 ? (
        <Alert severity="info">Sem transações de investimento para mostrar.</Alert>
      ) : (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Box sx={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={fluxoPorAno} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ano" />
                <YAxis tickFormatter={(v: number) => formatCurrency(v)} width={90} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                {tiposPresentes.map((tipo) => (
                  <Bar key={tipo} dataKey={tipo} name={tipo} fill={TIPO_CORES[tipo] ?? '#6b7280'} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      )}
    </Box>
  );
}
