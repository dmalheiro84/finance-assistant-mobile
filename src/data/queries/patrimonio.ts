import { query } from '../db';

// Queries do módulo Património.
//
// ATENÇÃO — o schema real deste finance.db não tem qualquer fonte de
// dados para "imóveis" nem "veículos" (Volvo EX30, Renault ESPACE): as
// tabelas invest_product_types/invest_history/invest_transactions só
// têm produtos financeiros (contas, depósitos, ações, fundos, cripto,
// seguros); a tabela `transactions` só regista fluxos (receitas/
// despesas), nunca o valor de um ativo. Pesquisa exaustiva por nome
// (Volvo/Renault/EX30/SPACE/imóvel/casa/carro) não encontrou nada.
// getRealEstateAndVehicles() devolve por isso null explícito — nunca
// inventar um valor — e o UI mostra "sem dados de origem".
//
// "Contas líquidas" e "Investimentos" usam a mesma regra do desktop
// (CLAUDE.md): soma dos valores mais recentes de cada produto na DATA
// GLOBAL mais recente de invest_history — nunca a data máxima por
// produto (um produto sem registo nessa data conta 0, não o seu último
// valor histórico — confirmado que é assim que ultimo_valor de
// invest_product_types já se comporta). Exclui sempre as linhas-resumo
// Portfolio/RAG acumulado/RAG do período.

const LINHAS_RESUMO = `'Portfolio', 'RAG acumulado', 'RAG do período'`;
const TIPOLOGIAS_LIQUIDAS = `'Disponibilidades DO', 'COFRE'`;

export interface FinancialNetWorth {
  contasLiquidas: number;
  investimentos: number;
  /** Soma de contas + investimentos — NÃO inclui imóveis/veículos (sem dados de origem). */
  valorLiquidoFinanceiro: number;
  /** Data global mais recente do histórico de investimentos usada no cálculo. */
  dataReferencia: string | null;
}

export function getFinancialNetWorth(): FinancialNetWorth {
  const dataReferencia = query<{ data: string | null }>(
    `SELECT MAX(data) AS data FROM invest_history`,
  )[0]?.data ?? null;

  if (!dataReferencia) {
    return { contasLiquidas: 0, investimentos: 0, valorLiquidoFinanceiro: 0, dataReferencia: null };
  }

  const rows = query<{ contas: number | null; investimentos: number | null }>(
    `
    SELECT
      SUM(CASE WHEN tipologia IN (${TIPOLOGIAS_LIQUIDAS}) THEN valor ELSE 0 END) AS contas,
      SUM(CASE WHEN tipologia NOT IN (${TIPOLOGIAS_LIQUIDAS}) OR tipologia IS NULL THEN valor ELSE 0 END) AS investimentos
    FROM invest_history
    WHERE data = ? AND produto NOT IN (${LINHAS_RESUMO})
    `,
    [dataReferencia],
  );

  const contasLiquidas = rows[0]?.contas ?? 0;
  const investimentos = rows[0]?.investimentos ?? 0;
  return {
    contasLiquidas,
    investimentos,
    valorLiquidoFinanceiro: contasLiquidas + investimentos,
    dataReferencia,
  };
}

/**
 * Imóveis e veículos não têm fonte de dados no finance.db — devolve
 * sempre null (nunca um valor inventado). Ver nota no topo do ficheiro.
 */
export function getRealEstateAndVehicles(): null {
  return null;
}
