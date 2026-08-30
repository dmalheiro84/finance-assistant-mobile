import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { formatCurrency, formatDate } from '../theme/format';
import type { Transacao } from '../data/queries/transacoes';

interface TransactionCardProps {
  transacao: Transacao;
}

/**
 * Cartão compacto de uma transação — usado em vez de linhas de tabela
 * densa (má leitura em ecrã estreito). As flags is_poupanca/is_controlo/
 * is_imobiliario aparecem sempre como chips: o utilizador tem de ver
 * estes movimentos e perceber porque ficam fora dos totais de outros
 * separadores, nunca desaparecerem silenciosamente.
 */
export function TransactionCard({ transacao }: TransactionCardProps) {
  const isReceita = transacao.tipo === 'Receita';
  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {transacao.categoria ?? '—'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {transacao.data ? formatDate(new Date(transacao.data)) : '—'}
            {transacao.grupo ? ` · ${transacao.grupo}` : ''}
          </Typography>
          {transacao.comentario && (
            <Typography variant="caption" color="text.secondary" display="block" noWrap>
              {transacao.comentario}
            </Typography>
          )}
        </Box>
        <Typography
          variant="body2"
          fontWeight={700}
          color={isReceita ? 'success.main' : 'error.main'}
          whiteSpace="nowrap"
        >
          {isReceita ? '+' : '-'}
          {formatCurrency(Math.abs(transacao.montante))}
        </Typography>
      </Stack>
      {(transacao.isPoupanca || transacao.isControlo || transacao.isImobiliario) && (
        <Stack direction="row" spacing={0.5} mt={1} flexWrap="wrap" useFlexGap>
          {transacao.isPoupanca && (
            <Chip label="Poupança" size="small" color="info" variant="outlined" sx={{ height: 20 }} />
          )}
          {transacao.isControlo && (
            <Chip label="Controlo" size="small" color="warning" variant="outlined" sx={{ height: 20 }} />
          )}
          {transacao.isImobiliario && (
            <Chip label="Imobiliário" size="small" color="secondary" variant="outlined" sx={{ height: 20 }} />
          )}
        </Stack>
      )}
    </Paper>
  );
}
