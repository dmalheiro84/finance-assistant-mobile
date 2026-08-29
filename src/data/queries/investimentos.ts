import { query } from '../db';

// Queries do módulo Investimentos, sobre `invest_history`.
//
// Regra do CLAUDE.md ("aprendida no desktop, não redescobrir"):
//   - Portfólio total = soma dos valores mais recentes de cada produto
//     NA DATA GLOBAL MAIS RECENTE — nunca a data máxima por produto,
//     nunca a linha-resumo "Portfolio". Confirmado no schema real: um
//     produto sem registo nessa data global conta 0 (não o seu último
//     valor histórico, que pode ser anos mais antigo) — testado contra
//     vários produtos que deixaram de reportar.
//   - Estado ativo/terminado = último valor do produto (nesse mesmo
//     sentido); ultimo_valor = 0 → terminado.

const LINHAS_RESUMO = `'Portfolio', 'RAG acumulado', 'RAG do período'`;

export type InvestmentStatus = 'ativo' | 'terminado';

export interface InvestmentProduct {
  produto: string;
  tipologia: string | null;
  valor: number;
  estado: InvestmentStatus;
}

export interface InvestmentPortfolio {
  total: number;
  totalAtivos: number;
  totalTerminados: number;
  dataReferencia: string | null;
  produtos: InvestmentProduct[];
}

export interface InvestmentByType {
  tipologia: string;
  valor: number;
}

function getGlobalReferenceDate(): string | null {
  return query<{ data: string | null }>(`SELECT MAX(data) AS data FROM invest_history`)[0]?.data ?? null;
}

/** Portfólio completo: valor por produto na data global mais recente, com estado ativo/terminado. */
export function getInvestmentPortfolio(): InvestmentPortfolio {
  const dataReferencia = getGlobalReferenceDate();
  if (!dataReferencia) {
    return { total: 0, totalAtivos: 0, totalTerminados: 0, dataReferencia: null, produtos: [] };
  }

  const rows = query<{ produto: string; tipologia: string | null; valor: number | null }>(
    `
    WITH produtos AS (
      SELECT DISTINCT produto FROM invest_history WHERE produto NOT IN (${LINHAS_RESUMO})
    )
    SELECT
      pr.produto,
      (SELECT h.tipologia FROM invest_history h WHERE h.produto = pr.produto ORDER BY h.data DESC LIMIT 1) AS tipologia,
      COALESCE(
        (SELECT h2.valor FROM invest_history h2 WHERE h2.produto = pr.produto AND h2.data = ?),
        0
      ) AS valor
    FROM produtos pr
    ORDER BY valor DESC
    `,
    [dataReferencia],
  );

  const produtos: InvestmentProduct[] = rows.map((row) => ({
    produto: row.produto,
    tipologia: row.tipologia,
    valor: row.valor ?? 0,
    estado: (row.valor ?? 0) === 0 ? 'terminado' : 'ativo',
  }));

  const total = produtos.reduce((soma, produto) => soma + produto.valor, 0);
  const totalAtivos = produtos.filter((produto) => produto.estado === 'ativo').length;
  const totalTerminados = produtos.length - totalAtivos;

  return { total, totalAtivos, totalTerminados, dataReferencia, produtos };
}

/** Portfólio agregado por tipologia, na mesma data global de referência. */
export function getPortfolioByType(): InvestmentByType[] {
  const dataReferencia = getGlobalReferenceDate();
  if (!dataReferencia) return [];

  const rows = query<{ tipologia: string | null; valor: number | null }>(
    `
    SELECT tipologia, SUM(valor) AS valor
    FROM invest_history
    WHERE data = ? AND produto NOT IN (${LINHAS_RESUMO})
    GROUP BY tipologia
    ORDER BY valor DESC
    `,
    [dataReferencia],
  );

  return rows.map((row) => ({ tipologia: row.tipologia ?? '(sem tipologia)', valor: row.valor ?? 0 }));
}
