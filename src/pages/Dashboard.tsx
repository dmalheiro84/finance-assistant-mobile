import { useMemo, useState } from 'react';
import { Alert, Box, Button, Collapse, Stack, Typography } from '@mui/material';
import { useFinanceData } from '../data/DataContext';
import { getMonthlyEvolution, getYearSummary } from '../data/queries/dashboard';
import { KpiCard } from '../components/KpiCard';
import { SchemaPanel } from '../components/SchemaPanel';
import { MonthlyEvolutionChart } from '../components/MonthlyEvolutionChart';
import { formatCurrency, formatMonthLabel } from '../theme/format';

/**
 * Visão Geral: receitas/despesas/saldo do ano corrente + evolução
 * mensal. Inclui imobiliário (Philosophy B) e exclui sempre
 * is_poupanca=1 e is_controlo=1 — ver src/data/queries/dashboard.ts.
 */
export function Dashboard() {
  const { schema } = useFinanceData();
  const anoCorrente = new Date().getFullYear();
  const [showSchema, setShowSchema] = useState(false);

  const { summary, chartData, erro } = useMemo(() => {
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
        erro: null as string | null,
      };
    } catch (err) {
      return {
        summary: null,
        chartData: [],
        erro:
          err instanceof Error
            ? err.message
            : 'Não foi possível calcular os KPIs a partir desta base de dados.',
      };
    }
    // Recalcula sempre que uma base diferente é carregada (schema muda).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema, anoCorrente]);

  return (
    <Box p={2} pb={4}>
      <Typography variant="h5" component="h2" fontWeight={700} gutterBottom>
        Visão Geral
      </Typography>

      {erro && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Não foi possível calcular os KPIs desta base de dados: {erro}
        </Alert>
      )}

      {summary && (
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mb={3}>
          <KpiCard
            label={`Receitas ${anoCorrente}`}
            value={formatCurrency(summary.receitas)}
            color="success.main"
            tooltip="Inclui imobiliário; exclui poupança (is_poupanca) e movimentos de controlo (is_controlo)."
          />
          <KpiCard
            label={`Despesas ${anoCorrente}`}
            value={formatCurrency(summary.despesas)}
            color="error.main"
            tooltip="Inclui imobiliário; exclui poupança (is_poupanca) e movimentos de controlo (is_controlo)."
          />
          <KpiCard
            label={`Saldo ${anoCorrente}`}
            value={formatCurrency(summary.saldo)}
            color={summary.saldo >= 0 ? 'success.main' : 'error.main'}
            tooltip="Receitas − Despesas do ano corrente."
          />
        </Stack>
      )}

      <Typography variant="h6" component="h3" gutterBottom>
        Evolução mensal
      </Typography>
      <Box mb={3}>
        <MonthlyEvolutionChart data={chartData} />
      </Box>

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
