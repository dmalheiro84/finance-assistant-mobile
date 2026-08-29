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
import { loadDatabaseBytes } from './db';
import { loadFinanceDb, saveFinanceDb, type FinanceDbSource } from './indexedDbStore';
import { inspectSchema, type TableSchema } from './queries/schema';

// Orquestra o ciclo de vida dos dados: abre a cópia em cache ao arrancar
// (offline-first), sincroniza com o OneDrive via Graph quando pedido, e
// permite o carregamento manual de um ficheiro .db em modo de
// desenvolvimento (sem autenticação).

export type FinanceDataStatus = 'a-carregar' | 'pronto' | 'vazio' | 'erro';

interface FinanceDataContextValue {
  status: FinanceDataStatus;
  syncedAt: Date | null;
  source: FinanceDbSource | null;
  isOffline: boolean;
  error: string | null;
  schema: TableSchema[] | null;
  refreshFromOneDrive: () => Promise<void>;
  loadFromFile: (file: File) => Promise<void>;
}

const FinanceDataContext = createContext<FinanceDataContextValue | null>(null);

export function FinanceDataProvider({ children }: { children: ReactNode }) {
  const { authEnabled, isAuthenticated, getAccessToken } = useAuth();
  const [status, setStatus] = useState<FinanceDataStatus>('a-carregar');
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);
  const [source, setSource] = useState<FinanceDbSource | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [error, setError] = useState<string | null>(null);
  const [schema, setSchema] = useState<TableSchema[] | null>(null);

  const applyLoadedDb = useCallback(
    async (bytes: Uint8Array, syncedAtDate: Date, src: FinanceDbSource) => {
      await loadDatabaseBytes(bytes);
      setSchema(inspectSchema());
      setSyncedAt(syncedAtDate);
      setSource(src);
      setStatus('pronto');
    },
    [],
  );

  useEffect(() => {
    (async () => {
      const cached = await loadFinanceDb();
      if (cached) {
        await applyLoadedDb(cached.bytes, new Date(cached.syncedAt), cached.source);
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
      await applyLoadedDb(bytes, now, 'onedrive');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar dados do OneDrive.');
      setStatus((prev) => (prev === 'pronto' ? prev : 'erro'));
    }
  }, [authEnabled, isAuthenticated, getAccessToken, applyLoadedDb]);

  const loadFromFile = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const now = new Date();
        await saveFinanceDb({
          bytes,
          syncedAt: now.toISOString(),
          remoteModifiedAt: null,
          source: 'ficheiro-local',
          fileName: file.name,
        });
        await applyLoadedDb(bytes, now, 'ficheiro-local');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar o ficheiro .db.');
        setStatus('erro');
      }
    },
    [applyLoadedDb],
  );

  const value = useMemo<FinanceDataContextValue>(
    () => ({
      status,
      syncedAt,
      source,
      isOffline,
      error,
      schema,
      refreshFromOneDrive,
      loadFromFile,
    }),
    [status, syncedAt, source, isOffline, error, schema, refreshFromOneDrive, loadFromFile],
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
