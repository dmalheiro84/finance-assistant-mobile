import { useMemo } from 'react';
import { Alert, Box, Paper, Stack, Typography } from '@mui/material';
import {
  getDisponibilidadesPatrimonio,
  getInvestimentosPorTipologia,
  getRendimentoPassivo,
  type RealEstateAndVehicles,
} from '../../data/queries/patrimonio';
import { KpiCard } from '../../components/KpiCard';
import { formatCurrency, formatPercent } from '../../theme/format';

interface VisaoGlobalTabProps {
  patrimonioFisico: RealEstateAndVehicles | null;
}

/**
 * Réplica da tab "Visão Global" de patrimonio.py — total de património
 * (imóveis + investimentos por tipologia + veículos + disponibilidades
 * DO) e rendimento passivo. O desktop mostra um donut + uma lista com os
 * mesmos dados duas vezes; aqui só a lista (evita repetir a mesma
 * informação em dois formatos num ecrã estreito).
 */
export function VisaoGlobalTab({ patrimonioFisico }: VisaoGlobalTabProps) {
  const { investimentos, disponibilidadesDO, erro } = useMemo(() => {
    try {
      return {
        investimentos: getInvestimentosPorTipologia(),
        disponibilidadesDO: getDisponibilidadesPatrimonio(),
        erro: null as string | null,
      };
    } catch (err) {
      return {
        investimentos: [],
        disponibilidadesDO: 0,
        erro: err instanceof Error ? err.message : 'Não foi possível calcular o património.',
      };
    }
  }, []);

  const totalImoveis = patrimonioFisico?.totalImoveis ?? 0;
  const totalVeiculos = patrimonioFisico?.totalVeiculos ?? 0;
  const totalInvestimentos = investimentos.reduce((s, r) => s + r.valor, 0);
  const total = totalImoveis + totalVeiculos + totalInvestimentos + disponibilidadesDO;

  const rendimentoPassivo = useMemo(() => {
    try {
      return getRendimentoPassivo(total);
    } catch {
      return null;
    }
  }, [total]);

  if (erro) return <Alert severity="warning">{erro}</Alert>;

  const alocacao: { icone: string; nome: string; tipo: string; valor: number }[] = [];
  if (patrimonioFisico) {
    for (const im of [...patrimonioFisico.habitacaoPropria, ...patrimonioFisico.imoveisArrendamento]) {
      if (im.valorMercado > 0) alocacao.push({ icone: '🏠', nome: im.nome, tipo: 'Imóvel', valor: im.valorMercado });
    }
  }
  for (const inv of investimentos) {
    if (inv.valor > 0) alocacao.push({ icone: '📈', nome: inv.tipologia, tipo: 'Investimento', valor: inv.valor });
  }
  if (patrimonioFisico) {
    for (const v of patrimonioFisico.veiculos) {
      if (v.valor > 0) alocacao.push({ icone: '🚗', nome: v.nome, tipo: 'Veículo', valor: v.valor });
    }
  }
  if (disponibilidadesDO > 0) {
    alocacao.push({ icone: '💳', nome: 'Disponibilidades DO', tipo: 'Liquidez', valor: disponibilidadesDO });
  }
  alocacao.sort((a, b) => b.valor - a.valor);

  return (
    <Box>
      {!patrimonioFisico && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Importa o finance_config.json para incluíres imóveis e veículos no património total.
        </Alert>
      )}

      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mb={3}>
        <KpiCard label="Património total" value={formatCurrency(total)} color="success.main" />
        <KpiCard
          label="Imóveis"
          value={patrimonioFisico ? formatCurrency(totalImoveis) : 'Sem dados de origem'}
          color={patrimonioFisico ? 'text.primary' : 'text.disabled'}
          tooltip={total > 0 ? `${formatPercent((totalImoveis / total) * 100)} do património total` : undefined}
        />
        <KpiCard
          label="Investimentos"
          value={formatCurrency(totalInvestimentos)}
          tooltip={total > 0 ? `${formatPercent((totalInvestimentos / total) * 100)} do património total` : undefined}
        />
        <KpiCard
          label="Veículos"
          value={patrimonioFisico ? formatCurrency(totalVeiculos) : 'Sem dados de origem'}
          color={patrimonioFisico ? 'text.primary' : 'text.disabled'}
          tooltip={total > 0 ? `${formatPercent((totalVeiculos / total) * 100)} do património total` : undefined}
        />
        <KpiCard
          label="Disponível"
          value={formatCurrency(disponibilidadesDO)}
          tooltip={total > 0 ? `${formatPercent((disponibilidadesDO / total) * 100)} do património total` : undefined}
        />
      </Stack>

      <Alert severity="info" sx={{ mb: 3 }}>
        Nem o finance.db nem o finance_config.json têm crédito habitação, financiamento de veículos ou
        qualquer outro passivo — por isso este é o valor bruto dos ativos, não o património líquido
        real.
      </Alert>

      <Typography variant="h6" component="h3" gutterBottom>
        Alocação de ativos
      </Typography>
      {alocacao.length === 0 ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          Configura valores de imóveis/veículos e importa dados de investimento para veres a
          alocação.
        </Alert>
      ) : (
        <Stack spacing={0.75} mb={3}>
          {alocacao.map((item) => {
            const pct = total > 0 ? (item.valor / total) * 100 : 0;
            return (
              <Box key={`${item.tipo}-${item.nome}`}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography sx={{ width: 20 }}>{item.icone}</Typography>
                  <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap>
                    {item.nome}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.tipo}
                  </Typography>
                  <Typography variant="body2" fontWeight={600} whiteSpace="nowrap">
                    {formatCurrency(item.valor)} ({formatPercent(pct)})
                  </Typography>
                </Stack>
                <Box sx={{ height: 4, borderRadius: 1, bgcolor: 'action.hover', overflow: 'hidden', ml: 3.5 }}>
                  <Box sx={{ height: '100%', width: `${Math.min(pct, 100)}%`, bgcolor: 'primary.main' }} />
                </Box>
              </Box>
            );
          })}
        </Stack>
      )}

      <Typography variant="h6" component="h3" gutterBottom>
        Rendimento passivo
      </Typography>
      {rendimentoPassivo && (
        <>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mb={2}>
            <KpiCard
              label={`Rendas${rendimentoPassivo.ano ? ` (${rendimentoPassivo.ano})` : ''}`}
              value={formatCurrency(rendimentoPassivo.rendas)}
            />
            <KpiCard label="Juros & dividendos" value={formatCurrency(rendimentoPassivo.juros)} />
            <KpiCard
              label="Total passivo/ano"
              value={formatCurrency(rendimentoPassivo.totalPassivo)}
              color="success.main"
              tooltip={`Yield ${formatPercent(rendimentoPassivo.yield)} do património total`}
            />
            <KpiCard
              label="Cobertura despesas"
              value={formatPercent(rendimentoPassivo.coberturaDespesas)}
              color={rendimentoPassivo.coberturaDespesas >= 100 ? 'success.main' : 'text.primary'}
              tooltip="Rendimento passivo ÷ Despesas correntes — FIRE = 100%. Fórmula desta vista usa rendas brutas (com acertos) e não exclui imobiliário das despesas — pode divergir ligeiramente do FIRE, que usa o P&L líquido por imóvel."
            />
          </Stack>
          {rendimentoPassivo.rendasPorImovel.length > 0 && (
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Rendas por imóvel ({rendimentoPassivo.ano}):
              </Typography>
              {rendimentoPassivo.rendasPorImovel.map((r) => (
                <Stack key={r.categoria} direction="row" justifyContent="space-between" py={0.5} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="body2">{r.categoria}</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formatCurrency(r.total)}
                  </Typography>
                </Stack>
              ))}
            </Paper>
          )}
        </>
      )}
    </Box>
  );
}
