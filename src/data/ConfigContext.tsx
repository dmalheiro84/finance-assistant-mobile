import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { parseFinanceConfig, type FinanceConfig } from './configFile';
import { loadFinanceConfig, saveFinanceConfig } from './indexedDbStore';

// Gere o finance_config.json — fonte de dados OPCIONAL (imóveis e
// veículos para o Património). Ao contrário do finance.db, a app
// funciona perfeitamente sem isto: config fica null e o Património
// mostra "Sem dados de origem" nesses cartões.

interface ConfigContextValue {
  config: FinanceConfig | null;
  fileName: string | null;
  syncedAt: Date | null;
  error: string | null;
  loadFromFile: (file: File) => Promise<void>;
  clearError: () => void;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<FinanceConfig | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFinanceConfig()
      .then((cached) => {
        if (cached) {
          setConfig(cached.config);
          setFileName(cached.fileName);
          setSyncedAt(new Date(cached.syncedAt));
        }
      })
      .catch((err: unknown) => {
        console.warn('Não foi possível abrir a configuração de património em cache.', err);
      });
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const loadFromFile = useCallback(async (file: File) => {
    setError(null);
    let parsed: FinanceConfig;
    try {
      const text = await file.text();
      parsed = parseFinanceConfig(text);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Não foi possível importar o ficheiro de configuração.',
      );
      return;
    }

    const now = new Date();
    setConfig(parsed);
    setFileName(file.name);
    setSyncedAt(now);

    saveFinanceConfig({ config: parsed, syncedAt: now.toISOString(), fileName: file.name }).catch(
      (err: unknown) => {
        console.warn('Não foi possível guardar a configuração de património em cache.', err);
      },
    );
  }, []);

  const value = useMemo<ConfigContextValue>(
    () => ({ config, fileName, syncedAt, error, loadFromFile, clearError }),
    [config, fileName, syncedAt, error, loadFromFile, clearError],
  );

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig(): ConfigContextValue {
  const ctx = useContext(ConfigContext);
  if (!ctx) {
    throw new Error('useConfig tem de ser usado dentro de <ConfigProvider>.');
  }
  return ctx;
}
