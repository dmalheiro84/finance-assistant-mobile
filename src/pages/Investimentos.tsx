import { useMemo, useState } from 'react';
import { Alert, Autocomplete, Box, Chip, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { useFinanceData } from '../data/DataContext';
import {
  getDisponibilidadesDO,
  getInvestAvailableYears,
  getInvestSummaryByTipologia,
  getInvestTipologias,
  getPortfolioTotalReal,
  type InvestmentStatus,
} from '../data/queries/investimentos';
import { PortfolioTab } from './investimentos/PortfolioTab';
import { EvolucaoTab } from './investimentos/EvolucaoTab';
import { PorProdutoTab } from './investimentos/PorProdutoTab';
import { InvestTransacoesTab } from './investimentos/InvestTransacoesTab';
import { formatCurrency } from '../theme/format';

/**
 * Investimentos: réplica dos 4 separadores de app/views/investments.py —
 * Portfolio, Evolução, Por Produto, Transacções. Filtros globais
 * (Estado/Tipologia/Pesquisa) partilhados por Portfolio e Por Produto,
 * tal como no desktop — Evolução e Transacções têm a sua própria lógica
 * independente. Ver src/data/queries/investimentos.ts para o racional
 * exato de cada fórmula, incluindo a correção ao "Portfólio total" (antes
 * incluía Disponibilidades DO por engano).
 */
export function Investimentos() {
  const { schema } = useFinanceData();
  const [tab, setTab] = useState(0);
  const [estado, setEstado] = useState<'Todos' | InvestmentStatus>('Todos');
  const [tipologiasSel, setTipologiasSel] = useState<string[]>([]);
  const [pesquisa, setPesquisa] = useState('');

  const { tipologiasDisponiveis, anosDisponiveis, resumoBruto, portfolioReal, disponibilidadesDO, erro } =
    useMemo(() => {
      try {
        return {
          tipologiasDisponiveis: getInvestTipologias(),
          anosDisponiveis: getInvestAvailableYears(),
          resumoBruto: getInvestSummaryByTipologia(tipologiasSel.length > 0 ? tipologiasSel : undefined),
          portfolioReal: getPortfolioTotalReal(),
          disponibilidadesDO: getDisponibilidadesDO(),
          erro: null as string | null,
        };
      } catch (err) {
        return {
          tipologiasDisponiveis: [],
          anosDisponiveis: [],
          resumoBruto: [],
          portfolioReal: null,
          disponibilidadesDO: [],
          erro: err instanceof Error ? err.message : 'Não foi possível calcular os investimentos.',
        };
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [schema, tipologiasSel]);

  const resumoFiltrado = useMemo(() => {
    let lista = resumoBruto;
    if (estado !== 'Todos') lista = lista.filter((r) => r.status === estado);
    if (pesquisa) {
      const termo = pesquisa.toLowerCase();
      lista = lista.filter((r) => r.investimento.toLowerCase().includes(termo));
    }
    return lista;
  }, [resumoBruto, estado, pesquisa]);

  const totalDO = disponibilidadesDO.reduce((s, r) => s + r.valor, 0);

  if (erro) {
    return (
      <Box p={2} pb={4}>
        <Typography variant="h5" component="h2" fontWeight={700} gutterBottom>
          Investimentos
        </Typography>
        <Alert severity="warning">{erro}</Alert>
      </Box>
    );
  }

  if (resumoBruto.length === 0) {
    return (
      <Box p={2} pb={4}>
        <Typography variant="h5" component="h2" fontWeight={700} gutterBottom>
          Investimentos
        </Typography>
        <Alert severity="info">Sem dados de investimento nesta base de dados.</Alert>
      </Box>
    );
  }

  return (
    <Box p={2} pb={4}>
      <Typography variant="h5" component="h2" fontWeight={700} gutterBottom>
        Investimentos
      </Typography>

      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap mb={1.5}>
        <TextField
          select
          size="small"
          label="Estado"
          value={estado}
          onChange={(e) => setEstado(e.target.value as 'Todos' | InvestmentStatus)}
          sx={{ minWidth: 110 }}
        >
          <MenuItem value="Todos">Todos</MenuItem>
          <MenuItem value="Ativo">Ativo</MenuItem>
          <MenuItem value="Terminado">Terminado</MenuItem>
        </TextField>
        <Autocomplete
          multiple
          size="small"
          options={tipologiasDisponiveis}
          value={tipologiasSel}
          onChange={(_, value) => setTipologiasSel(value)}
          renderInput={(params) => <TextField {...params} label="Tipologia" placeholder="Todas" />}
          sx={{ minWidth: 200, flex: 1 }}
        />
        <TextField
          size="small"
          label="Pesquisar produto"
          placeholder="ex: NVIDIA, BTC…"
          value={pesquisa}
          onChange={(e) => setPesquisa(e.target.value)}
          sx={{ minWidth: 180 }}
        />
      </Stack>

      {totalDO > 0 && (
        <Alert severity="success" sx={{ mb: 1.5 }} icon={false}>
          💳 Disponibilidades em contas à ordem: <strong>{formatCurrency(totalDO)}</strong> — excluídas dos
          gráficos de investimento.
        </Alert>
      )}

      <Stack direction="row" spacing={1} mb={2}>
        <Chip
          label={`● ${resumoFiltrado.filter((r) => r.status === 'Ativo').length} Ativos`}
          size="small"
          color="success"
          variant="outlined"
        />
        <Chip
          label={`● ${resumoFiltrado.filter((r) => r.status === 'Terminado').length} Terminados`}
          size="small"
          variant="outlined"
        />
        <Typography variant="caption" color="text.secondary" alignSelf="center">
          {resumoFiltrado.length} produtos filtrados
        </Typography>
      </Stack>

      <Tabs
        value={tab}
        onChange={(_, value: number) => setTab(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2 }}
      >
        <Tab label="Portfolio" />
        <Tab label="Evolução" />
        <Tab label="Por Produto" />
        <Tab label="Transacções" />
      </Tabs>

      {tab === 0 && <PortfolioTab resumo={resumoFiltrado} portfolioReal={portfolioReal} />}
      {tab === 1 && <EvolucaoTab />}
      {tab === 2 && <PorProdutoTab resumo={resumoFiltrado} />}
      {tab === 3 && (
        <InvestTransacoesTab
          produtosDisponiveis={resumoFiltrado.map((r) => r.investimento).sort()}
          anosDisponiveis={anosDisponiveis}
        />
      )}
    </Box>
  );
}
