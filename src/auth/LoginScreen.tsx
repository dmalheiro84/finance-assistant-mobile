import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import type { AuthState } from './useAuth';

interface LoginScreenProps {
  auth: AuthState;
}

/** Ecrã de login Microsoft, em PT-PT. Só é usado quando AUTH_ENABLED=true. */
export function LoginScreen({ auth }: LoginScreenProps) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100dvh"
      px={3}
      textAlign="center"
    >
      <Stack spacing={3} alignItems="center" maxWidth={360}>
        <Typography variant="h4" component="h1" fontWeight={700}>
          Finance Assistant
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Inicia sessão com a tua conta Microsoft pessoal para aceder ao teu
          finance.db guardado no OneDrive.
        </Typography>

        {auth.error && (
          <Alert severity="error" sx={{ width: '100%' }}>
            {auth.error}
          </Alert>
        )}

        <Button
          variant="contained"
          size="large"
          startIcon={auth.isLoading ? undefined : <LoginIcon />}
          onClick={() => void auth.login()}
          disabled={auth.isLoading}
          fullWidth
        >
          {auth.isLoading ? <CircularProgress size={24} color="inherit" /> : 'Entrar com a Microsoft'}
        </Button>

        <Typography variant="caption" color="text.secondary">
          Os teus dados nunca saem do OneDrive nem passam por servidores de
          terceiros — apenas o teu dispositivo os descarrega.
        </Typography>
      </Stack>
    </Box>
  );
}
