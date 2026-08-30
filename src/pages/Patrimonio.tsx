import { useMemo, useState } from 'react';
import { Alert, Box, Button, Stack, Tab, Tabs, Typography } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useFinanceData } from '../data/DataContext';
import { useConfig } from '../data/ConfigContext';
import { useConfigFile } from '../data/ConfigFileContext';
import { summarizeRealEstateAndVehicles } from '../data/queries/patrimonio';
import { getAvailableYears } from '../data/queries/analise';
import { VisaoGlobalTab } from './patrimonio/VisaoGlobalTab';
import { ImoveisTab } from './patrimonio/ImoveisTab';
import { VeiculosTab } from './patrimonio/VeiculosTab';
import { formatDate } from '../theme/format';

/**
 * Património: réplica dos separadores de patrimonio.py — Visão Global,
 * Imóveis (Análise P&L) e Veículos. O separador "Configuração" do
 * desktop é só escrita (editar property_config/veiculos) — fora do
 * âmbito desta app read-only; usa-se antes o fluxo de importação do
 * finance_config.json já existente (ConfigContext/ConfigFileContext).
 * Ver src/data/queries/patrimonio.ts para o racional exato de cada
 * fórmula.
 */
export function Patrimonio() {
  const { schema } = useFinanceData();
  const { config, fileName, syncedAt, error: erroConfig } = useConfig();
  const { triggerImportConfig, isImportingConfig } = useConfigFile();
  const [tab, setTab] = useState(0);

  const patrimonioFisico = useMemo(() => summarizeRealEstateAndVehicles(config), [config]);

  const { anosDisponiveis, erro } = useMemo(() => {
    try {
      return { anosDisponiveis: getAvailableYears(), erro: null as string | null };
    } catch (err) {
      return {
        anosDisponiveis: [],
        erro: err instanceof Error ? err.message : 'Não foi possível calcular o património.',
      };
    }
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

      {!erro && (
        <>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
            <Typography variant="caption" color="text.secondary">
              {config
                ? `Imóveis e veículos aos valores de ${fileName}${syncedAt ? `, importado em ${formatDate(syncedAt)}` : ''}.`
                : 'Sem finance_config.json importado — imóveis e veículos ficam de fora do total.'}
            </Typography>
            <Button
              size="small"
              startIcon={<UploadFileIcon />}
              onClick={triggerImportConfig}
              disabled={isImportingConfig}
            >
              {isImportingConfig ? 'A importar…' : config ? 'Atualizar' : 'Importar'}
            </Button>
          </Stack>
          {erroConfig && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {erroConfig}
            </Alert>
          )}

          <Tabs value={tab} onChange={(_, value: number) => setTab(value)} sx={{ mb: 2 }}>
            <Tab label="Visão Global" />
            <Tab label="Imóveis" />
            <Tab label="Veículos" />
          </Tabs>

          {tab === 0 && <VisaoGlobalTab patrimonioFisico={patrimonioFisico} />}
          {tab === 1 && (
            <ImoveisTab imoveisConfig={config?.imoveis ?? []} anosDisponiveis={anosDisponiveis} />
          )}
          {tab === 2 && <VeiculosTab anosDisponiveis={anosDisponiveis} />}
        </>
      )}
    </Box>
  );
}
