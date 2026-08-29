import { Box, Stack, Typography } from '@mui/material';
import { useFinanceData } from '../data/DataContext';
import { KpiCard } from '../components/KpiCard';
import { SchemaPanel } from '../components/SchemaPanel';
import { MonthlyEvolutionChart } from '../components/MonthlyEvolutionChart';

/**
 * Visão Geral: 2–3 KPIs do ano corrente + gráfico de evolução mensal.
 *
 * Os KPIs ainda mostram "—" porque as queries reais (src/data/queries/
 * dashboard.ts) dependem de confirmar os nomes de tabelas/colunas no
 * schema real — ver SchemaPanel abaixo (CLAUDE.md, regra 6).
 */
export function Dashboard() {
  const { schema } = useFinanceData();
  const anoCorrente = new Date().getFullYear();

  return (
    <Box p={2} pb={4}>
      <Typography variant="h5" component="h2" fontWeight={700} gutterBottom>
        Visão Geral
      </Typography>

      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mb={3}>
        <KpiCard
          label={`Receitas ${anoCorrente}`}
          value="—"
          tooltip="Inclui imobiliário; exclui poupança e movimentos de controlo."
        />
        <KpiCard
          label={`Despesas ${anoCorrente}`}
          value="—"
          tooltip="Inclui imobiliário; exclui poupança e movimentos de controlo."
        />
        <KpiCard
          label={`Saldo ${anoCorrente}`}
          value="—"
          tooltip="Receitas − Despesas do ano corrente."
        />
      </Stack>

      <Typography variant="h6" component="h3" gutterBottom>
        Evolução mensal
      </Typography>
      <Box mb={3}>
        <MonthlyEvolutionChart data={[]} />
      </Box>

      {schema && <SchemaPanel schema={schema} />}
    </Box>
  );
}
