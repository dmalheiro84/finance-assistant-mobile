import { useMemo, useState } from 'react';
import { Alert, Box, MenuItem, Stack, TextField, Typography } from '@mui/material';
import {
  getAnnualTrendPersonal,
  getGroupTrend,
  getGrupos,
  getTopCategoriesAnalise,
  type TipoAnalise,
} from '../../data/queries/analise';
import { TopCategoriesList, type CategoriaListItem } from '../../components/TopCategoriesList';
import { YearlyBarChart } from '../../components/YearlyBarChart';

const TIPOS: TipoAnalise[] = ['Despesas', 'Receitas', 'Todos'];

interface PorGrupoTabProps {
  anosDisponiveis: number[];
  anoCorrente: number;
  onDrillDown: (categoria: CategoriaListItem, ano: number) => void;
}

/**
 * Réplica do separador "📊 Por Grupo" do desktop (get_top_categories +
 * get_group_trend/get_annual_trend) — top categorias do ano/tipo/grupo
 * seleccionados, com evolução histórica ao lado. Tocar numa categoria
 * salta para o separador Transacções já filtrado (drill-down, A2).
 */
export function PorGrupoTab({ anosDisponiveis, anoCorrente, onDrillDown }: PorGrupoTabProps) {
  const [ano, setAno] = useState(anoCorrente);
  const [tipo, setTipo] = useState<TipoAnalise>('Despesas');
  const [grupo, setGrupo] = useState('Todos');

  const grupos = useMemo(() => {
    try {
      return getGrupos(ano, tipo);
    } catch {
      return [];
    }
  }, [ano, tipo]);

  const { categorias, erro } = useMemo(() => {
    try {
      return {
        categorias: getTopCategoriesAnalise(ano, tipo, grupo !== 'Todos' ? grupo : null, 20),
        erro: null as string | null,
      };
    } catch (err) {
      return {
        categorias: [],
        erro: err instanceof Error ? err.message : 'Não foi possível calcular a análise.',
      };
    }
  }, [ano, tipo, grupo]);

  const trend = useMemo(() => {
    try {
      if (grupo !== 'Todos' && tipo !== 'Todos') {
        return getGroupTrend(grupo, tipo).map((row) => ({ ano: row.ano, valor: row.total }));
      }
      return getAnnualTrendPersonal().map((row) => ({
        ano: row.ano,
        valor: tipo === 'Receitas' ? row.receitas : row.despesas,
      }));
    } catch {
      return [];
    }
  }, [grupo, tipo]);

  return (
    <Box>
      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap mb={2}>
        <TextField
          select
          size="small"
          label="Ano"
          value={ano}
          onChange={(e) => setAno(Number(e.target.value))}
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
          label="Tipo"
          value={tipo}
          onChange={(e) => {
            setTipo(e.target.value as TipoAnalise);
            setGrupo('Todos');
          }}
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

      {erro && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {erro}
        </Alert>
      )}

      {!erro && (
        <>
          <Typography variant="h6" component="h3" gutterBottom>
            Top categorias — {ano}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={1}>
            Toca numa categoria para veres as transações que a compõem.
          </Typography>
          <Box mb={3}>
            <TopCategoriesList data={categorias} onSelect={(item) => onDrillDown(item, ano)} />
          </Box>

          <Typography variant="h6" component="h3" gutterBottom>
            Evolução histórica — {grupo === 'Todos' ? 'todos os grupos' : grupo}
          </Typography>
          <Box mb={2}>
            <YearlyBarChart
              data={trend}
              cor={tipo === 'Receitas' ? '#1b6b5a' : '#ba1a1a'}
            />
          </Box>
        </>
      )}
    </Box>
  );
}
