import { useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  getInvestProductsHistory,
  getInvestTransacoes,
  type InvestmentProductSummary,
} from '../../data/queries/investimentos';
import { TransactionCard } from '../../components/TransactionCard';
import { formatCurrency, formatPercent } from '../../theme/format';

type Metrica = 'Capital Investido' | 'Valor Actual' | 'P&L' | 'Amortizado' | 'Juros';
const METRICAS: Metrica[] = ['Capital Investido', 'Valor Actual', 'P&L', 'Amortizado', 'Juros'];
const CORES = ['#3b5bdb', '#8b5cf6', '#10b981', '#f59f00', '#e64980', '#00acc1'];

interface PorProdutoTabProps {
  resumo: InvestmentProductSummary[];
}

/**
 * Réplica da tab "🔬 Por Produto" de investments.py — drill-down por
 * produto: métrica à escolha, detalhe (status/valor/P&L/rentabilidade),
 * evolução histórica de valor e transações desse produto. Sem seleção,
 * mostra a tabela completa de rentabilidade (aqui: lista compacta).
 */
export function PorProdutoTab({ resumo }: PorProdutoTabProps) {
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [metrica, setMetrica] = useState<Metrica>('Capital Investido');

  const todosProdutos = useMemo(() => resumo.map((r) => r.investimento).sort(), [resumo]);

  const selecionadosData = useMemo(
    () => resumo.filter((r) => selecionados.includes(r.investimento)),
    [resumo, selecionados],
  );

  const historico = useMemo(() => {
    if (selecionados.length === 0) return [];
    try {
      return getInvestProductsHistory(selecionados);
    } catch {
      return [];
    }
  }, [selecionados]);

  const historicoChart = useMemo(() => {
    const porData = new Map<string, Record<string, number>>();
    for (const row of historico) {
      const entrada = porData.get(row.data) ?? {};
      entrada[row.produto] = row.valor;
      porData.set(row.data, entrada);
    }
    return Array.from(porData.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([data, valores]) => ({ data, ...valores }));
  }, [historico]);

  const transacoesSelecionadas = useMemo(() => {
    if (selecionados.length === 0) return [];
    try {
      return selecionados.flatMap((p) => getInvestTransacoes({ investimento: p }));
    } catch {
      return [];
    }
  }, [selecionados]);

  if (resumo.length === 0) {
    return <Alert severity="info">Sem produtos para os filtros seleccionados.</Alert>;
  }

  const metricaChave: Record<Metrica, keyof InvestmentProductSummary> = {
    'Capital Investido': 'totalInvestido',
    'Valor Actual': 'valorAtual',
    'P&L': 'plRealizado',
    Amortizado: 'amortizado',
    Juros: 'juros',
  };

  const chartData = selecionadosData
    .filter((r) => r[metricaChave[metrica]] !== null)
    .map((r) => ({ produto: r.investimento, valor: (r[metricaChave[metrica]] as number) ?? 0, status: r.status }))
    .sort((a, b) => b.valor - a.valor);

  return (
    <Box>
      <Stack direction="row" spacing={1} mb={1.5}>
        <Button
          size="small"
          onClick={() =>
            setSelecionados(
              [...resumo]
                .sort((a, b) => b.totalInvestido - a.totalInvestido)
                .slice(0, 5)
                .map((r) => r.investimento),
            )
          }
        >
          Top 5 investidos
        </Button>
        <Button size="small" onClick={() => setSelecionados([])}>
          Limpar
        </Button>
      </Stack>

      <Autocomplete
        multiple
        size="small"
        options={todosProdutos}
        value={selecionados}
        onChange={(_, value) => setSelecionados(value)}
        renderInput={(params) => <TextField {...params} label="Selecciona produtos" placeholder="Escreve para pesquisar…" />}
        sx={{ mb: 2 }}
      />

      {selecionados.length === 0 ? (
        <>
          <Typography variant="body2" color="text.secondary" mb={1}>
            Tabela completa — selecciona produtos acima para drill-down.
          </Typography>
          <Stack spacing={1}>
            {resumo.map((r) => (
              <Paper key={r.investimento} variant="outlined" sx={{ p: 1.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {r.investimento}
                    </Typography>
                    <Typography variant="caption" color={r.status === 'Ativo' ? 'success.main' : 'text.secondary'}>
                      ● {r.status} {r.tipologia && `· ${r.tipologia}`}
                    </Typography>
                  </Box>
                  <Stack alignItems="flex-end">
                    <Typography variant="body2" fontWeight={700} color={r.plRealizado >= 0 ? 'success.main' : 'error.main'}>
                      {r.plRealizado >= 0 ? '+' : ''}
                      {formatCurrency(r.plRealizado)}
                    </Typography>
                    {r.rentabilidadePct !== null && (
                      <Typography variant="caption" color={r.plRealizado >= 0 ? 'success.main' : 'error.main'}>
                        {formatPercent(r.rentabilidadePct)}
                      </Typography>
                    )}
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </>
      ) : (
        <>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={metrica}
            onChange={(_, v: Metrica | null) => v && setMetrica(v)}
            sx={{ mb: 2, flexWrap: 'wrap' }}
          >
            {METRICAS.map((m) => (
              <ToggleButton key={m} value={m}>
                {m}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <Box sx={{ width: '100%', height: Math.max(220, chartData.length * 36), mb: 3 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v: number) => formatCurrency(v)} />
                <YAxis type="category" dataKey="produto" width={110} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="valor" fill="#3b5bdb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>

          <Typography variant="h6" component="h3" gutterBottom>
            Detalhe por produto
          </Typography>
          <Stack spacing={1} mb={3}>
            {selecionadosData.map((r) => (
              <Paper key={r.investimento} variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="body2" fontWeight={600}>
                  {r.investimento}
                </Typography>
                <Typography variant="caption" color={r.status === 'Ativo' ? 'success.main' : 'text.secondary'}>
                  ● {r.status} {r.tipologia && `· ${r.tipologia}`}
                </Typography>
                {r.valorAtual !== null && (
                  <Typography variant="caption" color="primary.main" display="block">
                    Valor actual: {formatCurrency(r.valorAtual)}
                  </Typography>
                )}
                <Typography variant="body2" mt={0.5}>
                  <Box
                    component="span"
                    sx={{ fontWeight: 700, color: r.plRealizado >= 0 ? 'success.main' : 'error.main' }}
                  >
                    {r.plRealizado >= 0 ? '+' : ''}
                    {formatCurrency(r.plRealizado)}
                  </Box>
                  {r.rentabilidadePct !== null && (
                    <Box component="span" sx={{ color: r.plRealizado >= 0 ? 'success.main' : 'error.main', ml: 0.5 }}>
                      ({formatPercent(r.rentabilidadePct)})
                    </Box>
                  )}
                </Typography>
                {r.plNaoRealizado !== null && (
                  <Typography variant="caption" color="secondary.main" display="block">
                    P&L não realizado: {formatCurrency(r.plNaoRealizado)}
                  </Typography>
                )}
              </Paper>
            ))}
          </Stack>

          {historicoChart.length > 0 && (
            <>
              <Typography variant="h6" component="h3" gutterBottom>
                Evolução histórica de valor
              </Typography>
              <Box sx={{ width: '100%', height: 260, mb: 3 }}>
                <ResponsiveContainer>
                  <LineChart data={historicoChart} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="data" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={(v: number) => formatCurrency(v)} width={90} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend />
                    {selecionados.map((produto, i) => (
                      <Line
                        key={produto}
                        type="monotone"
                        dataKey={produto}
                        stroke={CORES[i % CORES.length]}
                        strokeWidth={2}
                        dot={{ r: 2 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </>
          )}

          <Typography variant="h6" component="h3" gutterBottom>
            Transações dos produtos seleccionados
          </Typography>
          <Stack spacing={1}>
            {transacoesSelecionadas.map((t, i) => (
              <TransactionCard
                key={`${t.investimento}-${t.data}-${i}`}
                transacao={{
                  id: i,
                  data: t.data,
                  categoria: t.investimento,
                  grupo: t.tipo,
                  tipo: t.tipo === 'Amortização/venda' || t.tipo === 'Juros recebidos' ? 'Receita' : 'Despesa',
                  montante: t.valor,
                  comentario: t.observacoes,
                  modo: null,
                  categoriaOriginal: null,
                  isPoupanca: false,
                  isControlo: false,
                  isImobiliario: false,
                }}
              />
            ))}
          </Stack>
        </>
      )}
    </Box>
  );
}
