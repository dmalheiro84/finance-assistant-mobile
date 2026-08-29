import { query } from '../db';

// Inspeção do schema real da base carregada — usada antes de escrever
// qualquer query de domínio, para nunca assumir nomes de tabelas/colunas.

export interface ColumnInfo {
  name: string;
  type: string;
  notNull: boolean;
  primaryKey: boolean;
}

export interface TableSchema {
  name: string;
  rowCount: number;
  columns: ColumnInfo[];
}

export function listTableNames(): string[] {
  const rows = query<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );
  return rows.map((row) => row.name);
}

export function describeTable(tableName: string): ColumnInfo[] {
  // PRAGMA não aceita parâmetros ligados; o nome vem sempre de
  // listTableNames() (schema interno), nunca de input do utilizador.
  const rows = query<{
    name: string;
    type: string;
    notnull: number;
    pk: number;
  }>(`PRAGMA table_info("${tableName}")`);
  return rows.map((row) => ({
    name: row.name,
    type: row.type,
    notNull: row.notnull === 1,
    primaryKey: row.pk > 0,
  }));
}

export function countRows(tableName: string): number {
  const rows = query<{ total: number }>(`SELECT COUNT(*) AS total FROM "${tableName}"`);
  return rows[0]?.total ?? 0;
}

/** Inspeciona todas as tabelas da base carregada: colunas + nº de linhas. */
export function inspectSchema(): TableSchema[] {
  return listTableNames().map((name) => ({
    name,
    rowCount: countRows(name),
    columns: describeTable(name),
  }));
}
