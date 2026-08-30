import { useMemo, useState } from 'react';
import { Alert, Box, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { getInvestTransacoes } from '../../data/queries/investimentos';
import { TransactionCard } from '../../components/TransactionCard';
import { formatCurrency } from '../../theme/format';

const TIPOS = ['Todos', 'Aquisição inicial', 'Reforço', 'Amortização/venda', 'Juros recebidos'] as const;

interface InvestTransacoesTabProps {
  produtosDisponiveis: string[];
  anosDisponiveis: number[];
}

/** Réplica da tab "📋 Transacções" de investments.py — get_invest_transactions filtrado por produto/tipo/ano. */
export function InvestTransacoesTab({ produtosDisponiveis, anosDisponiveis }: InvestTransacoesTabProps) {
  const [produto, setProduto] = useState('Todos');
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]>('Todos');
  const [ano, setAno] = useState<number | ''>('');

  const { transacoes, erro } = useMemo(() => {
    try {
      return {
        transacoes: getInvestTransacoes({
          investimento: produto !== 'Todos' ? produto : undefined,
          tipo: tipo !== 'Todos' ? tipo : undefined,
          ano: ano || undefined,
        }),
        erro: null as string | null,
      };
    } catch (err) {
      return {
        transacoes: [],
        erro: err instanceof Error ? err.message : 'Não foi possível pesquisar transações de investimento.',
      };
    }
  }, [produto, tipo, ano]);

  const total = transacoes.reduce((s, t) => s + t.valor, 0);

  return (
    <Box>
      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap mb={2}>
        <TextField
          select
          size="small"
          label="Produto"
          value={produto}
          onChange={(e) => setProduto(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="Todos">Todos</MenuItem>
          {produtosDisponiveis.map((p) => (
            <MenuItem key={p} value={p}>
              {p}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as (typeof TIPOS)[number])}
          sx={{ minWidth: 160 }}
        >
          {TIPOS.map((t) => (
            <MenuItem key={t} value={t}>
              {t}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Ano"
          value={ano}
          onChange={(e) => setAno(e.target.value === '' ? '' : Number(e.target.value))}
          sx={{ minWidth: 100 }}
        >
          <MenuItem value="">Todos</MenuItem>
          {anosDisponiveis.map((a) => (
            <MenuItem key={a} value={a}>
              {a}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {erro && <Alert severity="warning">{erro}</Alert>}

      {!erro && (
        <>
          <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
            <strong>{transacoes.length}</strong> transações · Total: <strong>{formatCurrency(total)}</strong>
          </Typography>
          {transacoes.length === 0 ? (
            <Alert severity="info">Sem transações para os filtros selecionados.</Alert>
          ) : (
            <Stack spacing={1}>
              {transacoes.map((t, i) => (
                <TransactionCard
                  key={`${t.investimento}-${t.data}-${i}`}
                  transacao={{
                    id: i,
                    data: t.data,
                    categoria: t.investimento,
                    grupo: t.tipo,
                    tipo:
                      t.tipo === 'Amortização/venda' || t.tipo === 'Juros recebidos' ? 'Receita' : 'Despesa',
                    montante: t.valor,
                    comentario: t.observacoes,
                    modo: null,
                    categoriaOriginal: null,
                    isPoupanca: false,
                    isControlo: false,
                    isImobiliario: false,
                  }}
                />
              ))}
            </Stack>
          )}
        </>
      )}
    </Box>
  );
}
