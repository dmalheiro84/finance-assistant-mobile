import { useMemo, useState } from 'react';
import { Alert, Autocomplete, Box, Paper, Stack, TextField, Typography } from '@mui/material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  getPropertyCosts,
  getPropertyPnl,
  getRentalIncome,
  type PropertyPnl,
} from '../../data/queries/patrimonio';
import type { PropertyConfig } from '../../data/configFile';
import { KpiCard } from '../../components/KpiCard';
import { formatCurrency, formatPercent } from '../../theme/format';

interface ImoveisTabProps {
  imoveisConfig: PropertyConfig[];
  anosDisponiveis: number[];
}

const IMOVEL_CORES: Record<string, string> = { PL: '#3b5bdb', '5L': '#10b981', '7D': '#f59f00', '7E': '#8b5cf6' };

/**
 * Réplica da tab "Imóveis → Análise P&L" de patrimonio.py
 * (get_property_pnl) — custos, acertos, rendas e saldo por imóvel
 * (PL/5L/7D/7E). PL fica em "Habitação Própria" (consumo, sem P&L);
 * 5L/7D/7E ficam em "Investimento" (arrendados). Yield bruta = renda ÷
 * valor de mercado configurado — fica "—" sem finance_config.json.
 */
export function ImoveisTab({ imoveisConfig, anosDisponiveis }: ImoveisTabProps) {
  const [anosSel, setAnosSel] = useState<number[]>([]);

  const { pnl, custosPorCategoria, rendasPorAno, erro } = useMemo(() => {
    try {
      const anos = anosSel.length > 0 ? anosSel : undefined;
      return {
        pnl: getPropertyPnl(imoveisConfig, anos),
        custosPorCategoria: getPropertyCosts(anos),
        rendasPorAno: getRentalIncome(anos),
        erro: null as string | null,
      };
    } catch (err) {
      return {
        pnl: [],
        custosPorCategoria: [],
        rendasPorAno: [],
        erro: err instanceof Error ? err.message : 'Não foi possível calcular o P&L dos imóveis.',
      };
    }
  }, [imoveisConfig, anosSel]);

  const habitacao = pnl.filter((r) => r.tipo === 'Habitação Própria');
  const investimento = pnl.filter((r) => r.tipo === 'Investimento');

  const totalCustos = pnl.reduce((s, r) => s + r.custos, 0);
  const totalRendas = pnl.reduce((s, r) => s + r.rendas, 0);
  const saldoInvestimento = investimento.reduce((s, r) => s + r.saldo, 0);
  const comYield = investimento.filter((r) => r.yieldBruta !== null);
  const yieldMedia =
    investimento.length > 0 && totalRendas > 0 && investimento.some((r) => r.valorMercado > 0) && comYield.length > 0
      ? comYield.reduce((s, r) => s + (r.yieldBruta ?? 0), 0) / comYield.length
      : null;

  const custosHabitacaoPorCategoria = useMemo(() => {
    const chavesHab = new Set(habitacao.map((r) => r.imovel));
    const mapa = new Map<string, number>();
    for (const row of custosPorCategoria) {
      if (!chavesHab.has(row.imovel)) continue;
      const nomeCategoria = row.categoria.includes(' - ') ? row.categoria.split(' - ')[1] : row.categoria;
      mapa.set(nomeCategoria as string, (mapa.get(nomeCategoria as string) ?? 0) + row.total);
    }
    return Array.from(mapa.entries())
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total);
  }, [custosPorCategoria, habitacao]);

  const custosVsRendasChart = investimento.map((r) => ({ nome: r.nome, custos: r.custos, rendas: r.rendas }));

  const rendasPorAnoChart = useMemo(() => {
    const porAno = new Map<number, Record<string, number>>();
    for (const row of rendasPorAno) {
      const entrada = porAno.get(row.ano) ?? {};
      entrada[row.categoria] = (entrada[row.categoria] ?? 0) + row.total;
      porAno.set(row.ano, entrada);
    }
    return Array.from(porAno.entries())
      .sort(([a], [b]) => a - b)
      .map(([ano, categorias]) => ({ ano, ...categorias }));
  }, [rendasPorAno]);
  const categoriasRenda = useMemo(() => Array.from(new Set(rendasPorAno.map((r) => r.categoria))), [rendasPorAno]);

  if (erro) return <Alert severity="warning">{erro}</Alert>;
  if (pnl.length === 0) return <Alert severity="info">Sem custos ou rendas de imóveis para os anos selecionados.</Alert>;

  return (
    <Box>
      <Autocomplete
        multiple
        size="small"
        options={anosDisponiveis}
        value={anosSel}
        onChange={(_, value) => setAnosSel(value)}
        getOptionLabel={(a) => String(a)}
        renderInput={(params) => <TextField {...params} label="Filtrar por ano(s)" placeholder="Todos os anos" />}
        sx={{ mb: 2, maxWidth: 320 }}
      />

      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mb={3}>
        <KpiCard label="Total custos" value={formatCurrency(totalCustos)} tooltip="Custos líquidos de todos os imóveis (após acertos)." />
        <KpiCard label="Rendas recebidas" value={formatCurrency(totalRendas)} tooltip="Rendas brutas — acertos abatem aos custos, não somam aqui." />
        <KpiCard
          label="Saldo investimento"
          value={formatCurrency(saldoInvestimento)}
          color={saldoInvestimento >= 0 ? 'success.main' : 'error.main'}
          tooltip="Só dos imóveis arrendados (5L/7D/7E) — habitação própria é consumo, sem P&L."
        />
        <KpiCard
          label="Yield média bruta"
          value={yieldMedia !== null ? formatPercent(yieldMedia) : '—'}
          tooltip="Média da yield bruta (renda ÷ valor de mercado) dos imóveis arrendados. Precisa de finance_config.json com valor_mercado."
        />
      </Stack>

      <Typography variant="h6" component="h3" gutterBottom>
        Detalhe por imóvel
      </Typography>
      <Stack spacing={1} mb={3}>
        {pnl.map((r) => (
          <PropertyPnlCard key={r.imovel} row={r} />
        ))}
      </Stack>

      {habitacao.length > 0 && (
        <Box mb={3}>
          <Typography variant="h6" component="h3" gutterBottom>
            🏠 Habitação própria
          </Typography>
          {habitacao.map((r) => (
            <Typography key={r.imovel} variant="body2" mb={1}>
              {r.nome}: custos{' '}
              <Box component="span" sx={{ color: 'error.main', fontWeight: 700 }}>
                {formatCurrency(r.custos)}
              </Box>
            </Typography>
          ))}
          {custosHabitacaoPorCategoria.length > 0 && (
            <Box sx={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={custosHabitacaoPorCategoria} margin={{ top: 8, right: 16, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="categoria" angle={-30} textAnchor="end" interval={0} tick={{ fontSize: 10 }} height={50} />
                  <YAxis tickFormatter={(v: number) => formatCurrency(v)} width={80} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="total" fill="#3b5bdb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          )}
        </Box>
      )}

      {investimento.length > 0 && (
        <Box mb={2}>
          <Typography variant="h6" component="h3" gutterBottom>
            💰 Imóveis de investimento
          </Typography>
          <Box sx={{ width: '100%', height: 260, mb: 2 }}>
            <ResponsiveContainer>
              <BarChart data={custosVsRendasChart} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" />
                <YAxis tickFormatter={(v: number) => formatCurrency(v)} width={80} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="custos" name="Custos" fill="#e03131" />
                <Bar dataKey="rendas" name="Rendas" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </Box>

          {rendasPorAnoChart.length > 0 && (
            <Box sx={{ width: '100%', height: 260 }}>
              <Typography variant="subtitle2" gutterBottom>
                Rendas por ano (histórico)
              </Typography>
              <ResponsiveContainer>
                <BarChart data={rendasPorAnoChart} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ano" />
                  <YAxis tickFormatter={(v: number) => formatCurrency(v)} width={80} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  {categoriasRenda.map((cat) => (
                    <Bar key={cat} dataKey={cat} stackId="rendas" fill={IMOVEL_CORES[cat.replace(/^R\.Renda /, '').slice(0, 2)] ?? '#6b7280'} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

function PropertyPnlCard({ row }: { row: PropertyPnl }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="body2" fontWeight={600}>
            {row.nome}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.tipo}
          </Typography>
        </Box>
        <Stack alignItems="flex-end">
          <Typography variant="body2" fontWeight={700} color={row.saldo >= 0 ? 'success.main' : 'error.main'}>
            {row.saldo >= 0 ? '+' : ''}
            {formatCurrency(row.saldo)}
          </Typography>
          {row.yieldBruta !== null && (
            <Typography variant="caption" color="text.secondary">
              yield {formatPercent(row.yieldBruta)}
            </Typography>
          )}
        </Stack>
      </Stack>
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mt={0.5}>
        <Typography variant="caption" color="text.secondary">
          Custos brutos: {formatCurrency(row.custosBrutos)}
        </Typography>
        {row.acertos > 0 && (
          <Typography variant="caption" color="text.secondary">
            − Acertos: {formatCurrency(row.acertos)}
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary">
          Custos líquidos: {formatCurrency(row.custos)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Rendas: {formatCurrency(row.rendas)}
        </Typography>
      </Stack>
    </Paper>
  );
}
