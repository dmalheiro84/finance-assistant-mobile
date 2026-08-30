import { useMemo, useState } from 'react';
import { Alert, Box, MenuItem, Stack, TextField } from '@mui/material';
import { getGrupos, getMonthlyComparison } from '../../data/queries/analise';
import { YearComparisonChart } from '../../components/YearComparisonChart';
import { KpiCard } from '../../components/KpiCard';
import { formatCurrency, formatPercent } from '../../theme/format';

const TIPOS = ['Despesas', 'Receitas'] as const;

interface ComparacaoTabProps {
  anosDisponiveis: number[];
}

/** Réplica do separador "🔄 Comparação de Anos" do desktop (get_monthly_by_tipo). */
export function ComparacaoTab({ anosDisponiveis }: ComparacaoTabProps) {
  const [ano1, setAno1] = useState(anosDisponiveis[1] ?? anosDisponiveis[0] ?? 0);
  const [ano2, setAno2] = useState(anosDisponiveis[0] ?? 0);
  const [tipo, setTipo] = useState<'Despesas' | 'Receitas'>('Despesas');
  const [grupo, setGrupo] = useState('Todos');

  const grupos = useMemo(() => {
    try {
      return getGrupos(ano1, tipo);
    } catch {
      return [];
    }
  }, [ano1, tipo]);

  if (anosDisponiveis.length < 2) {
    return <Alert severity="info">Precisas de pelo menos 2 anos de dados para comparar.</Alert>;
  }

  if (ano1 === ano2) {
    return (
      <Box>
        <ComparacaoFiltros
          anosDisponiveis={anosDisponiveis}
          ano1={ano1}
          ano2={ano2}
          tipo={tipo}
          grupo={grupo}
          grupos={grupos}
          onAno1={setAno1}
          onAno2={setAno2}
          onTipo={(t) => {
            setTipo(t);
            setGrupo('Todos');
          }}
          onGrupo={setGrupo}
        />
        <Alert severity="info">Seleciona dois anos diferentes.</Alert>
      </Box>
    );
  }

  return (
    <ComparacaoConteudo
      anosDisponiveis={anosDisponiveis}
      ano1={ano1}
      ano2={ano2}
      tipo={tipo}
      grupo={grupo}
      grupos={grupos}
      onAno1={setAno1}
      onAno2={setAno2}
      onTipo={(t) => {
        setTipo(t);
        setGrupo('Todos');
      }}
      onGrupo={setGrupo}
    />
  );
}

interface FiltrosProps {
  anosDisponiveis: number[];
  ano1: number;
  ano2: number;
  tipo: 'Despesas' | 'Receitas';
  grupo: string;
  grupos: string[];
  onAno1: (a: number) => void;
  onAno2: (a: number) => void;
  onTipo: (t: 'Despesas' | 'Receitas') => void;
  onGrupo: (g: string) => void;
}

function ComparacaoFiltros({
  anosDisponiveis,
  ano1,
  ano2,
  tipo,
  grupo,
  grupos,
  onAno1,
  onAno2,
  onTipo,
  onGrupo,
}: FiltrosProps) {
  return (
    <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap mb={2}>
      <TextField
        select
        size="small"
        label="Ano base"
        value={ano1}
        onChange={(e) => onAno1(Number(e.target.value))}
        sx={{ minWidth: 100 }}
      >
        {anosDisponiveis.map((a) => (
          <MenuItem key={a} value={a}>
            {a}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        size="small"
        label="Ano comparação"
        value={ano2}
        onChange={(e) => onAno2(Number(e.target.value))}
        sx={{ minWidth: 130 }}
      >
        {anosDisponiveis.map((a) => (
          <MenuItem key={a} value={a}>
            {a}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        size="small"
        label="Tipo"
        value={tipo}
        onChange={(e) => onTipo(e.target.value as 'Despesas' | 'Receitas')}
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
        onChange={(e) => onGrupo(e.target.value)}
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
  );
}

function ComparacaoConteudo(props: FiltrosProps) {
  const { ano1, ano2, tipo, grupo } = props;

  const { dados, erro } = useMemo(() => {
    try {
      return {
        dados: getMonthlyComparison(ano1, ano2, tipo, grupo !== 'Todos' ? grupo : null),
        erro: null as string | null,
      };
    } catch (err) {
      return {
        dados: [],
        erro: err instanceof Error ? err.message : 'Não foi possível comparar os anos.',
      };
    }
  }, [ano1, ano2, tipo, grupo]);

  const total1 = dados.reduce((soma, row) => soma + (row.total1 ?? 0), 0);
  const total2 = dados.reduce((soma, row) => soma + (row.total2 ?? 0), 0);
  const diff = total2 - total1;
  const pct = total1 > 0 ? (diff / total1) * 100 : 0;
  // Réplica da lógica de cor do desktop: para Despesas, descer é positivo; para Receitas, subir é positivo.
  const positivo = (diff < 0 && tipo === 'Despesas') || (diff > 0 && tipo === 'Receitas');

  return (
    <Box>
      <ComparacaoFiltros {...props} />

      {erro && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {erro}
        </Alert>
      )}

      {!erro && (
        <>
          <Box mb={2}>
            <YearComparisonChart data={dados} ano1={ano1} ano2={ano2} />
          </Box>

          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <KpiCard label={`${ano1} (base)`} value={formatCurrency(total1)} />
            <KpiCard label={`${ano2}`} value={formatCurrency(total2)} />
            <KpiCard
              label="Variação"
              value={`${diff >= 0 ? '+' : ''}${formatCurrency(diff)}`}
              color={positivo ? 'success.main' : 'error.main'}
              tooltip={`${diff >= 0 ? '+' : ''}${formatPercent(pct)} vs ${ano1}`}
            />
          </Stack>
        </>
      )}
    </Box>
  );
}
