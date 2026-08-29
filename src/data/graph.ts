import { FINANCE_DB_PATH } from '../auth/config';

// Download do finance.db do OneDrive via Microsoft Graph. Apenas leitura
// (scope Files.Read) — a app nunca escreve no ficheiro.

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

export interface FinanceDbMetadata {
  lastModifiedDateTime: string;
  size: number;
}

async function graphFetch(path: string, accessToken: string): Promise<Response> {
  const response = await fetch(`${GRAPH_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Pedido ao Microsoft Graph falhou (${response.status}): ${path}`);
  }
  return response;
}

/** Obtém apenas os metadados do finance.db (sem descarregar o conteúdo). */
export async function getFinanceDbMetadata(accessToken: string): Promise<FinanceDbMetadata> {
  const response = await graphFetch(`/me/drive/root:/${FINANCE_DB_PATH}`, accessToken);
  const data = (await response.json()) as {
    lastModifiedDateTime: string;
    size: number;
  };
  return { lastModifiedDateTime: data.lastModifiedDateTime, size: data.size };
}

/** Descarrega o conteúdo binário do finance.db. */
export async function downloadFinanceDb(accessToken: string): Promise<Uint8Array> {
  const response = await graphFetch(`/me/drive/root:/${FINANCE_DB_PATH}:/content`, accessToken);
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}
