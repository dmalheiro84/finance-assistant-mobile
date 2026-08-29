import { Card, CardContent, Stack, Tooltip, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { ReactNode } from 'react';

interface KpiCardProps {
  label: string;
  value: string;
  color?: 'success.main' | 'error.main' | 'text.primary';
  tooltip?: ReactNode;
}

export function KpiCard({ label, value, color = 'text.primary', tooltip }: KpiCardProps) {
  return (
    <Card variant="outlined" sx={{ flex: '1 1 200px', minWidth: 160 }}>
      <CardContent>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          {tooltip && (
            <Tooltip title={tooltip}>
              <InfoOutlinedIcon fontSize="inherit" sx={{ color: 'text.disabled' }} />
            </Tooltip>
          )}
        </Stack>
        <Typography variant="h5" component="p" fontWeight={700} color={color} mt={0.5}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}
