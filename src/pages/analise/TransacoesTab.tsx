import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import {
  getGruposTransacoes,
  getTransacoes,
  type TipoTransacoes,
} from '../../data/queries/transacoes';
import { TransactionCard } from '../../components/TransactionCard';
import { formatCurrency, formatMonthLabel } from '../../theme/format';

const TIPOS: TipoTransacoes[] = ['Todos', 'Despesas', 'Receitas', 'Controlo'];
const PAGINA = 30;
const LIMITE_TOTAL = 500;

interface TransacoesTabProps {
  anosDisponiveis: number[];
  /** Filtros iniciais vindos de um drill-down noutro separador (Por Grupo). */
  filtroInicial?: { ano?: number; grupo?: string; pesquisa?: string };
}

/**
 * Réplica do separador "📋 Transacções" do desktop (get_transactions) —
 * pesquisa/filtro de movimentos individuais. "Todos" não filtra
 * is_poupanca/is_controlo: o objetivo é deixar ver esses movimentos, não
 * escondê-los. 14 339 transações no total — só carrega até 500 de cada
 * vez (tal como o desktop) e mostra-as em páginas de 30 no ecrã, com
 * "Carregar mais", em vez de as tentar desenhar todas de uma vez.
 */
export function TransacoesTab({ anosDisponiveis, filtroInicial }: TransacoesTabProps) {
  const [ano, setAno] = useState<number | ''>(filtroInicial?.ano ?? '');
  const [mes, setMes] = useState<number | ''>('');
  const [tipo, setTipo] = useState<TipoTransacoes>('Todos');
  const [grupo, setGrupo] = useState<string>(filtroInicial?.grupo ?? 'Todos');
  const [pesquisaInput, setPesquisaInput] = useState(filtroInicial?.pesquisa ?? '');
  const [pesquisa, setPesquisa] = useState(filtroInicial?.pesquisa ?? '');
  const [visiveis, setVisiveis] = useState(PAGINA);

  // Debounce leve da pesquisa de texto para não repetir a query a cada tecla.
  useEffect(() => {
    const timer = setTimeout(() => setPesquisa(pesquisaInput), 300);
    return () => clearTimeout(timer);
  }, [pesquisaInput]);

  const grupos = useMemo(() => {
    // Réplica do desktop: sem ano seleccionado, a lista de grupos fica vazia.
    if (!ano) return [];
    try {
      return getGruposTransacoes(ano, tipo);
    } catch {
      return [];
    }
  }, [ano, tipo]);

  useEffect(() => {
    if (grupo !== 'Todos' && !grupos.includes(grupo)) setGrupo('Todos');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grupos]);

  const { transacoes, erro } = useMemo(() => {
    try {
      return {
        transacoes: getTransacoes({
          ano: ano || undefined,
          mes: mes || undefined,
          grupo: grupo !== 'Todos' ? grupo : undefined,
          tipo,
          pesquisa: pesquisa || undefined,
          limite: LIMITE_TOTAL,
        }),
        erro: null as string | null,
      };
    } catch (err) {
      return {
        transacoes: [],
        erro: err instanceof Error ? err.message : 'Não foi possível pesquisar transações.',
      };
    }
  }, [ano, mes, grupo, tipo, pesquisa]);

  useEffect(() => setVisiveis(PAGINA), [ano, mes, grupo, tipo, pesquisa]);

  const total = transacoes.reduce((soma, t) => soma + t.montante, 0);

  return (
    <Box>
      <Stack spacing={1.5} mb={2}>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <TextField
            select
            size="small"
            label="Ano"
            value={ano}
            onChange={(e) => setAno(e.target.value === '' ? '' : Number(e.target.value))}
            sx={{ minWidth: 110 }}
          >
            <MenuItem value="">Todos</MenuItem>
            {anosDisponiveis.map((a) => (
              <MenuItem key={a} value={a}>
                {a}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Mês"
            value={mes}
            onChange={(e) => setMes(e.target.value === '' ? '' : Number(e.target.value))}
            sx={{ minWidth: 110 }}
          >
            <MenuItem value="">Todos</MenuItem>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <MenuItem key={m} value={m}>
                {formatMonthLabel(2000, m).split('/')[0]}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoTransacoes)}
            sx={{ minWidth: 110 }}
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
            label="Grupo"
            value={grupo}
            onChange={(e) => setGrupo(e.target.value)}
            disabled={grupos.length === 0}
            sx={{ minWidth: 130 }}
          >
            <MenuItem value="Todos">Todos</MenuItem>
            {grupos.map((g) => (
              <MenuItem key={g} value={g}>
                {g}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        <TextField
          size="small"
          label="Pesquisar"
          placeholder="categoria ou comentário"
          value={pesquisaInput}
          onChange={(e) => setPesquisaInput(e.target.value)}
          fullWidth
        />
      </Stack>

      {erro && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {erro}
        </Alert>
      )}

      {!erro && (
        <>
          <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
            <strong>{transacoes.length}</strong> transações
            {transacoes.length === LIMITE_TOTAL && ` (primeiras ${LIMITE_TOTAL} — refina os filtros para ver mais)`}
            {' · Total: '}
            <strong>{formatCurrency(total)}</strong>
          </Typography>

          {transacoes.length === 0 ? (
            <Alert severity="info">Sem transações para os filtros selecionados.</Alert>
          ) : (
            <Stack spacing={1}>
              {transacoes.slice(0, visiveis).map((t) => (
                <TransactionCard key={t.id} transacao={t} />
              ))}
            </Stack>
          )}

          {visiveis < transacoes.length && (
            <Box textAlign="center" mt={2}>
              <Button onClick={() => setVisiveis((v) => v + PAGINA)}>
                Carregar mais ({transacoes.length - visiveis} restantes)
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
