import { useRef, useState } from 'react';
import { Alert, Box, Button, Chip, Stack, Typography } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useFinanceData } from '../data/DataContext';

/**
 * Carregamento manual do finance.db a partir do dispositivo, usado
 * enquanto a autenticação Microsoft está desativada (sem clientId do
 * Entra ID ainda). Permite testar a app inteira sem login.
 */
export function DevDbLoader() {
  const { loadFromFile, error } = useFinanceData();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    try {
      await loadFromFile(file);
    } finally {
      setIsLoading(false);
      event.target.value = '';
    }
  };

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
      <Stack spacing={3} alignItems="center" maxWidth={380}>
        <Chip label="Modo de desenvolvimento" color="warning" size="small" />
        <Typography variant="h4" component="h1" fontWeight={700}>
          Finance Assistant
        </Typography>
        <Typography variant="body1" color="text.secondary">
          A autenticação Microsoft ainda não está configurada (falta o
          clientId do Entra ID). Carrega o teu ficheiro finance.db
          diretamente do dispositivo para testar a app.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        )}

        <Button
          variant="contained"
          size="large"
          startIcon={<UploadFileIcon />}
          onClick={() => inputRef.current?.click()}
          disabled={isLoading}
          fullWidth
        >
          {isLoading ? 'A carregar…' : 'Carregar ficheiro finance.db'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".db,.sqlite,.sqlite3"
          hidden
          onChange={(event) => void handleFileChange(event)}
        />

        <Typography variant="caption" color="text.secondary">
          O ficheiro fica apenas em cache local (IndexedDB) no teu
          dispositivo — nunca é enviado para nenhum servidor.
        </Typography>
      </Stack>
    </Box>
  );
}
