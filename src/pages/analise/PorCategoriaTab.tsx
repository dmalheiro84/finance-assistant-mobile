import { useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  getAllCategories,
  getCategoryAnnual,
  getCategoryMonthly,
  getCategoryStats,
  type TipoAnalise,
} from '../../data/queries/analise';
import { KpiCard } from '../../components/KpiCard';
import { formatCurrency, formatDate, formatMonthLabel } from '../../theme/format';

const TIPOS: TipoAnalise[] = ['Despesas', 'Receitas', 'Todos'];

interface PorCategoriaTabProps {
  anosDisponiveis: number[];
}

/**
 * Réplica do separador "🔬 Por Categoria" do desktop (get_category_annual/
 * monthly/stats) — evolução histórica de uma ou mais categorias
 * específicas. Sem os atalhos com nomes próprios da família/veículos do
 * desktop (decisão explícita: este repositório é público) — só pesquisa
 * de texto livre no multi-select.
 *
 * O desktop mostra um gráfico empilhado por categoria; em ecrã estreito
 * isso satura rápido com legendas — mostra-se aqui o total combinado das
 * categorias seleccionadas (por ano ou por mês) e a decomposição
 * numérica por categoria fica na lista de estatísticas abaixo.
 */
export function PorCategoriaTab({ anosDisponiveis }: PorCategoriaTabProps) {
  const [tipo, setTipo] = useState<TipoAnalise>('Despesas');
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [vista, setVista] = useState<'ano' | 'mes'>('ano');
  const [anoMes, setAnoMes] = useState(anosDisponiveis[0]);

  const todasCategorias = useMemo(() => {
    try {
      return getAllCategories(tipo);
    } catch {
      return [];
    }
  }, [tipo]);

  const { anual, mensal, stats, erro } = useMemo(() => {
    try {
      return {
        anual: getCategoryAnnual(selecionadas),
        mensal: vista === 'mes' ? getCategoryMonthly(selecionadas, anoMes) : [],
        stats: getCategoryStats(selecionadas),
        erro: null as string | null,
      };
    } catch (err) {
      return {
        anual: [],
        mensal: [],
        stats: [],
        erro: err instanceof Error ? err.message : 'Não foi possível analisar estas categorias.',
      };
    }
  }, [selecionadas, vista, anoMes]);

  const totalHistorico = stats.reduce((soma, row) => soma + row.totalHistorico, 0);
  const anosAtivos = new Set(anual.map((row) => row.ano)).size;
  const mediaAnual = anosAtivos > 0 ? totalHistorico / anosAtivos : 0;

  const dadosPorAno = useMemo(() => {
    const mapa = new Map<number, number>();
    for (const row of anual) mapa.set(row.ano, (mapa.get(row.ano) ?? 0) + row.total);
    return Array.from(mapa.entries())
      .sort(([a], [b]) => a - b)
      .map(([ano, total]) => ({ ano, total }));
  }, [anual]);

  const dadosPorMes = useMemo(() => {
    const mapa = new Map<number, number>();
    for (const row of mensal) mapa.set(row.mes, (mapa.get(row.mes) ?? 0) + row.total);
    return Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => ({
      mes: formatMonthLabel(2000, mes).split('/')[0],
      total: mapa.get(mes) ?? 0,
    }));
  }, [mensal]);

  return (
    <Box>
      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap mb={1.5}>
        <TextField
          select
          size="small"
          label="Tipo"
          value={tipo}
          onChange={(e) => {
            setTipo(e.target.value as TipoAnalise);
            setSelecionadas([]);
          }}
          sx={{ minWidth: 110 }}
        >
          {TIPOS.map((t) => (
            <MenuItem key={t} value={t}>
              {t}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Autocomplete
        multiple
        size="small"
        options={todasCategorias}
        value={selecionadas}
        onChange={(_, value) => setSelecionadas(value)}
        renderInput={(params) => (
          <TextField {...params} label="Categorias" placeholder="Escreve para pesquisar…" />
        )}
        sx={{ mb: 2 }}
      />

      {erro && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {erro}
        </Alert>
      )}

      {!erro && selecionadas.length === 0 && (
        <Alert severity="info">Seleciona pelo menos uma categoria acima.</Alert>
      )}

      {!erro && selecionadas.length > 0 && (
        <>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mb={2}>
            <KpiCard label="Categorias seleccionadas" value={String(selecionadas.length)} />
            <KpiCard label="Total histórico" value={formatCurrency(totalHistorico)} />
            <KpiCard label="Anos com dados" value={String(anosAtivos)} />
            <KpiCard
              label="Média anual"
              value={formatCurrency(mediaAnual)}
              tooltip="Total histórico dividido pelo número de anos com dados."
            />
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="h6" component="h3">
              Evolução
            </Typography>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={vista}
              onChange={(_, value: 'ano' | 'mes' | null) => value && setVista(value)}
            >
              <ToggleButton value="ano">Por ano</ToggleButton>
              <ToggleButton value="mes">Por mês</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {vista === 'mes' && (
            <TextField
              select
              size="small"
              label="Ano"
              value={anoMes}
              onChange={(e) => setAnoMes(Number(e.target.value))}
              sx={{ minWidth: 100, mb: 1.5 }}
            >
              {anosDisponiveis.map((a) => (
                <MenuItem key={a} value={a}>
                  {a}
                </MenuItem>
              ))}
            </TextField>
          )}

          <Box sx={{ width: '100%', height: 240, mb: 3 }}>
            <ResponsiveContainer>
              <BarChart
                data={vista === 'ano' ? dadosPorAno : dadosPorMes}
                margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={vista === 'ano' ? 'ano' : 'mes'} />
                <YAxis tickFormatter={(value: number) => formatCurrency(value)} width={90} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="total" fill="#3b5bdb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>

          <Typography variant="h6" component="h3" gutterBottom>
            Estatísticas por categoria
          </Typography>
          <Stack spacing={1}>
            {stats.map((row) => (
              <Paper key={row.categoria} variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="body2" fontWeight={600}>
                  {row.categoria}
                </Typography>
                {row.grupo && (
                  <Typography variant="caption" color="text.secondary">
                    {row.grupo}
                  </Typography>
                )}
                <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mt={0.5}>
                  <Typography variant="caption">
                    💰 <strong>{formatCurrency(row.totalHistorico)}</strong> total
                  </Typography>
                  <Typography variant="caption">
                    📅 <strong>{row.anosAtivos}</strong> anos
                  </Typography>
                  <Typography variant="caption">
                    🔢 <strong>{row.nTransacoes}</strong> mov.
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mt={0.25}>
                  <Typography variant="caption" color="text.secondary">
                    Média/mov: {formatCurrency(row.mediaTransacao)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Máx: {formatCurrency(row.maxTransacao)}
                  </Typography>
                  {row.ultimaData && (
                    <Typography variant="caption" color="text.secondary">
                      Última: {formatDate(new Date(row.ultimaData))}
                    </Typography>
                  )}
                </Stack>
              </Paper>
            ))}
          </Stack>
        </>
      )}
    </Box>
  );
}
