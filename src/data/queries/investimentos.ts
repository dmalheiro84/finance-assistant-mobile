import { query } from '../db';

// Queries do módulo Investimentos, sobre `invest_history`, `invest_transactions`
// e `invest_product_types`. Replica app/views/investments.py + as funções
// correspondentes de app/core/db.py no repo dmalheiro84/FinanceAssistant
// (fonte de verdade — ver CLAUDE.md). O desktop tem 4 separadores —
// Portfolio, Evolução, Por Produto, Transacções — replicados aqui.
//
// Regras aprendidas no desktop (não redescobrir):
//   - Portfólio total = get_invest_portfolio_total_real(): soma dos
//     ÚLTIMOS VALORES INDIVIDUAIS de cada produto na data mais recente
//     COM DADOS (MAX(data) WHERE valor > 0 — nunca MAX(data) sem esse
//     filtro, que pode cair numa snapshot com tudo a 0). Exclui sempre
//     "Disponibilidades DO" (mostradas à parte — getDisponibilidadesDO)
//     e a própria linha-resumo "Portfolio"/"RAG do período"/"RAG
//     acumulado"/"Worth". Exige ainda que o produto esteja marcado como
//     ativo em invest_product_types (ultimo_valor>0, com valor da
//     history como fallback quando ultimo_valor é NULL).
//   - Estado ativo/terminado de um produto = invest_product_types.
//     ultimo_valor (0 → terminado); só cai para o fallback "amortizado
//     >= 95% do investido" quando o produto não tem registo em
//     invest_product_types.

// Cada função desktop tem a sua própria lista de linhas-resumo a excluir
// de invest_history — não são todas iguais, replicadas cada uma tal qual:
const LINHAS_RESUMO_PADRAO = `'Portfolio', 'RAG do período', 'RAG acumulado'`;
const LINHAS_RESUMO_PORTFOLIO_TOTAL = `'Portfolio', 'RAG do período', 'RAG acumulado', 'Worth'`;
const LINHAS_RESUMO_SUMMARY = `'Disponibilidades DO', 'Portfolio', 'RAG do período', 'RAG acumulado'`;

export type InvestmentStatus = 'Ativo' | 'Terminado';

export interface PortfolioTotalReal {
  total: number;
  porTipologia: Record<string, number>;
  nProdutos: number;
  data: string | null;
}

/**
 * Réplica exata de get_invest_portfolio_total_real() — usar sempre este
 * valor para "Portfólio total", nunca uma soma alternativa.
 */
export function getPortfolioTotalReal(): PortfolioTotalReal {
  const rows = query<{ produto: string; valor: number; data: string; tipologia: string }>(
    `
    SELECT h.produto, h.valor, h.data, COALESCE(pt.tipologia, '') AS tipologia
    FROM invest_history h
    LEFT JOIN invest_product_types pt ON h.produto = pt.produto
    WHERE h.data = (SELECT MAX(data) FROM invest_history WHERE valor > 0)
      AND h.produto NOT IN (${LINHAS_RESUMO_PORTFOLIO_TOTAL})
      AND COALESCE(pt.tipologia, '') NOT IN ('Disponibilidades DO', 'Portfolio', '')
      AND h.valor > 0
      AND COALESCE(pt.ultimo_valor, h.valor) > 0
    `,
  );

  if (rows.length === 0) return { total: 0, porTipologia: {}, nProdutos: 0, data: null };

  const total = rows.reduce((soma, row) => soma + row.valor, 0);
  const porTipologia: Record<string, number> = {};
  for (const row of rows) porTipologia[row.tipologia] = (porTipologia[row.tipologia] ?? 0) + row.valor;

  return { total, porTipologia, nProdutos: rows.length, data: rows[0]?.data ?? null };
}

export interface DisponibilidadeDO {
  produto: string;
  valor: number;
  data: string;
}

/** Réplica de get_invest_disponibilidades() — mostradas à parte, nunca somadas ao portfólio de investimento. */
export function getDisponibilidadesDO(): DisponibilidadeDO[] {
  return query<{ produto: string; valor: number; data: string }>(
    `
    SELECT h.produto, h.valor, h.data
    FROM invest_history h
    INNER JOIN invest_product_types pt ON h.produto = pt.produto
    WHERE h.data = (SELECT MAX(data) FROM invest_history WHERE valor > 0)
      AND h.valor > 0
      AND pt.tipologia = 'Disponibilidades DO'
    ORDER BY h.valor DESC
    `,
  );
}

/** Réplica de get_invest_tipologias(). */
export function getInvestTipologias(): string[] {
  const rows = query<{ tipologia: string | null }>(
    `SELECT DISTINCT tipologia FROM invest_product_types WHERE tipologia IS NOT NULL AND tipologia != '' ORDER BY tipologia`,
  );
  return rows.map((row) => row.tipologia).filter((t): t is string => t !== null);
}

export interface InvestmentProductSummary {
  investimento: string;
  tipologia: string;
  capitalInicial: number;
  reforcos: number;
  amortizado: number;
  juros: number;
  totalInvestido: number;
  nTransacoes: number;
  primeiraData: string | null;
  ultimaData: string | null;
  valorAtual: number | null;
  dataValorAtual: string | null;
  status: InvestmentStatus;
  plRealizado: number;
  plNaoRealizado: number | null;
  rentabilidadePct: number | null;
}

/**
 * Réplica de get_invest_summary_by_tipologia(tipologias) — resumo por
 * produto com capital investido/amortizado/juros, valor actual, P&L e
 * rentabilidade%. Inclui o fallback de correspondência parcial de nome
 * (quando um produto ativo não tem valor exato no histórico, tenta
 * encontrar um produto de invest_history cujo nome contenha os
 * primeiros 15 caracteres do nome da transação) — replicado tal qual,
 * apesar de ser uma heurística "suja": é a forma como o desktop lida
 * com inconsistências de nomenclatura entre as folhas Transações e
 * InputValores.
 */
export function getInvestSummaryByTipologia(tipologias?: string[]): InvestmentProductSummary[] {
  const transacoes = query<{
    investimento: string;
    capital_inicial: number | null;
    reforcos: number | null;
    amortizado: number | null;
    juros: number | null;
    total_investido: number | null;
    n_transacoes: number | null;
    primeira_data: string | null;
    ultima_data: string | null;
  }>(
    `
    SELECT investimento,
      SUM(CASE WHEN tipo = 'Aquisição inicial' THEN valor ELSE 0 END) AS capital_inicial,
      SUM(CASE WHEN tipo = 'Reforço' THEN valor ELSE 0 END) AS reforcos,
      SUM(CASE WHEN tipo = 'Amortização/venda' THEN valor ELSE 0 END) AS amortizado,
      SUM(CASE WHEN tipo = 'Juros recebidos' THEN valor ELSE 0 END) AS juros,
      SUM(CASE WHEN tipo IN ('Aquisição inicial', 'Reforço') THEN valor ELSE 0 END) AS total_investido,
      COUNT(*) AS n_transacoes,
      MIN(data) AS primeira_data,
      MAX(data) AS ultima_data
    FROM invest_transactions
    GROUP BY investimento
    ORDER BY total_investido DESC
    `,
  );

  if (transacoes.length === 0) return [];

  const latest = query<{ produto: string; valor_atual: number; data_valor_atual: string; tipologia: string }>(
    `
    SELECT h.produto, h.valor AS valor_atual, h.data AS data_valor_atual,
           COALESCE(pt.tipologia, '') AS tipologia
    FROM invest_history h
    LEFT JOIN invest_product_types pt ON h.produto = pt.produto
    WHERE h.data = (SELECT MAX(data) FROM invest_history WHERE valor > 0)
      AND h.valor > 0
      AND h.produto NOT IN (${LINHAS_RESUMO_SUMMARY})
    `,
  );

  const ultimoValorPorProduto = new Map(
    query<{ produto: string; ultimo_valor: number | null }>(
      `SELECT produto, COALESCE(ultimo_valor, 0) AS ultimo_valor FROM invest_product_types`,
    ).map((row) => [row.produto, row.ultimo_valor ?? 0]),
  );

  const latestPorProduto = new Map(latest.map((row) => [row.produto, row]));

  const resultado: InvestmentProductSummary[] = transacoes.map((t) => {
    const capitalInicial = t.capital_inicial ?? 0;
    const reforcos = t.reforcos ?? 0;
    const amortizado = t.amortizado ?? 0;
    const juros = t.juros ?? 0;
    const totalInvestido = t.total_investido ?? 0;

    const matchExato = latestPorProduto.get(t.investimento) ?? null;
    let tipologia = matchExato?.tipologia ?? '';
    let valorAtual: number | null = matchExato?.valor_atual ?? null;
    let dataValorAtual: string | null = matchExato?.data_valor_atual ?? null;

    const ultimoValor = ultimoValorPorProduto.get(t.investimento);
    const status: InvestmentStatus =
      ultimoValor !== undefined
        ? ultimoValor === 0
          ? 'Terminado'
          : 'Ativo'
        : amortizado >= totalInvestido * 0.95
          ? 'Terminado'
          : 'Ativo';

    // Fallback de correspondência parcial: produto ativo sem valor exato no histórico.
    if (valorAtual === null && status !== 'Terminado') {
      const nome = t.investimento.toLowerCase().slice(0, 15);
      const parcial = latest.find((row) => row.produto.toLowerCase().includes(nome));
      if (parcial) {
        valorAtual = parcial.valor_atual;
        dataValorAtual = parcial.data_valor_atual;
        tipologia = parcial.tipologia;
      }
    }

    const plRealizado = (valorAtual ?? 0) + amortizado + juros - totalInvestido;
    const plNaoRealizado = valorAtual !== null ? valorAtual - (totalInvestido - amortizado) : null;
    const rentabilidadePct = totalInvestido > 0 ? (plRealizado / totalInvestido) * 100 : null;

    return {
      investimento: t.investimento,
      tipologia,
      capitalInicial,
      reforcos,
      amortizado,
      juros,
      totalInvestido,
      nTransacoes: t.n_transacoes ?? 0,
      primeiraData: t.primeira_data,
      ultimaData: t.ultima_data,
      valorAtual,
      dataValorAtual,
      status,
      plRealizado,
      plNaoRealizado,
      rentabilidadePct,
    };
  });

  if (tipologias && tipologias.length > 0) {
    return resultado.filter((r) => tipologias.includes(r.tipologia));
  }
  return resultado;
}

export interface InvestAnnualFlowRow {
  ano: number;
  tipo: string;
  total: number;
  n: number;
}

/** Réplica de get_invest_annual_flow() — fluxo anual por tipo de operação. */
export function getInvestAnnualFlow(): InvestAnnualFlowRow[] {
  const rows = query<{ ano: number; tipo: string; total: number | null; n: number | null }>(
    `
    SELECT ano, tipo, SUM(valor) AS total, COUNT(*) AS n
    FROM invest_transactions
    WHERE ano IS NOT NULL
    GROUP BY ano, tipo ORDER BY ano, tipo
    `,
  );
  return rows.map((row) => ({ ano: row.ano, tipo: row.tipo, total: row.total ?? 0, n: row.n ?? 0 }));
}

export interface PortfolioHistoryRow {
  data: string;
  ano: number;
  mes: number;
  portfolioTotal: number;
  ragAcumulado: number;
}

/**
 * Réplica de get_invest_portfolio_history() — lê diretamente a view
 * `v_invest_portfolio` do finance.db (criada pelo ETL do desktop, já
 * presente no ficheiro — não recalculada aqui).
 */
export function getInvestPortfolioHistory(): PortfolioHistoryRow[] {
  try {
    const rows = query<{
      data: string;
      ano: number;
      mes: number;
      portfolio_total: number | null;
      rag_acumulado: number | null;
    }>(
      `
      SELECT data, ano, mes, portfolio_total, rag_acumulado
      FROM v_invest_portfolio
      WHERE portfolio_total > 0
      ORDER BY data
      `,
    );
    return rows.map((row) => ({
      data: row.data,
      ano: row.ano,
      mes: row.mes,
      portfolioTotal: row.portfolio_total ?? 0,
      ragAcumulado: row.rag_acumulado ?? 0,
    }));
  } catch {
    return [];
  }
}

/** Réplica de get_invest_products_list(). */
export function getInvestProductsList(): string[] {
  const rows = query<{ produto: string }>(
    `
    SELECT DISTINCT produto FROM invest_history
    WHERE produto NOT IN (${LINHAS_RESUMO_PADRAO}) AND valor > 0
    ORDER BY produto
    `,
  );
  return rows.map((row) => row.produto);
}

export interface ProductHistoryRow {
  data: string;
  ano: number;
  mes: number;
  produto: string;
  valor: number;
}

/** Réplica de get_invest_products_history(produtos) — evolução histórica de cotações. */
export function getInvestProductsHistory(produtos: string[]): ProductHistoryRow[] {
  if (produtos.length === 0) return [];
  const placeholders = produtos.map(() => '?').join(',');
  const rows = query<{ data: string; ano: number; mes: number; produto: string; valor: number | null }>(
    `
    SELECT data, ano, mes, produto, valor
    FROM invest_history
    WHERE valor > 0 AND produto NOT IN (${LINHAS_RESUMO_PADRAO}) AND produto IN (${placeholders})
    ORDER BY produto, data
    `,
    produtos,
  );
  return rows.map((row) => ({ ...row, valor: row.valor ?? 0 }));
}

export interface InvestTransacaoFiltro {
  investimento?: string;
  tipo?: string;
  ano?: number;
}

export interface InvestTransacao {
  data: string;
  ano: number;
  mes: number;
  investimento: string;
  tipo: string;
  valor: number;
  observacoes: string | null;
}

/** Réplica de get_invest_transactions(investimento, tipo) + filtro de ano aplicado do lado do UI no desktop. */
export function getInvestTransacoes(filtro: InvestTransacaoFiltro = {}): InvestTransacao[] {
  const wherePartes = ['1=1'];
  const params: (string | number)[] = [];
  if (filtro.investimento) {
    wherePartes.push('investimento = ?');
    params.push(filtro.investimento);
  }
  if (filtro.tipo) {
    wherePartes.push('tipo = ?');
    params.push(filtro.tipo);
  }
  if (filtro.ano) {
    wherePartes.push('ano = ?');
    params.push(filtro.ano);
  }
  const rows = query<{
    data: string;
    ano: number;
    mes: number;
    investimento: string;
    tipo: string;
    valor: number | null;
    observacoes: string | null;
  }>(
    `
    SELECT data, ano, mes, investimento, tipo, valor, observacoes
    FROM invest_transactions WHERE ${wherePartes.join(' AND ')}
    ORDER BY data DESC
    `,
    params,
  );
  return rows.map((row) => ({ ...row, valor: row.valor ?? 0 }));
}

/** Anos disponíveis em invest_transactions, do mais recente para o mais antigo. */
export function getInvestAvailableYears(): number[] {
  const rows = query<{ ano: number }>(
    `SELECT DISTINCT ano FROM invest_transactions WHERE ano IS NOT NULL ORDER BY ano DESC`,
  );
  return rows.map((row) => row.ano);
}
