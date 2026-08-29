import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import { useConfig } from './ConfigContext';

// Input de ficheiro para o finance_config.json — mesmo padrão do
// ImportFileContext (finance.db), mas para a fonte opcional de
// imóveis/veículos.

interface ConfigFileContextValue {
  triggerImportConfig: () => void;
  isImportingConfig: boolean;
}

const ConfigFileContext = createContext<ConfigFileContextValue | null>(null);

export function ConfigFileProvider({ children }: { children: ReactNode }) {
  const { loadFromFile } = useConfig();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isImportingConfig, setIsImportingConfig] = useState(false);

  const handleChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      setIsImportingConfig(true);
      try {
        await loadFromFile(file);
      } finally {
        setIsImportingConfig(false);
      }
    },
    [loadFromFile],
  );

  const triggerImportConfig = useCallback(() => {
    inputRef.current?.click();
  }, []);

  return (
    <ConfigFileContext.Provider value={{ triggerImportConfig, isImportingConfig }}>
      {children}
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(event) => void handleChange(event)}
      />
    </ConfigFileContext.Provider>
  );
}

export function useConfigFile(): ConfigFileContextValue {
  const ctx = useContext(ConfigFileContext);
  if (!ctx) {
    throw new Error('useConfigFile tem de ser usado dentro de <ConfigFileProvider>.');
  }
  return ctx;
}
