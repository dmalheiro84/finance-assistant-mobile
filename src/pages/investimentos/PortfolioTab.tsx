import { useMemo, useState } from 'react';
import { Box, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { InvestmentProductSummary, PortfolioTotalReal } from '../../data/queries/investimentos';
import { InvestmentByTypeChart } from '../../components/InvestmentByTypeChart';
import { KpiCard } from '../../components/KpiCard';
import { formatCurrency, formatDate, formatPercent } from '../../theme/format';

type Metrica = 'Capital Investido' | 'Valor Actual' | 'P&L';

interface PortfolioTabProps {
  resumo: InvestmentProductSummary[];
  portfolioReal: PortfolioTotalReal | null;
}

/**
 * Réplica da tab "📊 Portfolio" de investments.py — capital investido,
 * valor actual real (getPortfolioTotalReal, nunca a soma "ingénua" dos
 * valores por produto — ver src/data/queries/investimentos.ts), P&L
 * total, juros. `resumo` já vem filtrado (Estado/Tipologia/Pesquisa) do
 * separador pai, tal como no desktop.
 */
export function PortfolioTab({ resumo, portfolioReal }: PortfolioTabProps) {
  const [metrica, setMetrica] = useState<Metrica>('Capital Investido');

  const totalInvestido = resumo.reduce((s, r) => s + r.totalInvestido, 0);
  const totalAmortizado = resumo.reduce((s, r) => s + r.amortizado, 0);
  const totalJuros = resumo.reduce((s, r) => s + r.juros, 0);
  const totalPl = resumo.reduce((s, r) => s + r.plRealizado, 0);
  const capitalAtivo =
    resumo.filter((r) => r.status === 'Ativo').reduce((s, r) => s + r.totalInvestido, 0) - totalAmortizado;
  const valorAtual = portfolioReal && portfolioReal.total > 0 ? portfolioReal.total : null;
  const plNaoRealizado = valorAtual !== null && capitalAtivo > 0 ? valorAtual - capitalAtivo : null;

  const porTipologia = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const r of resumo) {
      const chave = r.tipologia || '(sem tipologia)';
      mapa.set(chave, (mapa.get(chave) ?? 0) + r.totalInvestido);
    }
    return Array.from(mapa.entries())
      .map(([tipologia, valor]) => ({ tipologia, valor }))
      .sort((a, b) => b.valor - a.valor);
  }, [resumo]);

  const porEstado = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const r of resumo) mapa.set(r.status, (mapa.get(r.status) ?? 0) + r.totalInvestido);
    return Array.from(mapa.entries()).map(([tipologia, valor]) => ({ tipologia, valor }));
  }, [resumo]);

  const chartData = useMemo(() => {
    const metricaChave: Record<Metrica, keyof InvestmentProductSummary> = {
      'Capital Investido': 'totalInvestido',
      'Valor Actual': 'valorAtual',
      'P&L': 'plRealizado',
    };
    const chave = metricaChave[metrica];
    return resumo
      .filter((r) => r[chave] !== null)
      .map((r) => ({ produto: r.investimento, valor: (r[chave] as number) ?? 0 }))
      .sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor))
      .slice(0, 25);
  }, [resumo, metrica]);

  return (
    <Box>
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mb={3}>
        <KpiCard
          label="Capital investido"
          value={formatCurrency(totalInvestido)}
          tooltip="Aquisições iniciais + reforços (ativos + terminados)."
        />
        {valorAtual !== null ? (
          <KpiCard
            label="Valor actual do portfólio"
            value={formatCurrency(valorAtual)}
            color={plNaoRealizado !== null && plNaoRealizado < 0 ? 'error.main' : 'success.main'}
            tooltip={`Soma dos últimos valores individuais de cada produto ativo (${portfolioReal?.data ? formatDate(new Date(portfolioReal.data)) : ''}). Exclui Disponibilidades DO.`}
            delta={
              plNaoRealizado !== null
                ? {
                    label: `${plNaoRealizado >= 0 ? '+' : ''}${formatCurrency(plNaoRealizado)} P&L não realizado`,
                    positive: plNaoRealizado >= 0,
                  }
                : undefined
            }
          />
        ) : (
          <KpiCard
            label="Capital recuperado"
            value={formatCurrency(totalAmortizado)}
            tooltip="Total de amortizações e vendas."
          />
        )}
        <KpiCard
          label="P&L total"
          value={`${totalPl >= 0 ? '+' : ''}${formatCurrency(totalPl)}`}
          color={totalPl >= 0 ? 'success.main' : 'error.main'}
          tooltip="(Valor actual + Amortizado + Juros) − Capital investido."
        />
        <KpiCard label="Juros & dividendos" value={formatCurrency(totalJuros)} />
      </Stack>

      {valorAtual !== null && portfolioReal && Object.keys(portfolioReal.porTipologia).length > 0 && (
        <Box mb={3}>
          <Typography variant="h6" component="h3" gutterBottom>
            Valor actual por tipologia
          </Typography>
          <Stack spacing={0.75}>
            {Object.entries(portfolioReal.porTipologia)
              .sort(([, a], [, b]) => b - a)
              .map(([tip, val]) => {
                const pct = valorAtual > 0 ? (val / valorAtual) * 100 : 0;
                return (
                  <Box key={tip}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption">{tip}</Typography>
                      <Typography variant="caption" fontWeight={600}>
                        {formatCurrency(val)} ({formatPercent(pct)})
                      </Typography>
                    </Stack>
                    <Box sx={{ height: 4, borderRadius: 1, bgcolor: 'action.hover', overflow: 'hidden' }}>
                      <Box sx={{ height: '100%', width: `${Math.min(pct, 100)}%`, bgcolor: 'primary.main' }} />
                    </Box>
                  </Box>
                );
              })}
          </Stack>
        </Box>
      )}

      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h6" component="h3">
          Produtos
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={metrica}
          onChange={(_, v: Metrica | null) => v && setMetrica(v)}
        >
          <ToggleButton value="Capital Investido">Investido</ToggleButton>
          <ToggleButton value="Valor Actual">Actual</ToggleButton>
          <ToggleButton value="P&L">P&amp;L</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <Box sx={{ width: '100%', height: Math.max(260, chartData.length * 26), mb: 3 }}>
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

      <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
        <Paper variant="outlined" sx={{ p: 2, flex: '1 1 260px' }}>
          <Typography variant="subtitle2" gutterBottom>
            Por tipologia (capital investido)
          </Typography>
          <InvestmentByTypeChart data={porTipologia} />
        </Paper>
        <Paper variant="outlined" sx={{ p: 2, flex: '1 1 260px' }}>
          <Typography variant="subtitle2" gutterBottom>
            Por estado (capital investido)
          </Typography>
          <InvestmentByTypeChart data={porEstado} />
        </Paper>
      </Stack>
    </Box>
  );
}
