import { useMemo, useState } from 'react';
import { Alert, Box, Tab, Tabs, Typography } from '@mui/material';
import { useFinanceData } from '../data/DataContext';
import { getAvailableYears } from '../data/queries/analise';
import { PorGrupoTab } from './analise/PorGrupoTab';
import { PorCategoriaTab } from './analise/PorCategoriaTab';
import { ComparacaoTab } from './analise/ComparacaoTab';
import { TransacoesTab } from './analise/TransacoesTab';
import type { CategoriaListItem } from '../components/TopCategoriesList';

/**
 * Análise: réplica dos 4 separadores de app/views/analysis.py no desktop —
 * Por Grupo, Por Categoria, Comparação de Anos, Transacções. Ver
 * src/data/queries/analise.ts e transacoes.ts para o racional exacto de
 * cada query (fonte de verdade: dmalheiro84/FinanceAssistant — CLAUDE.md).
 */
export function Analise() {
  const { schema } = useFinanceData();
  const anoCorrente = new Date().getFullYear();
  const [tab, setTab] = useState(0);
  const [drillDown, setDrillDown] = useState<{ ano?: number; grupo?: string; pesquisa?: string } | null>(
    null,
  );
  const [drillDownKey, setDrillDownKey] = useState(0);

  const { anosDisponiveis, erro } = useMemo(() => {
    try {
      const anos = getAvailableYears();
      return { anosDisponiveis: anos, erro: null as string | null };
    } catch (err) {
      return {
        anosDisponiveis: [],
        erro: err instanceof Error ? err.message : 'Não foi possível ler os anos disponíveis.',
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema]);

  const handleDrillDown = (item: CategoriaListItem, ano: number) => {
    setDrillDown({ ano, pesquisa: item.categoria });
    setDrillDownKey((k) => k + 1);
    setTab(3);
  };

  if (erro || anosDisponiveis.length === 0) {
    return (
      <Box p={2} pb={4}>
        <Typography variant="h5" component="h2" fontWeight={700} gutterBottom>
          Análise
        </Typography>
        <Alert severity="warning">
          {erro ?? 'Sem dados de transações nesta base de dados.'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={2} pb={4}>
      <Typography variant="h5" component="h2" fontWeight={700} gutterBottom>
        Análise
      </Typography>

      <Tabs
        value={tab}
        onChange={(_, value: number) => setTab(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2 }}
      >
        <Tab label="Por Grupo" />
        <Tab label="Por Categoria" />
        <Tab label="Comparação de Anos" />
        <Tab label="Transacções" />
      </Tabs>

      {tab === 0 && (
        <PorGrupoTab
          anosDisponiveis={anosDisponiveis}
          anoCorrente={anosDisponiveis.includes(anoCorrente) ? anoCorrente : (anosDisponiveis[0] ?? anoCorrente)}
          onDrillDown={handleDrillDown}
        />
      )}
      {tab === 1 && <PorCategoriaTab anosDisponiveis={anosDisponiveis} />}
      {tab === 2 && <ComparacaoTab anosDisponiveis={anosDisponiveis} />}
      {tab === 3 && (
        <TransacoesTab
          key={drillDownKey}
          anosDisponiveis={anosDisponiveis}
          filtroInicial={drillDown ?? undefined}
        />
      )}
    </Box>
  );
}
