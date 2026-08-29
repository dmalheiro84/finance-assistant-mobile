import initSqlJs, { type Database, type SqlJsStatic, type SqlValue } from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

// Motor SQL (sql.js/WebAssembly) — vida do processo apenas: carrega bytes
// de um ficheiro SQLite para memória e expõe uma função `query` genérica.
// Nenhuma query de domínio deve viver aqui; ver src/data/queries/.

let sqlJsPromise: Promise<SqlJsStatic> | null = null;
let currentDatabase: Database | null = null;

function getSqlJs(): Promise<SqlJsStatic> {
  sqlJsPromise ??= initSqlJs({ locateFile: () => sqlWasmUrl });
  return sqlJsPromise;
}

/** Carrega os bytes do finance.db para memória, substituindo a base atual. */
export async function loadDatabaseBytes(bytes: Uint8Array): Promise<void> {
  const SQL = await getSqlJs();
  currentDatabase?.close();
  currentDatabase = new SQL.Database(bytes);
}

export function isDatabaseLoaded(): boolean {
  return currentDatabase !== null;
}

export function closeDatabase(): void {
  currentDatabase?.close();
  currentDatabase = null;
}

/**
 * Executa uma query SQL (só-leitura por convenção da app) e devolve as
 * linhas como objetos { coluna: valor }.
 */
export function query<T extends Record<string, SqlValue> = Record<string, SqlValue>>(
  sql: string,
  params: SqlValue[] = [],
): T[] {
  if (!currentDatabase) {
    throw new Error('Base de dados ainda não carregada.');
  }
  const stmt = currentDatabase.prepare(sql);
  try {
    stmt.bind(params);
    const rows: T[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as T);
    }
    return rows;
  } finally {
    stmt.free();
  }
}
