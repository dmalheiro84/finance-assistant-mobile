import { openDB, type IDBPDatabase } from 'idb';

// Cache local do finance.db: guarda os bytes do ficheiro + metadados de
// sincronização em IndexedDB, para permitir consulta offline após a
// primeira sincronização (§5 da especificação).

const DB_NAME = 'finance-assistant-cache';
const DB_VERSION = 1;
const STORE_NAME = 'finance-db';
const RECORD_KEY = 'current';

export type FinanceDbSource = 'onedrive' | 'ficheiro-local';

export interface FinanceDbRecord {
  bytes: Uint8Array;
  /** Data/hora local em que este ficheiro foi guardado em cache. */
  syncedAt: string;
  /** Data de modificação reportada pelo OneDrive (metadados Graph), quando aplicável. */
  remoteModifiedAt: string | null;
  source: FinanceDbSource;
  fileName: string;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  dbPromise ??= openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
  return dbPromise;
}

export async function saveFinanceDb(record: FinanceDbRecord): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAME, record, RECORD_KEY);
}

export async function loadFinanceDb(): Promise<FinanceDbRecord | null> {
  const db = await getDb();
  const record = await db.get(STORE_NAME, RECORD_KEY);
  return record ?? null;
}

export async function clearFinanceDb(): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, RECORD_KEY);
}
