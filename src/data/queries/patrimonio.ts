import { query } from '../db';
import type { FinanceConfig, PropertyConfig, VehicleConfig } from '../configFile';

// Queries do módulo Património. Replica app/views/patrimonio.py + as
// funções correspondentes de app/core/db.py no repo
// dmalheiro84/FinanceAssistant (fonte de verdade — ver CLAUDE.md). O
// desktop tem 4 separadores — Visão Global, Imóveis (Análise P&L +
// Config), Veículos, Configuração — replicados aqui (Configuração é
// só escrita, fora do âmbito desta app read-only).
//
// "Contas líquidas"/"Investimentos" (Visão Global) e o "Portfólio total"
// (Investimentos) usam FUNÇÕES DIFERENTES no desktop, com filtros de
// data de referência ligeiramente diferentes um do outro — não é um
// engano nosso, é assim no próprio desktop (_inv_por_tip/_disponibilidades
// em patrimonio.py usam MAX(data) sem filtro de valor>0;
// get_invest_portfolio_total_real em db.py usa MAX(data) WHERE valor>0).
// Replicadas aqui exactamente como cada função original as define, sem
// as unificar.
//
// Imóveis e veículos não têm fonte de dados no finance.db (pesquisa
// exaustiva por nome não encontrou nada) — vêm do finance_config.json,
// uma segunda fonte de dados opcional (ver src/data/configFile.ts e
// src/data/ConfigContext.tsx).

const LINHAS_RESUMO = `'Portfolio', 'RAG acumulado', 'RAG do período'`;

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
export function summarizeRealEstateAndVehicles(config: FinanceConfig | null): RealEstateAndVehicles | null {
  if (!config) return null;

  const habitacaoPropria = config.imoveis.filter((imovel) => imovel.tipo === 'Habitação Própria');
  const imoveisArrendamento = config.imoveis.filter((imovel) => imovel.tipo !== 'Habitação Própria');
  const totalImoveis = config.imoveis.reduce((soma, imovel) => soma + imovel.valorMercado, 0);
  const totalVeiculos = config.veiculos.reduce((soma, veiculo) => soma + veiculo.valor, 0);

  return { habitacaoPropria, imoveisArrendamento, veiculos: config.veiculos, totalImoveis, totalVeiculos };
}

export interface InvestimentoPorTipologia {
  tipologia: string;
  valor: number;
}

/**
 * Réplica exata de _inv_por_tip() em patrimonio.py — valores por
 * tipologia na data mais recente do histórico (MAX(data), SEM filtro
 * valor>0 — diferente de getPortfolioTotalReal em investimentos.ts).
 * Exclui Disponibilidades DO, Portfolio e produtos sem tipologia
 * (tipologia vazia/NULL fica de fora, não apenas as linhas-resumo).
 */
export function getInvestimentosPorTipologia(): InvestimentoPorTipologia[] {
  const rows = query<{ tipologia: string; valor: number | null }>(
    `
    SELECT COALESCE(pt.tipologia, 'Outros') AS tipologia, h.valor
    FROM invest_history h
    LEFT JOIN invest_product_types pt ON h.produto = pt.produto
    WHERE h.produto NOT IN (${LINHAS_RESUMO}, 'Worth')
      AND COALESCE(pt.tipologia, '') NOT IN ('Disponibilidades DO', 'Portfolio', '')
      AND h.data = (SELECT MAX(data) FROM invest_history)
      AND h.valor > 0
      AND COALESCE(pt.ultimo_valor, h.valor) > 0
    `,
  );

  const mapa = new Map<string, number>();
  for (const row of rows) mapa.set(row.tipologia, (mapa.get(row.tipologia) ?? 0) + (row.valor ?? 0));
  return Array.from(mapa.entries())
    .map(([tipologia, valor]) => ({ tipologia, valor }))
    .sort((a, b) => b.valor - a.valor);
}

/** Réplica exata de _disponibilidades() em patrimonio.py — total de contas à ordem na data mais recente (sem filtro valor>0 na subquery). */
export function getDisponibilidadesPatrimonio(): number {
  const rows = query<{ valor: number | null }>(
    `
    SELECT h.valor FROM invest_history h
    LEFT JOIN invest_product_types pt ON h.produto = pt.produto
    WHERE pt.tipologia = 'Disponibilidades DO'
      AND h.data = (SELECT MAX(data) FROM invest_history)
      AND h.valor > 0
    `,
  );
  return rows.reduce((soma, row) => soma + (row.valor ?? 0), 0);
}

export interface RendimentoPassivo {
  ano: number | null;
  rendas: number;
  rendasPorImovel: { categoria: string; total: number }[];
  juros: number;
  totalPassivo: number;
  /** % do património total (passado como argumento) — ver getRendimentoPassivo. */
  yield: number;
  /** Rendimento passivo ÷ despesas correntes do ano mais recente com movimento — FIRE = 100%. */
  coberturaDespesas: number;
}

/**
 * Réplica exata de _rendimento_passivo() em patrimonio.py — NOTA: usa
 * rendas BRUTAS (com acertos incluídos, sem os abater) e não exclui
 * is_imobiliario das despesas correntes. É uma fórmula mais simples e
 * literalmente diferente da usada em FIRE (getFireTrajectory, que usa
 * get_property_pnl líquido de acertos + exclui imobiliário das despesas
 * pessoais) — replicada aqui tal qual porque é o que esta view do
 * desktop mostra; os dois números (Património vs FIRE) podem por isso
 * divergir ligeiramente, tal como no desktop.
 */
export function getRendimentoPassivo(patrimonioTotal: number): RendimentoPassivo {
  const anoRendasRows = query<{ ano: number | null }>(
    `SELECT MAX(ano) AS ano FROM transactions WHERE tipo = 'Receita'`,
  );
  const anoRendas = anoRendasRows[0]?.ano ?? null;

  const rendasPorImovel = anoRendas
    ? query<{ categoria_normalizada: string; total: number | null }>(
        `
        SELECT categoria_normalizada, SUM(montante) AS total FROM transactions
        WHERE tipo = 'Receita' AND categoria_normalizada LIKE 'R.Renda%' AND ano = ?
        GROUP BY categoria_normalizada ORDER BY total DESC
        `,
        [anoRendas],
      ).map((row) => ({ categoria: row.categoria_normalizada, total: row.total ?? 0 }))
    : [];
  const rendas = rendasPorImovel.reduce((soma, row) => soma + row.total, 0);

  const anoJurosRows = query<{ ano: number | null }>(`SELECT MAX(ano) AS ano FROM invest_transactions`);
  const anoJuros = anoJurosRows[0]?.ano ?? null;
  const juros = anoJuros
    ? (query<{ v: number | null }>(
        `SELECT SUM(valor) AS v FROM invest_transactions WHERE tipo = 'Juros recebidos' AND ano = ?`,
        [anoJuros],
      )[0]?.v ?? 0)
    : 0;

  const totalPassivo = rendas + juros;
  const yieldPct = patrimonioTotal > 0 ? (totalPassivo / patrimonioTotal) * 100 : 0;

  const anoDespesasRows = query<{ ano: number | null }>(
    `SELECT MAX(ano) AS ano FROM transactions WHERE tipo = 'Despesa'`,
  );
  const anoDespesas = anoDespesasRows[0]?.ano ?? null;
  const despesas = anoDespesas
    ? (query<{ v: number | null }>(
        `
        SELECT SUM(montante) AS v FROM transactions
        WHERE tipo = 'Despesa' AND is_poupanca = 0 AND is_controlo = 0 AND ano = ?
          AND NOT (grupo_principal = 'Empresas' AND montante > 10000)
        `,
        [anoDespesas],
      )[0]?.v ?? 0)
    : 0;

  const coberturaDespesas = despesas > 0 ? (totalPassivo / despesas) * 100 : 0;

  return { ano: anoRendas, rendas, rendasPorImovel, juros, totalPassivo, yield: yieldPct, coberturaDespesas };
}

export interface PropertyPnl {
  imovel: string;
  nome: string;
  tipo: string;
  custosBrutos: number;
  acertos: number;
  custos: number;
  rendas: number;
  saldo: number;
  valorMercado: number;
  /** null quando não há valor de mercado configurado. */
  yieldBruta: number | null;
}

/**
 * Réplica exata de get_property_pnl(years) — P&L por imóvel (PL/5L/7D/7E).
 * `imoveisConfig` vem de finance_config.json (property_config no
 * desktop); sem ele, nome/tipo/valorMercado ficam por omissão e
 * yieldBruta fica sempre null (nunca inventamos um valor de mercado).
 */
export function getPropertyPnl(imoveisConfig: PropertyConfig[], anos?: number[]): PropertyPnl[] {
  const cfgPorChave = new Map(imoveisConfig.map((im) => [im.chave, im]));
  const anoFiltro = anos && anos.length > 0 ? ` AND ano IN (${anos.map(() => '?').join(',')})` : '';
  const params = anos && anos.length > 0 ? anos : [];

  const custosRows = query<{ imovel: string; custos_brutos: number | null }>(
    `
    SELECT
      CASE WHEN categoria_normalizada LIKE 'PL%' THEN 'PL'
           WHEN categoria_normalizada LIKE '5L%' THEN '5L'
           WHEN categoria_normalizada LIKE '7D%' THEN '7D'
           WHEN categoria_normalizada LIKE '7E%' THEN '7E'
           ELSE 'Outros' END AS imovel,
      SUM(montante) AS custos_brutos
    FROM transactions
    WHERE grupo_principal IN ('Habitação', 'Imobiliário') AND tipo = 'Despesa' AND is_controlo = 0${anoFiltro}
    GROUP BY imovel
    `,
    params,
  );

  const rendasRows = query<{ imovel: string; rendas: number | null }>(
    `
    SELECT
      CASE WHEN categoria_normalizada LIKE '%5L%' THEN '5L'
           WHEN categoria_normalizada LIKE '%7D%' THEN '7D'
           WHEN categoria_normalizada LIKE '%7E%' THEN '7E'
           ELSE 'PL' END AS imovel,
      SUM(montante) AS rendas
    FROM transactions
    WHERE tipo = 'Receita' AND is_controlo = 0
      AND categoria_normalizada LIKE 'R.Renda%' AND categoria_normalizada NOT LIKE '%Acertos%'${anoFiltro}
    GROUP BY imovel
    `,
    params,
  );

  const acertosRows = query<{ imovel: string; acertos: number | null }>(
    `
    SELECT
      CASE WHEN categoria_normalizada LIKE '%5L%' THEN '5L'
           WHEN categoria_normalizada LIKE '%7D%' THEN '7D'
           WHEN categoria_normalizada LIKE '%7E%' THEN '7E'
           ELSE 'PL' END AS imovel,
      SUM(montante) AS acertos
    FROM transactions
    WHERE tipo = 'Receita' AND is_controlo = 0 AND categoria_normalizada LIKE '%Acertos%'${anoFiltro}
    GROUP BY imovel
    `,
    params,
  );

  const imoveis = new Set<string>([
    ...custosRows.map((r) => r.imovel),
    ...rendasRows.map((r) => r.imovel),
    ...acertosRows.map((r) => r.imovel),
  ]);

  const custosMap = new Map(custosRows.map((r) => [r.imovel, r.custos_brutos ?? 0]));
  const rendasMap = new Map(rendasRows.map((r) => [r.imovel, r.rendas ?? 0]));
  const acertosMap = new Map(acertosRows.map((r) => [r.imovel, r.acertos ?? 0]));

  return Array.from(imoveis)
    .map((imovel) => {
      const custosBrutos = custosMap.get(imovel) ?? 0;
      const acertos = acertosMap.get(imovel) ?? 0;
      const rendas = rendasMap.get(imovel) ?? 0;
      const custos = custosBrutos - acertos;
      const saldo = rendas - custos;
      const cfg = cfgPorChave.get(imovel);
      const valorMercado = cfg?.valorMercado ?? 0;
      return {
        imovel,
        nome: cfg?.nome ?? imovel,
        tipo: cfg?.tipo ?? '—',
        custosBrutos,
        acertos,
        custos,
        rendas,
        saldo,
        valorMercado,
        yieldBruta: valorMercado > 0 ? (rendas / valorMercado) * 100 : null,
      };
    })
    .sort((a, b) => a.imovel.localeCompare(b.imovel));
}

export interface PropertyCostRow {
  ano: number;
  imovel: string;
  categoria: string;
  total: number;
  n: number;
}

/** Réplica de get_property_costs(years). */
export function getPropertyCosts(anos?: number[]): PropertyCostRow[] {
  const anoFiltro = anos && anos.length > 0 ? ` AND ano IN (${anos.map(() => '?').join(',')})` : '';
  const rows = query<{
    ano: number;
    imovel: string;
    categoria_normalizada: string;
    total: number | null;
    n: number | null;
  }>(
    `
    SELECT ano,
      CASE WHEN categoria_normalizada LIKE 'PL%' THEN 'PL'
           WHEN categoria_normalizada LIKE '5L%' THEN '5L'
           WHEN categoria_normalizada LIKE '7D%' THEN '7D'
           WHEN categoria_normalizada LIKE '7E%' THEN '7E'
           ELSE 'Outros' END AS imovel,
      categoria_normalizada, SUM(montante) AS total, COUNT(*) AS n
    FROM transactions
    WHERE grupo_principal = 'Habitação' AND is_controlo = 0${anoFiltro}
    GROUP BY ano, imovel, categoria_normalizada
    ORDER BY ano, imovel, total DESC
    `,
    anos ?? [],
  );
  return rows.map((row) => ({
    ano: row.ano,
    imovel: row.imovel,
    categoria: row.categoria_normalizada,
    total: row.total ?? 0,
    n: row.n ?? 0,
  }));
}

export interface RentalIncomeRow {
  ano: number;
  categoria: string;
  total: number;
  n: number;
}

/** Réplica de get_rental_income(years). */
export function getRentalIncome(anos?: number[]): RentalIncomeRow[] {
  const anoFiltro = anos && anos.length > 0 ? ` AND ano IN (${anos.map(() => '?').join(',')})` : '';
  const rows = query<{ ano: number; categoria_normalizada: string; total: number | null; n: number | null }>(
    `
    SELECT ano, categoria_normalizada, SUM(montante) AS total, COUNT(*) AS n
    FROM transactions
    WHERE tipo = 'Receita' AND is_controlo = 0 AND categoria_normalizada LIKE 'R.Renda%'${anoFiltro}
    GROUP BY ano, categoria_normalizada
    ORDER BY ano, total DESC
    `,
    anos ?? [],
  );
  return rows.map((row) => ({
    ano: row.ano,
    categoria: row.categoria_normalizada,
    total: row.total ?? 0,
    n: row.n ?? 0,
  }));
}

export interface VehicleCostRow {
  ano: number;
  veiculo: string;
  categoria: string;
  total: number;
  n: number;
}

/** Réplica de get_vehicle_costs(years). */
export function getVehicleCosts(anos?: number[]): VehicleCostRow[] {
  const anoFiltro = anos && anos.length > 0 ? ` AND ano IN (${anos.map(() => '?').join(',')})` : '';
  const rows = query<{ ano: number; veiculo: string; categoria_normalizada: string; total: number | null; n: number | null }>(
    `
    SELECT ano,
      CASE WHEN categoria_normalizada LIKE 'Renault%' OR categoria_normalizada LIKE 'RENAULT%' THEN 'Renault ESPACE'
           WHEN categoria_normalizada LIKE 'Volvo%' OR categoria_normalizada LIKE 'VOLVO%' THEN 'Volvo EX30'
           WHEN categoria_normalizada LIKE 'Fiat%' OR categoria_normalizada LIKE 'FIAT%' THEN 'Fiat'
           WHEN categoria_normalizada LIKE 'Duke%' OR categoria_normalizada LIKE 'DUKE%' THEN 'Duke / KTM'
           WHEN categoria_normalizada LIKE 'PEUGEOT%' THEN 'Peugeot (hist.)'
           WHEN categoria_normalizada LIKE 'PCX%' THEN 'PCX (hist.)'
           ELSE 'Outros' END AS veiculo,
      categoria_normalizada, SUM(montante) AS total, COUNT(*) AS n
    FROM transactions
    WHERE grupo_principal = 'Transportes' AND is_controlo = 0${anoFiltro}
    GROUP BY ano, veiculo, categoria_normalizada
    ORDER BY ano, veiculo, total DESC
    `,
    anos ?? [],
  );
  return rows.map((row) => ({
    ano: row.ano,
    veiculo: row.veiculo,
    categoria: row.categoria_normalizada,
    total: row.total ?? 0,
    n: row.n ?? 0,
  }));
}
