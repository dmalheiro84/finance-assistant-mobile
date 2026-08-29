import { AppBar, Box, Chip, IconButton, Toolbar, Tooltip, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import { useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { useFinanceData } from '../data/DataContext';
import { formatDateTime } from '../theme/format';

/** Cabeçalho fixo: título, indicador de frescura e botão de atualização. */
export function Header() {
  const { authEnabled, isAuthenticated } = useAuth();
  const { syncedAt, source, isOffline, refreshFromOneDrive } = useFinanceData();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const canSyncOneDrive = authEnabled && isAuthenticated;

  const handleRefresh = async () => {
    if (!canSyncOneDrive) return;
    setIsRefreshing(true);
    try {
      await refreshFromOneDrive();
    } finally {
      setIsRefreshing(false);
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

        <Box display={{ xs: 'none', sm: 'block' }}>
          <Typography variant="body2">
            {syncedAt
              ? `Dados de ${formatDateTime(syncedAt)}${source === 'ficheiro-local' ? ' (ficheiro local)' : ''}`
              : 'Sem dados carregados'}
          </Typography>
        </Box>

        {canSyncOneDrive && (
          <Tooltip title="Actualizar dados">
            <span>
              <IconButton
                color="inherit"
                onClick={() => void handleRefresh()}
                disabled={isRefreshing}
                aria-label="Actualizar dados"
              >
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Toolbar>
    </AppBar>
  );
}
