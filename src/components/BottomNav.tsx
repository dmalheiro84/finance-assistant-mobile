import { Paper, BottomNavigation, BottomNavigationAction } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import InsightsIcon from '@mui/icons-material/Insights';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import { useLocation, useNavigate } from 'react-router-dom';

// Ordem dos módulos com paridade com o desktop.
const MODULES = [
  { path: '/', label: 'Dashboard', icon: <DashboardIcon /> },
  { path: '/analise', label: 'Análise', icon: <InsightsIcon /> },
  { path: '/patrimonio', label: 'Património', icon: <AccountBalanceIcon /> },
  { path: '/investimentos', label: 'Investimentos', icon: <TrendingUpIcon /> },
  { path: '/fire', label: 'FIRE', icon: <LocalFireDepartmentIcon /> },
] as const;

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentIndex = MODULES.findIndex((module) => module.path === location.pathname);

  return (
    <Paper elevation={3} sx={{ position: 'sticky', bottom: 0, left: 0, right: 0 }}>
      <BottomNavigation
        showLabels
        value={currentIndex === -1 ? 0 : currentIndex}
        onChange={(_event, newIndex: number) => {
          const module = MODULES[newIndex];
          if (module) navigate(module.path);
        }}
      >
        {MODULES.map((module) => (
          <BottomNavigationAction key={module.path} label={module.label} icon={module.icon} />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
