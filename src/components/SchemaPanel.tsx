import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { TableSchema } from '../data/queries/schema';

interface SchemaPanelProps {
  schema: TableSchema[];
}

/**
 * Mostra o schema real da base de dados carregada (tabelas + colunas) —
 * painel de diagnóstico, útil para escrever as queries dos próximos
 * módulos (Análise, Património, Investimentos, FIRE) sem assumir nomes
 * de tabelas/colunas (ver CLAUDE.md, regra 6).
 */
export function SchemaPanel({ schema }: SchemaPanelProps) {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Schema da base de dados ({schema.length} tabelas)
      </Typography>

      <Stack spacing={1}>
        {schema.map((table) => (
          <Accordion key={table.name} disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography fontWeight={600}>{table.name}</Typography>
                <Chip label={`${table.rowCount} linhas`} size="small" />
                <Chip label={`${table.columns.length} colunas`} size="small" variant="outlined" />
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Coluna</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Chave primária</TableCell>
                    <TableCell>Not null</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {table.columns.map((column) => (
                    <TableRow key={column.name}>
                      <TableCell>{column.name}</TableCell>
                      <TableCell>{column.type || '—'}</TableCell>
                      <TableCell>{column.primaryKey ? 'Sim' : ''}</TableCell>
                      <TableCell>{column.notNull ? 'Sim' : ''}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>
    </Box>
  );
}
