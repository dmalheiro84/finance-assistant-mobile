import { useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useFinanceData } from '../data/DataContext';
import { useConfig } from '../data/ConfigContext';
import { useConfigFile } from '../data/ConfigFileContext';
import { getFinancialNetWorth, summarizeRealEstateAndVehicles } from '../data/queries/patrimonio';
import { KpiCard } from '../components/KpiCard';
import { formatCurrency, formatDate } from '../theme/format';

/**
 * Património: ativos financeiros (contas + investimentos, do
 * finance.db) e imóveis/veículos (do finance_config.json, opcional).
 * Nenhuma das duas fontes tem passivos — o total é sempre apresentado
 * como "ativos brutos", nunca como "valor líquido". Ver
 * src/data/queries/patrimonio.ts.
 */
export function Patrimonio() {
  const { schema } = useFinanceData();
  const { config, fileName, syncedAt, error: erroConfig } = useConfig();
  const { triggerImportConfig, isImportingConfig } = useConfigFile();

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

  const patrimonioFisico = useMemo(() => summarizeRealEstateAndVehicles(config), [config]);

  const totalImoveis = patrimonioFisico?.totalImoveis ?? 0;
  const totalVeiculos = patrimonioFisico?.totalVeiculos ?? 0;
  const ativosBrutos = (netWorth?.totalFinanceiro ?? 0) + totalImoveis + totalVeiculos;

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
              Contas e investimentos à data de {formatDate(new Date(netWorth.dataReferencia))}
              {config && ' · imóveis e veículos aos valores do finance_config.json'}.
            </Typography>
          )}

          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mb={2}>
            <KpiCard label="Contas líquidas" value={formatCurrency(netWorth.contasLiquidas)} />
            <KpiCard label="Investimentos" value={formatCurrency(netWorth.investimentos)} />
            <KpiCard
              label="Imóveis"
              value={config ? formatCurrency(totalImoveis) : 'Sem dados de origem'}
              color={config ? 'text.primary' : 'text.disabled'}
            />
            <KpiCard
              label="Veículos"
              value={config ? formatCurrency(totalVeiculos) : 'Sem dados de origem'}
              color={config ? 'text.primary' : 'text.disabled'}
            />
          </Stack>

          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mb={2}>
            <KpiCard
              label="Ativos totais (bruto)"
              value={formatCurrency(ativosBrutos)}
              color="success.main"
              tooltip="Contas + investimentos + imóveis + veículos. Bruto: nenhuma das fontes de dados regista passivos (crédito habitação, financiamento de veículos)."
            />
          </Stack>

          <Alert severity="info" sx={{ mb: 3 }}>
            Nem o finance.db nem o finance_config.json têm crédito habitação, financiamento de
            veículos ou qualquer outro passivo — por isso este é o valor bruto dos ativos, não o
            património líquido real.
          </Alert>

          {!config && (
            <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
              <Stack spacing={1.5} alignItems="flex-start">
                <Typography fontWeight={600}>Imóveis e veículos</Typography>
                <Typography variant="body2" color="text.secondary">
                  Importa o finance_config.json (gerado pela app do computador) para veres aqui os
                  valores de mercado dos imóveis e veículos. É opcional — a app funciona na mesma
                  sem ele.
                </Typography>
                {erroConfig && <Alert severity="error" sx={{ width: '100%' }}>{erroConfig}</Alert>}
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<UploadFileIcon />}
                  onClick={triggerImportConfig}
                  disabled={isImportingConfig}
                >
                  {isImportingConfig ? 'A importar…' : 'Importar finance_config.json'}
                </Button>
              </Stack>
            </Paper>
          )}

          {patrimonioFisico && (
            <>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="h6" component="h3">
                  Imóveis
                </Typography>
                <Button size="small" onClick={triggerImportConfig} disabled={isImportingConfig}>
                  {isImportingConfig ? 'A importar…' : 'Atualizar configuração'}
                </Button>
              </Stack>
              {erroConfig && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {erroConfig}
                </Alert>
              )}

              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Habitação própria
              </Typography>
              <Paper variant="outlined" sx={{ mb: 2 }}>
                <Table size="small">
                  <TableBody>
                    {patrimonioFisico.habitacaoPropria.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2}>
                          <Typography variant="body2" color="text.secondary">
                            Nenhum imóvel classificado como habitação própria.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                    {patrimonioFisico.habitacaoPropria.map((imovel) => (
                      <TableRow key={imovel.chave}>
                        <TableCell>{imovel.nome}</TableCell>
                        <TableCell align="right">{formatCurrency(imovel.valorMercado)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>

              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Imóveis de arrendamento
              </Typography>
              <Paper variant="outlined" sx={{ mb: 3 }}>
                <Table size="small">
                  <TableBody>
                    {patrimonioFisico.imoveisArrendamento.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2}>
                          <Typography variant="body2" color="text.secondary">
                            Nenhum imóvel de arrendamento configurado.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                    {patrimonioFisico.imoveisArrendamento.map((imovel) => (
                      <TableRow key={imovel.chave}>
                        <TableCell>{imovel.nome}</TableCell>
                        <TableCell align="right">{formatCurrency(imovel.valorMercado)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>

              <Typography variant="h6" component="h3" gutterBottom>
                Veículos
              </Typography>
              <Paper variant="outlined" sx={{ mb: 2 }}>
                <Table size="small">
                  <TableBody>
                    {patrimonioFisico.veiculos.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2}>
                          <Typography variant="body2" color="text.secondary">
                            Nenhum veículo configurado.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                    {patrimonioFisico.veiculos.map((veiculo) => (
                      <TableRow key={veiculo.nome}>
                        <TableCell>{veiculo.nome}</TableCell>
                        <TableCell align="right">{formatCurrency(veiculo.valor)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>

              {fileName && syncedAt && (
                <Typography variant="caption" color="text.secondary">
                  Configuração de {fileName}, importada em {formatDate(syncedAt)}.
                </Typography>
              )}
            </>
          )}
        </>
      )}
    </Box>
  );
}
