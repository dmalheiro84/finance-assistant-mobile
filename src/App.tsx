import { useMemo } from 'react';
import { CssBaseline, ThemeProvider, useMediaQuery } from '@mui/material';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { FinanceDataProvider } from './data/DataContext';
import { ImportFileProvider } from './data/ImportFileContext';
import { ConfigProvider } from './data/ConfigContext';
import { ConfigFileProvider } from './data/ConfigFileContext';
import { AuthGate } from './auth/AuthGate';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { Dashboard } from './pages/Dashboard';
import { Analise } from './pages/Analise';
import { Patrimonio } from './pages/Patrimonio';
import { Investimentos } from './pages/Investimentos';
import { Fire } from './pages/Fire';
import { darkTheme, lightTheme } from './theme/theme';

function AppShell() {
  return (
    <AuthGate>
      <Header />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/analise" element={<Analise />} />
        <Route path="/patrimonio" element={<Patrimonio />} />
        <Route path="/investimentos" element={<Investimentos />} />
        <Route path="/fire" element={<Fire />} />
      </Routes>
      <BottomNav />
    </AuthGate>
  );
}

export default function App() {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const theme = useMemo(() => (prefersDark ? darkTheme : lightTheme), [prefersDark]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <FinanceDataProvider>
          <ImportFileProvider>
            <ConfigProvider>
              <ConfigFileProvider>
                <AppShell />
              </ConfigFileProvider>
            </ConfigProvider>
          </ImportFileProvider>
        </FinanceDataProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
