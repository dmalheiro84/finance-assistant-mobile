import { useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useFinanceData } from '../data/DataContext';
import {
  getAvailableYears,
  getExpensesByCategory,
  getExpensesByGroup,
  getFixedVariableBreakdown,
} from '../data/queries/analise';
import { PeriodFilter } from '../components/PeriodFilter';
import { ExpenseByGroupChart } from '../components/ExpenseByGroupChart';
import { KpiCard } from '../components/KpiCard';
import { formatCurrency } from '../theme/format';

/**
 * Análise: despesas por grupo/rubrica e breakdown fixo vs. variável.
 * Apenas pessoal — exclui imobiliário (Philosophy B) — e exclui sempre
 * poupança/controlo. Ver src/data/queries/analise.ts.
 */
export function Analise() {
  const { schema } = useFinanceData();
  const anoCorrente = new Date().getFullYear();
  const [anoInicio, setAnoInicio] = useState(anoCorrente);
  const [anoFim, setAnoFim] = useState(anoCorrente);

  const anosDisponiveis = useMemo(() => {
    try {
      return getAvailableYears();
    } catch {
      return [anoCorrente];
    }
    // `schema` não é lido diretamente, mas recalcula quando uma base
    // diferente é importada (a query lê do motor sql.js global).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema, anoCorrente]);

  const { porGrupo, porCategoria, fixoVariavel, erro } = useMemo(() => {
    try {
      return {
        porGrupo: getExpensesByGroup(anoInicio, anoFim),
        porCategoria: getExpensesByCategory(anoInicio, anoFim),
        fixoVariavel: getFixedVariableBreakdown(anoInicio, anoFim),
        erro: null as string | null,
      };
    } catch (err) {
      return {
        porGrupo: [],
        porCategoria: [],
        fixoVariavel: null,
        erro: err instanceof Error ? err.message : 'Não foi possível calcular a análise.',
      };
    }
    // `schema` não é lido diretamente, mas recalcula quando uma base
    // diferente é importada (as queries leem do motor sql.js global).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema, anoInicio, anoFim]);

  const categoriasPorGrupo = useMemo(() => {
    const mapa = new Map<string, { categoria: string; despesas: number }[]>();
    for (const linha of porCategoria) {
      const lista = mapa.get(linha.grupo) ?? [];
      lista.push({ categoria: linha.categoria, despesas: linha.despesas });
      mapa.set(linha.grupo, lista);
    }
    return mapa;
  }, [porCategoria]);

  const totalDespesas = porGrupo.reduce((soma, linha) => soma + linha.despesas, 0);

  return (
    <Box p={2} pb={4}>
      <Typography variant="h5" component="h2" fontWeight={700} gutterBottom>
        Análise
      </Typography>

      <PeriodFilter
        anos={anosDisponiveis}
        anoInicio={anoInicio}
        anoFim={anoFim}
        onChange={(inicio, fim) => {
          setAnoInicio(inicio);
          setAnoFim(fim);
        }}
      />

      {erro && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Não foi possível calcular a análise desta base de dados: {erro}
        </Alert>
      )}

      {!erro && (
        <>
          <Typography variant="h6" component="h3" gutterBottom>
            Despesas por grupo principal
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={1}>
            Apenas pessoal — exclui imobiliário, poupança e movimentos de controlo.
          </Typography>
          <Box mb={3}>
            <ExpenseByGroupChart data={porGrupo} />
          </Box>

          <Typography variant="h6" component="h3" gutterBottom>
            Despesas por rubrica
          </Typography>
          <Stack spacing={1} mb={3}>
            {porGrupo.map((grupo) => {
              const rubricas = categoriasPorGrupo.get(grupo.grupo) ?? [];
              const percentagem = totalDespesas > 0 ? (grupo.despesas / totalDespesas) * 100 : 0;
              return (
                <Accordion key={grupo.grupo} disableGutters>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Stack
                      direction="row"
                      spacing={1.5}
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{ width: '100%', pr: 1 }}
                    >
                      <Typography fontWeight={600}>{grupo.grupo}</Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip label={`${percentagem.toFixed(1)}%`} size="small" variant="outlined" />
                        <Typography fontWeight={600}>{formatCurrency(grupo.despesas)}</Typography>
                      </Stack>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Table size="small">
                      <TableBody>
                        {rubricas.map((rubrica) => (
                          <TableRow key={rubrica.categoria}>
                            <TableCell>{rubrica.categoria}</TableCell>
                            <TableCell align="right">{formatCurrency(rubrica.despesas)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Stack>

          <Typography variant="h6" component="h3" gutterBottom>
            Fixo vs. variável
          </Typography>
          {fixoVariavel && !fixoVariavel.fiavel && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              O período selecionado inclui anos anteriores a 2018, sem classificação fixo/variável
              fiável nos dados de origem. Os valores abaixo são apresentados só a título informativo —
              não os uses para decisões.
            </Alert>
          )}
          {fixoVariavel && (
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mb={2}>
              <KpiCard
                label="Despesas fixas"
                value={formatCurrency(fixoVariavel.fixo)}
                color={fixoVariavel.fiavel ? 'text.primary' : 'text.primary'}
                tooltip="Rubricas marcadas como despesa fixa (is_fixa=1)."
              />
              <KpiCard
                label="Despesas variáveis"
                value={formatCurrency(fixoVariavel.variavel)}
                tooltip="Restantes despesas (is_fixa=0)."
              />
            </Stack>
          )}
        </>
      )}
    </Box>
  );
}
