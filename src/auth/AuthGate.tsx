import type { ReactNode } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from './useAuth';
import { LoginScreen } from './LoginScreen';
import { DevDbLoader } from './DevDbLoader';
import { useFinanceData } from '../data/DataContext';

function CenteredSpinner() {
  return (
    <Box display="flex" alignItems="center" justifyContent="center" minHeight="100dvh">
      <CircularProgress />
    </Box>
  );
}

/**
 * Decide o que mostrar antes da app: login Microsoft (quando a auth está
 * ativa) ou o carregador manual de .db (modo de desenvolvimento, sem
 * autenticação — ver AUTH_ENABLED em src/auth/config.ts).
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const financeData = useFinanceData();

  if (auth.authEnabled) {
    if (auth.isLoading) return <CenteredSpinner />;
    if (!auth.isAuthenticated) return <LoginScreen auth={auth} />;
    return <>{children}</>;
  }

  if (financeData.status === 'a-carregar') return <CenteredSpinner />;
  if (financeData.status === 'pronto') return <>{children}</>;
  return <DevDbLoader />;
}
