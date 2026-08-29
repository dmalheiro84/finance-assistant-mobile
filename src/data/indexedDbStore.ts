import { openDB, type IDBPDatabase } from 'idb';
import type { FinanceConfig } from './configFile';

// Cache local das duas fontes de dados da app: o finance.db (bytes +
// metadados de sincronização) e o finance_config.json (opcional, com
// valores de imóveis/veículos). Ambas guardadas em IndexedDB, para
// permitir consulta offline após a primeira importação/sincronização
// (§5 da especificação).

const DB_NAME = 'finance-assistant-cache';
const DB_VERSION = 2;
const STORE_NAME = 'finance-db';
const CONFIG_STORE_NAME = 'finance-config';
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

export interface FinanceConfigRecord {
  config: FinanceConfig;
  syncedAt: string;
  fileName: string;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  dbPromise ??= openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(CONFIG_STORE_NAME)) {
        db.createObjectStore(CONFIG_STORE_NAME);
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

export async function saveFinanceConfig(record: FinanceConfigRecord): Promise<void> {
  const db = await getDb();
  await db.put(CONFIG_STORE_NAME, record, RECORD_KEY);
}

export async function loadFinanceConfig(): Promise<FinanceConfigRecord | null> {
  const db = await getDb();
  const record = await db.get(CONFIG_STORE_NAME, RECORD_KEY);
  return record ?? null;
}

export async function clearFinanceConfig(): Promise<void> {
  const db = await getDb();
  await db.delete(CONFIG_STORE_NAME, RECORD_KEY);
}
