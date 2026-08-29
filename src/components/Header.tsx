import { AppBar, Box, Chip, IconButton, Toolbar, Tooltip, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { useFinanceData } from '../data/DataContext';
import { useImportFile } from '../data/ImportFileContext';
import { formatDateTime } from '../theme/format';

const DIAS_PARA_AVISO_DE_DADOS_ANTIGOS = 8;

/** Cabeçalho fixo: título, indicador de frescura e botão de atualização. */
export function Header() {
  const { authEnabled, isAuthenticated } = useAuth();
  const { syncedAt, fileName, isOffline, refreshFromOneDrive } = useFinanceData();
  const { triggerImport, isImporting } = useImportFile();
  const [isSyncing, setIsSyncing] = useState(false);

  const canSyncOneDrive = authEnabled && isAuthenticated;
  const isBusy = isSyncing || isImporting;

  const isStale =
    syncedAt !== null &&
    Date.now() - syncedAt.getTime() > DIAS_PARA_AVISO_DE_DADOS_ANTIGOS * 24 * 60 * 60 * 1000;

  const handleRefresh = async () => {
    if (canSyncOneDrive) {
      setIsSyncing(true);
      try {
        await refreshFromOneDrive();
      } finally {
        setIsSyncing(false);
      }
    } else {
      triggerImport();
    }
  };

  return (
    <AppBar position="sticky" color="primary" enableColorOnDark>
      <Toolbar sx={{ gap: 1 }}>
        <Typography variant="h6" component="h1" sx={{ flexGrow: 1, fontWeight: 700 }}>
          Finance Assistant
        </Typography>

        {isOffline && (
          <Tooltip title="Sem ligação — a mostrar a última cópia em cache">
            <Chip
              icon={<WifiOffIcon />}
              label="Offline"
              size="small"
              color="warning"
              sx={{ color: 'inherit' }}
            />
          </Tooltip>
        )}

        {isStale && (
          <Tooltip title="Dados com mais de 8 dias — considera importar uma versão mais recente do finance.db.">
            <WarningAmberIcon fontSize="small" sx={{ opacity: 0.85 }} />
          </Tooltip>
        )}

        <Box display={{ xs: 'none', sm: 'block' }}>
          <Typography variant="body2">
            {syncedAt
              ? `Dados de ${formatDateTime(syncedAt)}${fileName ? ` · ${fileName}` : ''}`
              : 'Sem dados carregados'}
          </Typography>
        </Box>

        <Tooltip title={canSyncOneDrive ? 'Actualizar dados' : 'Importar nova versão do finance.db'}>
          <span>
            <IconButton
              color="inherit"
              onClick={() => void handleRefresh()}
              disabled={isBusy}
              aria-label="Actualizar dados"
            >
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}
