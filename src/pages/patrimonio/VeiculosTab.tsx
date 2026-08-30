import { useMemo, useState } from 'react';
import { Alert, Autocomplete, Box, Stack, TextField, Typography } from '@mui/material';
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getVehicleCosts } from '../../data/queries/patrimonio';
import { KpiCard } from '../../components/KpiCard';
import { formatCurrency } from '../../theme/format';

interface VeiculosTabProps {
  anosDisponiveis: number[];
}

const CORES: Record<string, string> = {
  'Renault ESPACE': '#3b5bdb',
  'Volvo EX30': '#00acc1',
  Fiat: '#10b981',
  'Duke / KTM': '#f59f00',
};

function tipoCusto(categoria: string): string {
  const chaves = [
    'gasolina',
    'combustível',
    'seguro',
    'manutenção',
    'iuc',
    'portagens',
    'inspeção',
    'estacionamento',
    'aquisição',
  ];
  const cLower = categoria.toLowerCase();
  const encontrada = chaves.find((k) => cLower.includes(k));
  return encontrada ? encontrada.charAt(0).toUpperCase() + encontrada.slice(1) : 'Outros';
}

/** Réplica da tab "Veículos" de patrimonio.py (get_vehicle_costs). */
export function VeiculosTab({ anosDisponiveis }: VeiculosTabProps) {
  const [anosSel, setAnosSel] = useState<number[]>([]);

  const { custos, erro } = useMemo(() => {
    try {
      return { custos: getVehicleCosts(anosSel.length > 0 ? anosSel : undefined), erro: null as string | null };
    } catch (err) {
      return { custos: [], erro: err instanceof Error ? err.message : 'Não foi possível calcular os custos de veículos.' };
    }
  }, [anosSel]);

  const total = custos.reduce((s, r) => s + r.total, 0);

  const porVeiculo = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const row of custos) mapa.set(row.veiculo, (mapa.get(row.veiculo) ?? 0) + row.total);
    return Array.from(mapa.entries())
      .map(([veiculo, total]) => ({ veiculo, total }))
      .sort((a, b) => b.total - a.total);
  }, [custos]);

  const porVeiculoTipo = useMemo(() => {
    const mapa = new Map<string, Record<string, number>>();
    for (const row of custos) {
      const tipo = tipoCusto(row.categoria);
      const entrada = mapa.get(row.veiculo) ?? {};
      entrada[tipo] = (entrada[tipo] ?? 0) + row.total;
      mapa.set(row.veiculo, entrada);
    }
    return Array.from(mapa.entries()).map(([veiculo, tipos]) => ({ veiculo, ...tipos }));
  }, [custos]);
  const tiposPresentes = useMemo(() => Array.from(new Set(custos.map((r) => tipoCusto(r.categoria)))), [custos]);

  if (erro) return <Alert severity="warning">{erro}</Alert>;
  if (custos.length === 0) return <Alert severity="info">Sem custos de transporte para os anos selecionados.</Alert>;

  return (
    <Box>
      <Autocomplete
        multiple
        size="small"
        options={anosDisponiveis}
        value={anosSel}
        onChange={(_, value) => setAnosSel(value)}
        getOptionLabel={(a) => String(a)}
        renderInput={(params) => <TextField {...params} label="Filtrar por ano(s)" placeholder="Todos os anos" />}
        sx={{ mb: 2, maxWidth: 320 }}
      />

      <Stack direction="row" mb={3}>
        <KpiCard label="Total custos de transporte" value={formatCurrency(total)} color="error.main" />
      </Stack>

      <Typography variant="h6" component="h3" gutterBottom>
        Custo total por veículo
      </Typography>
      <Box sx={{ width: '100%', height: 260, mb: 3 }}>
        <ResponsiveContainer>
          <BarChart data={porVeiculo} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="veiculo" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v: number) => formatCurrency(v)} width={80} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Bar dataKey="total">
              {porVeiculo.map((row) => (
                <Cell key={row.veiculo} fill={CORES[row.veiculo] ?? '#6b7280'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>

      <Typography variant="h6" component="h3" gutterBottom>
        Por tipo de custo
      </Typography>
      <Box sx={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          <BarChart data={porVeiculoTipo} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="veiculo" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v: number) => formatCurrency(v)} width={80} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Legend />
            {tiposPresentes.map((tipo, i) => (
              <Bar
                key={tipo}
                dataKey={tipo}
                stackId="tipo"
                fill={['#3b5bdb', '#8b5cf6', '#10b981', '#f59f00', '#e64980', '#00acc1', '#6b7280', '#e03131', '#20c997'][i % 9]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
}
