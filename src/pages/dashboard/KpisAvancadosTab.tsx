import { useMemo } from 'react';
import { Alert, Box, Stack, Typography } from '@mui/material';
import { getAdvancedKpis, getFixedVsVariableKpi } from '../../data/queries/dashboard';
import { KpiCard } from '../../components/KpiCard';
import { formatCurrency, formatPercent } from '../../theme/format';

interface KpisAvancadosTabProps {
  ano: number;
}

/**
 * Réplica da tab "🎯 KPIs Avançados" de dash_v1.py — get_advanced_kpis +
 * get_fixed_vs_variable(year). Só pessoal (exclui imobiliário,
 * Philosophy B), ao contrário da Visão Geral. Ver
 * src/data/queries/dashboard.ts para o racional exato de cada fórmula —
 * nota em particular que despesas_correntes aqui exclui one-offs do
 * grupo Empresas >10 000€, uma regra diferente da exclusão de
 * "PL - Aquisição" usada em Análise/FIRE.
 */
export function KpisAvancadosTab({ ano }: KpisAvancadosTabProps) {
  const { adv, fv, erro } = useMemo(() => {
    try {
      return {
        adv: getAdvancedKpis(ano),
        fv: getFixedVsVariableKpi(ano),
        erro: null as string | null,
      };
    } catch (err) {
      return {
        adv: null,
        fv: null,
        erro: err instanceof Error ? err.message : 'Não foi possível calcular os KPIs avançados.',
      };
    }
  }, [ano]);

  if (erro || !adv || !fv) {
    return (
      <Alert severity="warning">
        Não foi possível calcular os KPIs avançados desta base de dados: {erro}
      </Alert>
    );
  }

  const alertaHabitacao = adv.racioHabitacao > 30;

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        KPIs de comportamento financeiro pessoal — exclui sempre imobiliário (Philosophy B).
      </Alert>

      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mb={3}>
        <KpiCard
          label="Receitas operacionais"
          value={formatCurrency(adv.receitasOp)}
          tooltip="Vencimentos + rendas + outros. Exclui resgates de poupança e imobiliário."
        />
        <KpiCard
          label="Despesas correntes"
          value={formatCurrency(adv.despesasCorrentes)}
          color="error.main"
          tooltip="Exclui one-offs do grupo Empresas acima de 10 000€. Visão do orçamento real de vida corrente."
        />
        <KpiCard
          label="Taxa de poupança real"
          value={formatPercent(adv.taxaPoupancaReal)}
          color={adv.taxaPoupancaReal >= 0 ? 'success.main' : 'error.main'}
          tooltip="(Receitas operacionais − Despesas correntes) ÷ Receitas operacionais × 100."
        />
        <KpiCard
          label="Custo mensal médio"
          value={formatCurrency(adv.custoMensal)}
          tooltip={`Despesas correntes ÷ ${adv.mesesComDados} ${adv.mesesComDados === 1 ? 'mês com dados' : 'meses com dados'} (não sempre 12).`}
        />
      </Stack>

      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mb={3}>
        <KpiCard
          label="Rácio habitação"
          value={formatPercent(adv.racioHabitacao)}
          color={alertaHabitacao ? 'error.main' : 'success.main'}
          tooltip="Custos de habitação própria ÷ Receitas operacionais × 100. Referência saudável: < 30%."
        />
        <KpiCard
          label="Inflação pessoal"
          value={adv.inflacaoPessoal !== null ? formatPercent(adv.inflacaoPessoal) : '—'}
          color={
            adv.inflacaoPessoal === null
              ? 'text.disabled'
              : adv.inflacaoPessoal > 0
                ? 'error.main'
                : 'success.main'
          }
          tooltip={
            adv.inflacaoPessoal === null
              ? 'Sem ano anterior para comparar.'
              : `Variação das despesas correntes vs ano anterior (${adv.inflacaoModo === 'ytd' ? 'comparação homóloga' : 'ano completo'}).`
          }
        />
        <KpiCard
          label="Despesas fixas"
          value={formatCurrency(fv.fixas)}
          tooltip={`${formatPercent(fv.pctFixas)} do total. Pagamentos previsíveis: rendas, utilidades, seguros, IUC, IMI, etc.`}
        />
        <KpiCard
          label="Despesas variáveis"
          value={formatCurrency(fv.variaveis)}
          tooltip={`${formatPercent(100 - fv.pctFixas)} do total. Pagamentos não previsíveis: alimentação, lazer, manutenções, etc.`}
        />
      </Stack>

      {!fv.anoClassificado && (
        <Alert severity="warning">
          A análise Fixa/Variável só é fiável a partir de 2018 — {ano} entra via ETL legacy sem esta
          classificação.
        </Alert>
      )}

      {alertaHabitacao && (
        <Alert severity="warning" sx={{ mt: fv.anoClassificado ? 0 : 2 }}>
          Rácio de habitação acima do recomendado (30%).
        </Alert>
      )}

      <Typography variant="caption" color="text.disabled" display="block" mt={2}>
        "Autonomia financeira" (meses cobertos por poupança) é calculada no desktop mas não é
        mostrada em nenhuma vista — código morto, não replicado aqui.
      </Typography>
    </Box>
  );
}
