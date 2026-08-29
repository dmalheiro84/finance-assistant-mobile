import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import { useFinanceData } from './DataContext';

// Input de ficheiro único, partilhado por toda a app: tanto o ecrã de
// importação (primeira utilização) como o botão "Actualizar dados" do
// cabeçalho disparam o mesmo seletor nativo, através de triggerImport().

interface ImportFileContextValue {
  triggerImport: () => void;
  isImporting: boolean;
}

const ImportFileContext = createContext<ImportFileContextValue | null>(null);

export function ImportFileProvider({ children }: { children: ReactNode }) {
  const { loadFromFile } = useFinanceData();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      setIsImporting(true);
      try {
        await loadFromFile(file);
      } finally {
        setIsImporting(false);
      }
    },
    [loadFromFile],
  );

  const triggerImport = useCallback(() => {
    inputRef.current?.click();
  }, []);

  return (
    <ImportFileContext.Provider value={{ triggerImport, isImporting }}>
      {children}
      <input
        ref={inputRef}
        type="file"
        accept=".db,.sqlite,.sqlite3"
        hidden
        onChange={(event) => void handleChange(event)}
      />
    </ImportFileContext.Provider>
  );
}

export function useImportFile(): ImportFileContextValue {
  const ctx = useContext(ImportFileContext);
  if (!ctx) {
    throw new Error('useImportFile tem de ser usado dentro de <ImportFileProvider>.');
  }
  return ctx;
}
