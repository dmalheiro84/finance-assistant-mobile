import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useFinanceData } from '../data/DataContext';
import { useImportFile } from '../data/ImportFileContext';

/**
 * Ecrã de importação do finance.db — fluxo normal da v1 (sem
 * autenticação). Aparece apenas na primeira utilização, ou sempre que
 * não haja nenhuma cópia válida em cache; ver AuthGate. Depois da
 * primeira importação, os dados ficam em IndexedDB e a app abre direto
 * no Dashboard.
 */
export function ImportScreen() {
  const { error } = useFinanceData();
  const { triggerImport, isImporting } = useImportFile();

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
        <Typography variant="h4" component="h1" fontWeight={700}>
          Importar dados
        </Typography>
        <Typography variant="body1" color="text.secondary">
          O ficheiro finance.db é gerado no computador pela app de gestão
          financeira (actualização semanal). Escolhe-o abaixo para
          consultares aqui os teus dados — fica guardado apenas neste
          dispositivo.
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
          onClick={triggerImport}
          disabled={isImporting}
          fullWidth
        >
          {isImporting ? 'A importar…' : 'Escolher ficheiro finance.db'}
        </Button>

        <Typography variant="caption" color="text.secondary">
          O ficheiro nunca é enviado para nenhum servidor — fica apenas em
          cache local (IndexedDB) neste dispositivo.
        </Typography>
      </Stack>
    </Box>
  );
}
