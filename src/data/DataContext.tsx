import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '../auth/useAuth';
import { downloadFinanceDb, getFinanceDbMetadata } from './graph';
import { isLikelySqliteFile, loadDatabaseBytes } from './db';
import { loadFinanceDb, saveFinanceDb, type FinanceDbSource } from './indexedDbStore';
import { inspectSchema, type TableSchema } from './queries/schema';

// Orquestra o ciclo de vida dos dados: abre a cópia em cache ao arrancar
// (offline-first — fluxo normal da v1), sincroniza com o OneDrive via
// Graph quando a autenticação estiver ativa, e permite a importação
// manual de um ficheiro .db (ver src/components/ImportScreen.tsx e
// src/data/ImportFileContext.tsx).

export type FinanceDataStatus = 'a-carregar' | 'pronto' | 'vazio' | 'erro';

interface FinanceDataContextValue {
  status: FinanceDataStatus;
  syncedAt: Date | null;
  source: FinanceDbSource | null;
  fileName: string | null;
  isOffline: boolean;
  error: string | null;
  schema: TableSchema[] | null;
  refreshFromOneDrive: () => Promise<void>;
  loadFromFile: (file: File) => Promise<void>;
  clearError: () => void;
}

const FinanceDataContext = createContext<FinanceDataContextValue | null>(null);

export function FinanceDataProvider({ children }: { children: ReactNode }) {
  const { authEnabled, isAuthenticated, getAccessToken } = useAuth();
  const [status, setStatus] = useState<FinanceDataStatus>('a-carregar');
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);
  const [source, setSource] = useState<FinanceDbSource | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [error, setError] = useState<string | null>(null);
  const [schema, setSchema] = useState<TableSchema[] | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const applyLoadedDb = useCallback(
    async (bytes: Uint8Array, syncedAtDate: Date, src: FinanceDbSource, name: string) => {
      await loadDatabaseBytes(bytes);
      setSchema(inspectSchema());
      setSyncedAt(syncedAtDate);
      setSource(src);
      setFileName(name);
      setStatus('pronto');
    },
    [],
  );

  // Ao arrancar: se já houver um .db em cache (importado ou sincronizado
  // anteriormente), vai direto para a app — o ecrã de importação só
  // aparece quando não há nenhuma cópia válida.
  useEffect(() => {
    (async () => {
      const cached = await loadFinanceDb();
      if (cached) {
        await applyLoadedDb(cached.bytes, new Date(cached.syncedAt), cached.source, cached.fileName);
      } else {
        setStatus('vazio');
      }
    })().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Falha ao abrir a cópia em cache.');
      setStatus('erro');
    });
  }, [applyLoadedDb]);

  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const refreshFromOneDrive = useCallback(async () => {
    if (!authEnabled || !isAuthenticated) return;
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Sessão Microsoft inválida — inicia sessão novamente.');
      const metadata = await getFinanceDbMetadata(token);
      const cached = await loadFinanceDb();
      if (cached && cached.remoteModifiedAt === metadata.lastModifiedDateTime) {
        return;
      }
      const bytes = await downloadFinanceDb(token);
      const now = new Date();
      await saveFinanceDb({
        bytes,
        syncedAt: now.toISOString(),
        remoteModifiedAt: metadata.lastModifiedDateTime,
        source: 'onedrive',
        fileName: 'finance.db',
      });
      await applyLoadedDb(bytes, now, 'onedrive', 'finance.db');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar dados do OneDrive.');
      setStatus((prev) => (prev === 'pronto' ? prev : 'erro'));
    }
  }, [authEnabled, isAuthenticated, getAccessToken, applyLoadedDb]);

  const loadFromFile = useCallback(async (file: File) => {
    setError(null);
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    if (!isLikelySqliteFile(bytes)) {
      setError(
        'O ficheiro escolhido não parece ser uma base de dados SQLite válida. Confirma que selecionaste o finance.db gerado pela app do computador.',
      );
      setStatus((prev) => (prev === 'pronto' ? prev : 'vazio'));
      return;
    }

    try {
      await loadDatabaseBytes(bytes);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Não foi possível abrir o ficheiro: ${err.message}`
          : 'Não foi possível abrir o ficheiro selecionado.',
      );
      setStatus((prev) => (prev === 'pronto' ? prev : 'vazio'));
      return;
    }

    const now = new Date();
    setSchema(inspectSchema());
    setSyncedAt(now);
    setSource('ficheiro-local');
    setFileName(file.name);
    setStatus('pronto');

    // A cache é best-effort: se falhar (ex.: quota do IndexedDB), os
    // dados já importados continuam disponíveis nesta sessão.
    saveFinanceDb({
      bytes,
      syncedAt: now.toISOString(),
      remoteModifiedAt: null,
      source: 'ficheiro-local',
      fileName: file.name,
    }).catch((err: unknown) => {
      console.warn('Não foi possível guardar o ficheiro em cache local.', err);
    });
  }, []);

  const value = useMemo<FinanceDataContextValue>(
    () => ({
      status,
      syncedAt,
      source,
      fileName,
      isOffline,
      error,
      schema,
      refreshFromOneDrive,
      loadFromFile,
      clearError,
    }),
    [
      status,
      syncedAt,
      source,
      fileName,
      isOffline,
      error,
      schema,
      refreshFromOneDrive,
      loadFromFile,
      clearError,
    ],
  );

  return <FinanceDataContext.Provider value={value}>{children}</FinanceDataContext.Provider>;
}

export function useFinanceData(): FinanceDataContextValue {
  const ctx = useContext(FinanceDataContext);
  if (!ctx) {
    throw new Error('useFinanceData tem de ser usado dentro de <FinanceDataProvider>.');
  }
  return ctx;
}
