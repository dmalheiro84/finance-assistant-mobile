import { MenuItem, Stack, TextField, Typography } from '@mui/material';

interface PeriodFilterProps {
  anos: number[];
  anoInicio: number;
  anoFim: number;
  onChange: (anoInicio: number, anoFim: number) => void;
}

/** Filtro de período (ano inicial/final) reutilizável entre módulos. */
export function PeriodFilter({ anos, anoInicio, anoFim, onChange }: PeriodFilterProps) {
  return (
    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap mb={2}>
      <Typography variant="body2" color="text.secondary">
        Período:
      </Typography>
      <TextField
        select
        size="small"
        label="De"
        value={anoInicio}
        onChange={(event) => {
          const novoInicio = Number(event.target.value);
          onChange(novoInicio, Math.max(novoInicio, anoFim));
        }}
        sx={{ minWidth: 100 }}
      >
        {anos
          .filter((ano) => ano <= anoFim)
          .map((ano) => (
            <MenuItem key={ano} value={ano}>
              {ano}
            </MenuItem>
          ))}
      </TextField>
      <TextField
        select
        size="small"
        label="Até"
        value={anoFim}
        onChange={(event) => {
          const novoFim = Number(event.target.value);
          onChange(Math.min(anoInicio, novoFim), novoFim);
        }}
        sx={{ minWidth: 100 }}
      >
        {anos
          .filter((ano) => ano >= anoInicio)
          .map((ano) => (
            <MenuItem key={ano} value={ano}>
              {ano}
            </MenuItem>
          ))}
      </TextField>
    </Stack>
  );
}
