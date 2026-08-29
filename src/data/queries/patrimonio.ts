import { query } from '../db';
import type { FinanceConfig, PropertyConfig, VehicleConfig } from '../configFile';

// Queries do módulo Património.
//
// "Contas líquidas" e "Investimentos" usam a mesma regra do desktop
// (CLAUDE.md): soma dos valores mais recentes de cada produto na DATA
// GLOBAL mais recente de invest_history — nunca a data máxima por
// produto (um produto sem registo nessa data conta 0, não o seu último
// valor histórico — confirmado que é assim que ultimo_valor de
// invest_product_types já se comporta). Exclui sempre as linhas-resumo
// Portfolio/RAG acumulado/RAG do período.
//
// Imóveis e veículos não têm fonte de dados no finance.db (pesquisa
// exaustiva por nome não encontrou nada) — vêm do finance_config.json,
// uma segunda fonte de dados opcional (ver src/data/configFile.ts e
// src/data/ConfigContext.tsx). summarizeRealEstateAndVehicles() recebe
// esse config já validado; devolve null quando não foi importado.
//
// Nenhuma das duas fontes tem passivos (crédito habitação, financiamento
// de veículos) — por isso o total combinado nunca deve ser chamado
// "valor líquido": é sempre "ativos brutos" (ver Patrimonio.tsx).

const LINHAS_RESUMO = `'Portfolio', 'RAG acumulado', 'RAG do período'`;
const TIPOLOGIAS_LIQUIDAS = `'Disponibilidades DO', 'COFRE'`;

export interface FinancialNetWorth {
  contasLiquidas: number;
  investimentos: number;
  /** Soma de contas + investimentos — não inclui imóveis/veículos. */
  totalFinanceiro: number;
  /** Data global mais recente do histórico de investimentos usada no cálculo. */
  dataReferencia: string | null;
}

export function getFinancialNetWorth(): FinancialNetWorth {
  const dataReferencia = query<{ data: string | null }>(
    `SELECT MAX(data) AS data FROM invest_history`,
  )[0]?.data ?? null;

  if (!dataReferencia) {
    return { contasLiquidas: 0, investimentos: 0, totalFinanceiro: 0, dataReferencia: null };
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
    totalFinanceiro: contasLiquidas + investimentos,
    dataReferencia,
  };
}

export interface RealEstateAndVehicles {
  /** Habitação própria (tipo="Habitação Própria" no finance_config.json) — nunca arrendada. */
  habitacaoPropria: PropertyConfig[];
  /** Imóveis de arrendamento (Philosophy B: unidades 5L/7D/7E e semelhantes). */
  imoveisArrendamento: PropertyConfig[];
  veiculos: VehicleConfig[];
  totalImoveis: number;
  totalVeiculos: number;
}

/**
 * Agrega o finance_config.json (já interpretado) em imóveis/veículos,
 * distinguindo habitação própria de imóveis de arrendamento (Philosophy
 * B). Devolve null quando o config não foi importado — nunca inventa
 * valores.
 */
export function summarizeRealEstateAndVehicles(
  config: FinanceConfig | null,
): RealEstateAndVehicles | null {
  if (!config) return null;

  const habitacaoPropria = config.imoveis.filter((imovel) => imovel.tipo === 'Habitação Própria');
  const imoveisArrendamento = config.imoveis.filter((imovel) => imovel.tipo !== 'Habitação Própria');
  const totalImoveis = config.imoveis.reduce((soma, imovel) => soma + imovel.valorMercado, 0);
  const totalVeiculos = config.veiculos.reduce((soma, veiculo) => soma + veiculo.valor, 0);

  return { habitacaoPropria, imoveisArrendamento, veiculos: config.veiculos, totalImoveis, totalVeiculos };
}
