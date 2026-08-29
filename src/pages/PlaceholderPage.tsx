import { Box, Typography } from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction';

interface PlaceholderPageProps {
  titulo: string;
}

/** Página placeholder para módulos ainda não implementados (Fase 2). */
export function PlaceholderPage({ titulo }: PlaceholderPageProps) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="60dvh"
      textAlign="center"
      gap={2}
      p={3}
    >
      <ConstructionIcon fontSize="large" color="disabled" />
      <Typography variant="h5" component="h2" fontWeight={700}>
        {titulo}
      </Typography>
      <Typography color="text.secondary">Em construção — chega na Fase 2.</Typography>
    </Box>
  );
}
