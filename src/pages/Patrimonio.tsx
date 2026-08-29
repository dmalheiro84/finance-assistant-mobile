import { useMemo } from 'react';
import { Alert, Box, Stack, Typography } from '@mui/material';
import { useFinanceData } from '../data/DataContext';
import { getFinancialNetWorth, getRealEstateAndVehicles } from '../data/queries/patrimonio';
import { KpiCard } from '../components/KpiCard';
import { formatCurrency, formatDate } from '../theme/format';

/**
 * Património: valor líquido financeiro, contas líquidas e investimentos.
 * Imóveis e veículos não têm fonte de dados neste finance.db — ver
 * src/data/queries/patrimonio.ts.
 */
export function Patrimonio() {
  const { schema } = useFinanceData();
  // Sempre null neste finance.db — ver src/data/queries/patrimonio.ts.
  const semDadosDeOrigem = getRealEstateAndVehicles() === null;

  const { netWorth, erro } = useMemo(() => {
    try {
      return { netWorth: getFinancialNetWorth(), erro: null as string | null };
    } catch (err) {
      return {
        netWorth: null,
        erro: err instanceof Error ? err.message : 'Não foi possível calcular o património.',
      };
    }
    // `schema` não é lido diretamente, mas recalcula quando uma base
    // diferente é importada (as queries leem do motor sql.js global).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema]);

  return (
    <Box p={2} pb={4}>
      <Typography variant="h5" component="h2" fontWeight={700} gutterBottom>
        Património
      </Typography>

      {erro && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Não foi possível calcular o património desta base de dados: {erro}
        </Alert>
      )}

      {netWorth && (
        <>
          {netWorth.dataReferencia && (
            <Typography variant="caption" color="text.secondary" display="block" mb={2}>
              Valores à data de {formatDate(new Date(netWorth.dataReferencia))} (última data com
              histórico de investimentos).
            </Typography>
          )}

          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mb={2}>
            <KpiCard label="Contas líquidas" value={formatCurrency(netWorth.contasLiquidas)} />
            <KpiCard label="Investimentos" value={formatCurrency(netWorth.investimentos)} />
            <KpiCard
              label="Valor líquido (financeiro)"
              value={formatCurrency(netWorth.valorLiquidoFinanceiro)}
              tooltip="Contas líquidas + investimentos. Não inclui imóveis nem veículos — ver aviso abaixo."
            />
          </Stack>

          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mb={3}>
            <KpiCard
              label="Imóveis"
              value={semDadosDeOrigem ? 'Sem dados de origem' : '—'}
              color="text.disabled"
            />
            <KpiCard
              label="Veículos"
              value={semDadosDeOrigem ? 'Sem dados de origem' : '—'}
              color="text.disabled"
            />
          </Stack>

          <Alert severity="info">
            O finance.db não tem nenhuma tabela nem produto com o valor de imóveis ou veículos
            (Volvo EX30, Renault ESPACE) — só rastreia contas e investimentos financeiros. O "Valor
            líquido" acima é por isso só a parte financeira do património, não o total.
          </Alert>
        </>
      )}
    </Box>
  );
}
