import { useMemo, useState, type ReactNode } from 'react';
import { Alert, Box, Button, Collapse, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useFinanceData } from '../data/DataContext';
import { useConfig } from '../data/ConfigContext';
import {
  getAnnualTrend,
  getAnomalias,
  getBudgetsVsActual,
  getComparisonInfo,
  getDespesasBreakdown,
  getDespesasPorGrupo,
  getKpisDelta,
  getMonthlyEvolution,
  getReceitasBreakdown,
  getSaldoBreakdown,
  getTopCategorias,
  getYearSummary,
  type ComparisonInfo,
  type DespesasBreakdown,
  type ReceitasBreakdown,
  type SaldoBreakdown,
  type YearSummary,
} from '../data/queries/dashboard';
import { KpiCard } from '../components/KpiCard';
import { SchemaPanel } from '../components/SchemaPanel';
import { MonthlyEvolutionChart } from '../components/MonthlyEvolutionChart';
import { DashboardGroupChart } from '../components/DashboardGroupChart';
import { AnnualTrendChart } from '../components/AnnualTrendChart';
import { TopCategoriesList } from '../components/TopCategoriesList';
import { AnomaliesList } from '../components/AnomaliesList';
import { BudgetVsActualList } from '../components/BudgetVsActualList';
import { KpisAvancadosTab } from './dashboard/KpisAvancadosTab';
import { formatCurrency, formatMonthLabel, formatPercent } from '../theme/format';

/**
 * Dashboard: réplica dos 3 separadores de dash_v1.py (desktop) — "Visão
 * Geral" (receitas/despesas/saldo do ano corrente, breakdowns, evolução,
 * inclui sempre imobiliário), "KPIs Avançados" (comportamento financeiro
 * pessoal, exclui imobiliário — Philosophy B) e "Alertas & Orçamento"
 * (anomalias vs média histórica, orçamento vs realizado). Fidelidade
 * estrutural ao desktop: os 3 separadores vivem aqui, mesmo o "KPIs
 * Avançados" sendo pessoal — é onde o desktop os tem, não os
 * reorganizamos por Análise. Ver src/data/queries/dashboard.ts.
 */
export function Dashboard() {
  const { schema } = useFinanceData();
  const { config } = useConfig();
  const anoCorrente = new Date().getFullYear();
  const [showSchema, setShowSchema] = useState(false);
  const [tab, setTab] = useState(0);

  const thresholdAnomalias = config?.anomalyThresholdPct ?? 25;

  const {
    summary,
    chartData,
    receitasBd,
    despesasBd,
    saldoBd,
    comparisonInfo,
    delta,
    grupoData,
    trendData,
    topCategorias,
    anomalias,
    budgetVsActual,
    erro,
  } = useMemo(() => {
    try {
      const yearSummary = getYearSummary(anoCorrente);
      const evolucao = getMonthlyEvolution(anoCorrente);
      return {
        summary: yearSummary,
        chartData: evolucao.map((row) => ({
          mes: formatMonthLabel(row.ano, row.mes),
          receitas: row.receitas,
          despesas: row.despesas,
        })),
        receitasBd: getReceitasBreakdown(anoCorrente),
        despesasBd: getDespesasBreakdown(anoCorrente),
        saldoBd: getSaldoBreakdown(anoCorrente),
        comparisonInfo: getComparisonInfo(anoCorrente),
        delta: getKpisDelta(anoCorrente),
        grupoData: getDespesasPorGrupo(anoCorrente),
        trendData: getAnnualTrend(),
        topCategorias: getTopCategorias(anoCorrente, 10),
        anomalias: getAnomalias(anoCorrente, thresholdAnomalias),
        budgetVsActual: getBudgetsVsActual(anoCorrente, config?.budgets ?? {}),
        erro: null as string | null,
      };
    } catch (err) {
      return {
        summary: null,
        chartData: [],
        receitasBd: null,
        despesasBd: null,
        saldoBd: null,
        comparisonInfo: null,
        delta: null,
        grupoData: [],
        trendData: [],
        topCategorias: [],
        anomalias: [],
        budgetVsActual: [],
        erro:
          err instanceof Error
            ? err.message
            : 'Não foi possível calcular os KPIs a partir desta base de dados.',
      };
    }
    // Recalcula sempre que uma base diferente é carregada (schema muda) ou
    // a configuração (orçamentos/threshold) é actualizada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema, anoCorrente, config, thresholdAnomalias]);

  return (
    <Box p={2} pb={4}>
      <Typography variant="h5" component="h2" fontWeight={700} gutterBottom>
        Dashboard
      </Typography>

      <Tabs value={tab} onChange={(_, value: number) => setTab(value)} sx={{ mb: 2 }}>
        <Tab label="Visão Geral" />
        <Tab label="KPIs Avançados" />
        <Tab label="Alertas & Orçamento" />
      </Tabs>

      {erro && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Não foi possível calcular os KPIs desta base de dados: {erro}
        </Alert>
      )}

      {tab === 1 && <KpisAvancadosTab ano={anoCorrente} />}

      {tab === 2 && !erro && (
        <Stack spacing={3} mb={3}>
          <Box>
            <Typography variant="h6" component="h3" gutterBottom>
              Anomalias — {anoCorrente}
            </Typography>
            <AnomaliesList data={anomalias} thresholdPct={thresholdAnomalias} />
          </Box>
          <Box>
            <Typography variant="h6" component="h3" gutterBottom>
              Orçamento vs realizado — {anoCorrente}
            </Typography>
            <BudgetVsActualList data={budgetVsActual} />
          </Box>
        </Stack>
      )}

      {tab === 0 && summary && receitasBd && despesasBd && saldoBd && comparisonInfo && (
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mb={3}>
          <KpiCard
            label={`Receitas ${anoCorrente}`}
            value={formatCurrency(summary.receitas)}
            color="success.main"
            tooltip={<ReceitasTooltip bd={receitasBd} info={comparisonInfo} ano={anoCorrente} />}
            delta={
              delta
                ? { label: formatSignedCurrency(delta.receitas), positive: delta.receitas >= 0 }
                : undefined
            }
          />
          <KpiCard
            label={`Despesas ${anoCorrente}`}
            value={formatCurrency(summary.despesas)}
            color="error.main"
            tooltip={<DespesasTooltip bd={despesasBd} info={comparisonInfo} ano={anoCorrente} />}
            delta={
              delta
                ? { label: formatSignedCurrency(delta.despesas), positive: delta.despesas <= 0 }
                : undefined
            }
          />
          <KpiCard
            label={`Saldo ${anoCorrente}`}
            value={formatCurrency(summary.saldo)}
            color={summary.saldo >= 0 ? 'success.main' : 'error.main'}
            tooltip={<SaldoTooltip bd={saldoBd} info={comparisonInfo} ano={anoCorrente} />}
            delta={
              delta ? { label: formatSignedCurrency(delta.saldo), positive: delta.saldo >= 0 } : undefined
            }
          />
          <KpiCard
            label={`Taxa de poupança ${anoCorrente}`}
            value={formatPercent(summary.taxaPoupanca)}
            color={summary.taxaPoupanca >= 0 ? 'success.main' : 'error.main'}
            tooltip={<TaxaPoupancaTooltip info={comparisonInfo} ano={anoCorrente} />}
            delta={
              delta
                ? {
                    label: formatSignedPercent(delta.taxaPoupanca),
                    positive: delta.taxaPoupanca >= 0,
                  }
                : undefined
            }
          />
        </Stack>
      )}

      {tab === 0 && !erro && (
        <>
          <Typography variant="h6" component="h3" gutterBottom>
            Evolução mensal
          </Typography>
          <Box mb={3}>
            <MonthlyEvolutionChart data={chartData} />
          </Box>

          <Typography variant="h6" component="h3" gutterBottom>
            Despesas por grupo — {anoCorrente}
          </Typography>
          <Box mb={3}>
            <DashboardGroupChart data={grupoData} />
          </Box>

          <Typography variant="h6" component="h3" gutterBottom>
            Evolução histórica
          </Typography>
          <Box mb={3}>
            <AnnualTrendChart data={trendData} />
          </Box>

          <Typography variant="h6" component="h3" gutterBottom>
            Top 10 categorias — {anoCorrente}
          </Typography>
          <Box mb={3}>
            <TopCategoriesList data={topCategorias} />
          </Box>
        </>
      )}

      {schema && (
        <Box>
          <Button size="small" onClick={() => setShowSchema((visible) => !visible)}>
            {showSchema ? 'Ocultar' : 'Ver'} schema da base de dados
          </Button>
          <Collapse in={showSchema}>
            <Box mt={2}>
              <SchemaPanel schema={schema} />
            </Box>
          </Collapse>
        </Box>
      )}
    </Box>
  );
}

function formatSignedCurrency(value: number): string {
  return `${value >= 0 ? '+' : ''}${formatCurrency(value)}`;
}

function formatSignedPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${formatPercent(value)}`;
}

/** Réplica de comparison_help(): texto da comparação homóloga (YTD) ou ano completo. */
function comparisonText(
  info: ComparisonInfo,
  ano: number,
  key: keyof YearSummary,
  formatter: (v: number) => string = formatCurrency,
): string {
  if (info.mode === 'no_prev' || !info.prevFull) {
    return 'Sem ano anterior na base de dados para comparar.';
  }
  if (info.mode === 'full') {
    return `Ano anterior (${ano - 1}): ${formatter(info.prevFull[key])}`;
  }
  return `Mesmo período ${ano - 1}: ${formatter(info.prevYtd![key])} · ${ano - 1} completo: ${formatter(info.prevFull[key])}`;
}

function TooltipLine({
  children,
  bold,
  muted,
  italic,
}: {
  children: ReactNode;
  bold?: boolean;
  muted?: boolean;
  italic?: boolean;
}) {
  return (
    <Typography
      variant="caption"
      display="block"
      fontWeight={bold ? 700 : 400}
      fontStyle={italic ? 'italic' : 'normal'}
      color={muted ? 'text.secondary' : 'inherit'}
    >
      {children}
    </Typography>
  );
}

function ReceitasTooltip({
  bd,
  info,
  ano,
}: {
  bd: ReceitasBreakdown;
  info: ComparisonInfo;
  ano: number;
}) {
  return (
    <Box sx={{ maxWidth: 260 }}>
      <TooltipLine bold>Receitas totais (pessoal + imobiliário, sem acertos)</TooltipLine>
      <TooltipLine>• Cash flow pessoal: {formatCurrency(bd.pessoal)}</TooltipLine>
      {bd.rendasPuras > 0 && (
        <TooltipLine>• Rendas puras imob (5L/7D/7E): {formatCurrency(bd.rendasPuras)}</TooltipLine>
      )}
      {bd.acertos > 0 && (
        <TooltipLine italic>
          Acertos ({formatCurrency(bd.acertos)}) abatem à despesa, não somam aqui.
        </TooltipLine>
      )}
      {bd.resgates > 0 && (
        <TooltipLine>• Resgates de poupança (fora): {formatCurrency(bd.resgates)}</TooltipLine>
      )}
      <TooltipLine bold>
        Total {ano} com acertos e resgates: {formatCurrency(bd.totalBruto)}
      </TooltipLine>
      {bd.controlo > 0 && (
        <TooltipLine muted>
          + {formatCurrency(bd.controlo)} em movimentos de controlo (neutros)
        </TooltipLine>
      )}
      <TooltipLine muted>{comparisonText(info, ano, 'receitas')}</TooltipLine>
    </Box>
  );
}

function DespesasTooltip({
  bd,
  info,
  ano,
}: {
  bd: DespesasBreakdown;
  info: ComparisonInfo;
  ano: number;
}) {
  return (
    <Box sx={{ maxWidth: 260 }}>
      <TooltipLine bold>
        Despesas líquidas totais (pessoal + imobiliário, após reembolsos e acertos)
      </TooltipLine>
      <TooltipLine>• Pessoal bruta: {formatCurrency(bd.pessoalBruta)}</TooltipLine>
      <TooltipLine>• − Reembolsos: −{formatCurrency(bd.reembolsos)}</TooltipLine>
      <TooltipLine>• = Pessoal líquida: {formatCurrency(bd.pessoalLiquida)}</TooltipLine>
      {bd.imobBruta > 0 && (
        <>
          <TooltipLine>• Imobiliário bruta: {formatCurrency(bd.imobBruta)}</TooltipLine>
          <TooltipLine>• − Acertos: −{formatCurrency(bd.acertos)}</TooltipLine>
          <TooltipLine>• = Imobiliário líquida: {formatCurrency(bd.imobLiquida)}</TooltipLine>
        </>
      )}
      {bd.enviosPoupanca > 0 && (
        <TooltipLine muted>
          Envios p/ poupança (fora): {formatCurrency(bd.enviosPoupanca)}
        </TooltipLine>
      )}
      <TooltipLine bold>Total bruto desembolsado {ano}: {formatCurrency(bd.totalBruto)}</TooltipLine>
      {bd.controlo > 0 && (
        <TooltipLine muted>
          + {formatCurrency(bd.controlo)} em one-offs via controlo (neutros)
        </TooltipLine>
      )}
      <TooltipLine muted>{comparisonText(info, ano, 'despesas')}</TooltipLine>
    </Box>
  );
}

function SaldoTooltip({ bd, info, ano }: { bd: SaldoBreakdown; info: ComparisonInfo; ano: number }) {
  return (
    <Box sx={{ maxWidth: 260 }}>
      <TooltipLine bold>Saldo total (pessoal + imobiliário)</TooltipLine>
      <TooltipLine>• Saldo pessoal: {formatCurrency(bd.saldoPessoal)}</TooltipLine>
      {(bd.rendasPuras > 0 || bd.imobBruta > 0) && (
        <TooltipLine>
          • Saldo imobiliário: {formatCurrency(bd.saldoImob)} ({formatCurrency(bd.rendasPuras + bd.acertos)}{' '}
          rendas+acertos − {formatCurrency(bd.imobBruta)} custos brutos)
        </TooltipLine>
      )}
      <TooltipLine muted italic>
        Cálculo: receitas brutas totais (com acertos) − despesas brutas totais. Difere da
        subtracção directa dos dois cards porque reembolsos/acertos entram matematicamente dos
        dois lados.
      </TooltipLine>
      <TooltipLine muted>{comparisonText(info, ano, 'saldo')}</TooltipLine>
    </Box>
  );
}

function TaxaPoupancaTooltip({ info, ano }: { info: ComparisonInfo; ano: number }) {
  return (
    <Box sx={{ maxWidth: 260 }}>
      <TooltipLine>(Receitas totais − Despesas totais brutas) ÷ Receitas mostradas × 100</TooltipLine>
      <TooltipLine muted>{comparisonText(info, ano, 'taxaPoupanca', formatPercent)}</TooltipLine>
    </Box>
  );
}
