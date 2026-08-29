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
  getInvestmentPortfolio,
  getPortfolioByType,
  type InvestmentProduct,
} from '../data/queries/investimentos';
import { KpiCard } from '../components/KpiCard';
import { InvestmentByTypeChart } from '../components/InvestmentByTypeChart';
import { formatCurrency, formatDate } from '../theme/format';

/**
 * Investimentos: portfólio total (soma dos valores mais recentes de
 * cada produto na data global mais recente) e estado ativo/terminado
 * por produto. Ver src/data/queries/investimentos.ts.
 */
export function Investimentos() {
  const { schema } = useFinanceData();
  const [mostrarTerminados, setMostrarTerminados] = useState(false);

  const { portfolio, porTipologia, erro } = useMemo(() => {
    try {
      return {
        portfolio: getInvestmentPortfolio(),
        porTipologia: getPortfolioByType(),
        erro: null as string | null,
      };
    } catch (err) {
      return {
        portfolio: null,
        porTipologia: [],
        erro: err instanceof Error ? err.message : 'Não foi possível calcular os investimentos.',
      };
    }
    // `schema` não é lido diretamente, mas recalcula quando uma base
    // diferente é importada (as queries leem do motor sql.js global).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema]);

  const produtosPorTipologia = useMemo(() => {
    const mapa = new Map<string, InvestmentProduct[]>();
    if (!portfolio) return mapa;
    for (const produto of portfolio.produtos) {
      if (!mostrarTerminados && produto.estado === 'terminado') continue;
      const chave = produto.tipologia ?? '(sem tipologia)';
      const lista = mapa.get(chave) ?? [];
      lista.push(produto);
      mapa.set(chave, lista);
    }
    return mapa;
  }, [portfolio, mostrarTerminados]);

  return (
    <Box p={2} pb={4}>
      <Typography variant="h5" component="h2" fontWeight={700} gutterBottom>
        Investimentos
      </Typography>

      {erro && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Não foi possível calcular os investimentos desta base de dados: {erro}
        </Alert>
      )}

      {portfolio && (
        <>
          {portfolio.dataReferencia && (
            <Typography variant="caption" color="text.secondary" display="block" mb={2}>
              Valores à data de {formatDate(new Date(portfolio.dataReferencia))} (data global mais
              recente do histórico — não a data mais recente de cada produto individualmente).
            </Typography>
          )}

          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mb={3}>
            <KpiCard label="Portfólio total" value={formatCurrency(portfolio.total)} color="success.main" />
            <KpiCard label="Produtos ativos" value={String(portfolio.totalAtivos)} />
            <KpiCard label="Produtos terminados" value={String(portfolio.totalTerminados)} color="text.disabled" />
          </Stack>

          <Typography variant="h6" component="h3" gutterBottom>
            Por tipologia
          </Typography>
          <Box mb={3}>
            <InvestmentByTypeChart data={porTipologia} />
          </Box>

          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="h6" component="h3">
              Produtos
            </Typography>
            <Chip
              label={mostrarTerminados ? 'A mostrar todos' : 'Só ativos'}
              onClick={() => setMostrarTerminados((v) => !v)}
              size="small"
              variant="outlined"
              clickable
            />
          </Stack>
          <Stack spacing={1}>
            {[...produtosPorTipologia.entries()].map(([tipologia, produtos]) => (
              <Accordion key={tipologia} disableGutters>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ width: '100%', pr: 1 }}
                  >
                    <Typography fontWeight={600}>{tipologia}</Typography>
                    <Typography fontWeight={600}>
                      {formatCurrency(produtos.reduce((soma, p) => soma + p.valor, 0))}
                    </Typography>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <Table size="small">
                    <TableBody>
                      {produtos.map((produto) => (
                        <TableRow key={produto.produto}>
                          <TableCell>{produto.produto}</TableCell>
                          <TableCell>
                            <Chip
                              label={produto.estado === 'ativo' ? 'Ativo' : 'Terminado'}
                              size="small"
                              color={produto.estado === 'ativo' ? 'success' : 'default'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">{formatCurrency(produto.valor)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>
        </>
      )}
    </Box>
  );
}
