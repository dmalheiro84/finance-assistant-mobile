import { useMemo } from 'react';
import { Alert, Box, Stack, Typography } from '@mui/material';
import { useFinanceData } from '../data/DataContext';
import { getFireTrajectory } from '../data/queries/fire';
import { KpiCard } from '../components/KpiCard';
import { FireTrajectoryChart } from '../components/FireTrajectoryChart';
import { formatCurrency, formatPercent } from '../theme/format';

/**
 * FIRE: trajetória e taxa de cobertura de despesas pessoais por
 * rendimento passivo (Barista FIRE). Inclui o rendimento líquido do
 * imobiliário de arrendamento — ver src/data/queries/fire.ts.
 */
export function Fire() {
  const { schema } = useFinanceData();
  const anoCorrente = new Date().getFullYear();

  const { trajetoria, erro } = useMemo(() => {
    try {
      return { trajetoria: getFireTrajectory(), erro: null as string | null };
    } catch (err) {
      return {
        trajetoria: [],
        erro: err instanceof Error ? err.message : 'Não foi possível calcular o FIRE.',
      };
    }
    // `schema` não é lido diretamente, mas recalcula quando uma base
    // diferente é importada (as queries leem do motor sql.js global).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema]);

  const anoAtual = trajetoria.find((linha) => linha.ano === anoCorrente) ?? trajetoria.at(-1) ?? null;

  return (
    <Box p={2} pb={4}>
      <Typography variant="h5" component="h2" fontWeight={700} gutterBottom>
        FIRE
      </Typography>

      {erro && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Não foi possível calcular o FIRE desta base de dados: {erro}
        </Alert>
      )}

      {anoAtual && (
        <>
          <Typography variant="caption" color="text.secondary" display="block" mb={2}>
            Rendimento passivo = imobiliário de arrendamento (líquido, "Acertos" tratados como
            abatimento de despesa, nunca receita) + R.Investimentos. Despesas = despesas pessoais
            (exclui imobiliário, poupança e controlo).
          </Typography>

          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mb={3}>
            <KpiCard
              label={`Taxa de cobertura ${anoAtual.ano}`}
              value={formatPercent(anoAtual.taxaCobertura)}
              color={anoAtual.taxaCobertura >= 100 ? 'success.main' : 'text.primary'}
              tooltip="Rendimento passivo ÷ despesas pessoais do ano. 100% = Barista FIRE atingido."
            />
            <KpiCard
              label={`Rendimento passivo ${anoAtual.ano}`}
              value={formatCurrency(anoAtual.rendimentoPassivo)}
              tooltip="Imobiliário de arrendamento (líquido) + R.Investimentos."
            />
            <KpiCard
              label={`Despesas pessoais ${anoAtual.ano}`}
              value={formatCurrency(anoAtual.despesasPessoais)}
            />
          </Stack>

          <Typography variant="h6" component="h3" gutterBottom>
            Trajetória
          </Typography>
          <Box mb={1}>
            <FireTrajectoryChart data={trajetoria} />
          </Box>
          <Typography variant="caption" color="text.secondary">
            {anoCorrente} é um ano parcial (dados até à última importação) — a taxa de cobertura
            tende a subir até ao fecho do ano.
          </Typography>
        </>
      )}
    </Box>
  );
}
