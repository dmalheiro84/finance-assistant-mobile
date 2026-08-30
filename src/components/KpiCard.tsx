import { Card, CardContent, Stack, Tooltip, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { ReactNode } from 'react';

interface KpiCardProps {
  label: string;
  value: string;
  color?: 'success.main' | 'error.main' | 'text.primary' | 'text.disabled';
  tooltip?: ReactNode;
  /** Variação face ao ano anterior (homóloga ou completa) — ex.: "+120,00 €". */
  delta?: { label: string; positive: boolean };
}

export function KpiCard({ label, value, color = 'text.primary', tooltip, delta }: KpiCardProps) {
  return (
    <Card variant="outlined" sx={{ flex: '1 1 200px', minWidth: 160 }}>
      <CardContent>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          {tooltip && (
            <Tooltip title={tooltip} enterTouchDelay={0} leaveTouchDelay={4000}>
              <InfoOutlinedIcon fontSize="inherit" sx={{ color: 'text.disabled' }} />
            </Tooltip>
          )}
        </Stack>
        <Typography variant="h5" component="p" fontWeight={700} color={color} mt={0.5}>
          {value}
        </Typography>
        {delta && (
          <Typography
            variant="caption"
            color={delta.positive ? 'success.main' : 'error.main'}
            display="block"
          >
            {delta.label}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
