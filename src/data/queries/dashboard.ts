import { query } from '../db';
import { getAvailableYears } from './analise';

// Queries do Dashboard (Visão Geral), sobre a tabela `transactions`.
//
// Replica exatamente get_kpis(year, include_imob=True) e
// get_monthly(year, include_imob=True) de app/core/db.py no repo
// dmalheiro84/FinanceAssistant (fonte de verdade — ver CLAUDE.md).
//
// O desktop nunca mostra receitas/despesas em bruto nos cards:
//   - receitas mostradas = receitas brutas − acertos de inquilinos
//     (Acertos nunca são receita, mesmo com tipo='Receita' — Philosophy B)
//   - despesas mostradas (líquidas) = despesas brutas − reembolsos
//     ("R.Reembolsos e devoluções") − acertos
//   - saldo = receitas brutas − despesas brutas (SEM subtrair reembolsos/
//     acertos dos dois lados — é intencional: o desktop documenta que
//     subtrair directamente os dois cards mostrados dava um valor
//     diferente, porque reembolsos/acertos entram matematicamente dos
//     dois lados). Isto significa que saldo ≠ receitas mostradas −
//     despesas mostradas — é assim no desktop, replicado tal e qual.
//   - taxa de poupança = saldo ÷ receitas mostradas × 100
//
// Inclui sempre imobiliário (Dashboard = Visão Geral, include_imob=true).
// Exclui sempre is_poupanca=1 e is_controlo=1.
//
// getReceitasBreakdown/getDespesasBreakdown/getSaldoBreakdown replicam
// get_receitas_breakdown/get_despesas_breakdown/get_saldo_breakdown —
// decomposição de cada card para tooltip (dashboard v1, tab "Visão Geral").
// getComparisonInfo/getKpisDelta replicam get_comparison_info/
// get_kpis_delta — comparação homóloga (YTD) quando o ano é o corrente do
// sistema, ano completo vs ano completo nos restantes casos.

export interface YearSummary {
  receitas: number;
  despesas: number;
  saldo: number;
  taxaPoupanca: number;
}

export interface MonthlyEvolutionRow {
  ano: number;
  mes: number;
  receitas: number;
  despesas: number;
}

const ACERTOS = `is_imobiliario = 1 AND categoria_normalizada LIKE '%Acertos%'`;
const REEMBOLSOS = `categoria_normalizada = 'R.Reembolsos e devoluções'`;

/**
 * Réplica de get_kpis(year, until_date, include_imob=True). `untilDate`
 * (formato 'AAAA-MM-DD') restringe a soma a `data <= untilDate` — usado nas
 * comparações homólogas (YTD) de getComparisonInfo.
 */
function getKpisRaw(ano: number, untilDate?: string): YearSummary {
  const whereExtra = untilDate ? ' AND data <= ?' : '';
  const params: (number | string)[] = [ano];
  if (untilDate) params.push(untilDate);

  const rows = query<{
    receitas_brutas: number | null;
    despesas_brutas: number | null;
    reembolsos: number | null;
    acertos: number | null;
  }>(
    `
    SELECT
      SUM(CASE WHEN tipo = 'Receita' THEN montante ELSE 0 END) AS receitas_brutas,
      SUM(CASE WHEN tipo = 'Despesa' THEN montante ELSE 0 END) AS despesas_brutas,
      SUM(CASE WHEN tipo = 'Receita' AND ${REEMBOLSOS} THEN montante ELSE 0 END) AS reembolsos,
      SUM(CASE WHEN tipo = 'Receita' AND ${ACERTOS} THEN montante ELSE 0 END) AS acertos
    FROM transactions
    WHERE ano = ? AND is_poupanca = 0 AND is_controlo = 0${whereExtra}
    `,
    params,
  );

  const receitasBrutas = rows[0]?.receitas_brutas ?? 0;
  const despesasBrutas = rows[0]?.despesas_brutas ?? 0;
  const reembolsos = rows[0]?.reembolsos ?? 0;
  const acertos = rows[0]?.acertos ?? 0;

  const receitas = receitasBrutas - acertos;
  const despesas = despesasBrutas - reembolsos - acertos;
  const saldo = receitasBrutas - despesasBrutas;

  return {
    receitas,
    despesas,
    saldo,
    taxaPoupanca: receitas > 0 ? (saldo / receitas) * 100 : 0,
  };
}

/** Receitas, despesas (líquidas) e saldo do ano indicado, para os KPIs da Visão Geral. */
export function getYearSummary(ano: number): YearSummary {
  return getKpisRaw(ano);
}

export interface ReceitasBreakdown {
  pessoal: number;
  rendasPuras: number;
  acertos: number;
  resgates: number;
  controlo: number;
  /** = pessoal + rendasPuras — o que aparece no card Receitas. */
  totalShow: number;
  totalBruto: number;
}

/** Réplica de get_receitas_breakdown(year) — decomposição para o tooltip do card Receitas. */
export function getReceitasBreakdown(ano: number): ReceitasBreakdown {
  const rows = query<{
    pessoal: number | null;
    rendas_puras: number | null;
    acertos: number | null;
    resgates: number | null;
    controlo: number | null;
  }>(
    `
    SELECT
      SUM(CASE WHEN is_controlo = 0 AND is_poupanca = 0 AND is_imobiliario = 0 THEN montante ELSE 0 END) AS pessoal,
      SUM(CASE WHEN is_imobiliario = 1 AND is_controlo = 0 AND is_poupanca = 0
                    AND categoria_normalizada NOT LIKE '%Acertos%' THEN montante ELSE 0 END) AS rendas_puras,
      SUM(CASE WHEN is_imobiliario = 1 AND is_controlo = 0 AND is_poupanca = 0
                    AND categoria_normalizada LIKE '%Acertos%' THEN montante ELSE 0 END) AS acertos,
      SUM(CASE WHEN is_poupanca = 1 AND is_controlo = 0 THEN montante ELSE 0 END) AS resgates,
      SUM(CASE WHEN is_controlo = 1 THEN montante ELSE 0 END) AS controlo
    FROM transactions
    WHERE ano = ? AND tipo = 'Receita'
    `,
    [ano],
  );

  const pessoal = rows[0]?.pessoal ?? 0;
  const rendasPuras = rows[0]?.rendas_puras ?? 0;
  const acertos = rows[0]?.acertos ?? 0;
  const resgates = rows[0]?.resgates ?? 0;
  const controlo = rows[0]?.controlo ?? 0;

  return {
    pessoal,
    rendasPuras,
    acertos,
    resgates,
    controlo,
    totalShow: pessoal + rendasPuras,
    totalBruto: pessoal + rendasPuras + acertos + resgates,
  };
}

export interface DespesasBreakdown {
  pessoalBruta: number;
  pessoalLiquida: number;
  imobBruta: number;
  imobLiquida: number;
  enviosPoupanca: number;
  controlo: number;
  reembolsos: number;
  acertos: number;
  /** = pessoalLiquida + imobLiquida — o que aparece no card Despesas. */
  totalShow: number;
  totalBruto: number;
}

/** Réplica de get_despesas_breakdown(year) — decomposição para o tooltip do card Despesas. */
export function getDespesasBreakdown(ano: number): DespesasBreakdown {
  const rows = query<{
    pessoal_bruta: number | null;
    imob_bruta: number | null;
    envios_poupanca: number | null;
    controlo: number | null;
  }>(
    `
    SELECT
      SUM(CASE WHEN is_controlo = 0 AND is_poupanca = 0 AND is_imobiliario = 0 THEN montante ELSE 0 END) AS pessoal_bruta,
      SUM(CASE WHEN is_imobiliario = 1 AND is_controlo = 0 AND is_poupanca = 0 THEN montante ELSE 0 END) AS imob_bruta,
      SUM(CASE WHEN is_poupanca = 1 AND is_controlo = 0 THEN montante ELSE 0 END) AS envios_poupanca,
      SUM(CASE WHEN is_controlo = 1 THEN montante ELSE 0 END) AS controlo
    FROM transactions
    WHERE ano = ? AND tipo = 'Despesa'
    `,
    [ano],
  );

  const reembolsosRows = query<{ reembolsos: number | null }>(
    `
    SELECT SUM(montante) AS reembolsos FROM transactions
    WHERE ano = ? AND tipo = 'Receita' AND is_controlo = 0 AND ${REEMBOLSOS}
    `,
    [ano],
  );

  const acertosRows = query<{ acertos: number | null }>(
    `
    SELECT SUM(montante) AS acertos FROM transactions
    WHERE ano = ? AND tipo = 'Receita' AND is_controlo = 0 AND ${ACERTOS}
    `,
    [ano],
  );

  const pessoalBruta = rows[0]?.pessoal_bruta ?? 0;
  const imobBruta = rows[0]?.imob_bruta ?? 0;
  const enviosPoupanca = rows[0]?.envios_poupanca ?? 0;
  const controlo = rows[0]?.controlo ?? 0;
  const reembolsos = reembolsosRows[0]?.reembolsos ?? 0;
  const acertos = acertosRows[0]?.acertos ?? 0;
  const imobLiquida = imobBruta - acertos;
  const pessoalLiquida = pessoalBruta - reembolsos;

  return {
    pessoalBruta,
    pessoalLiquida,
    imobBruta,
    imobLiquida,
    enviosPoupanca,
    controlo,
    reembolsos,
    acertos,
    totalShow: pessoalLiquida + imobLiquida,
    totalBruto: pessoalBruta + imobBruta + enviosPoupanca,
  };
}

export interface SaldoBreakdown {
  saldoPessoal: number;
  rendasPuras: number;
  acertos: number;
  imobBruta: number;
  imobLiquida: number;
  saldoImob: number;
  saldoTotal: number;
}

/** Réplica de get_saldo_breakdown(year) — decomposição para o tooltip do card Saldo. */
export function getSaldoBreakdown(ano: number): SaldoBreakdown {
  const rec = getReceitasBreakdown(ano);
  const dsp = getDespesasBreakdown(ano);
  const saldoPessoal = rec.pessoal - dsp.pessoalBruta;
  const saldoImob = rec.rendasPuras + rec.acertos - dsp.imobBruta;

  return {
    saldoPessoal,
    rendasPuras: rec.rendasPuras,
    acertos: rec.acertos,
    imobBruta: dsp.imobBruta,
    imobLiquida: dsp.imobLiquida,
    saldoImob,
    saldoTotal: saldoPessoal + saldoImob,
  };
}

export type ComparisonMode = 'no_prev' | 'ytd' | 'full';

export interface ComparisonInfo {
  mode: ComparisonMode;
  /** Data (AAAA-MM-DD) até à qual o ano corrente tem dados, só em modo 'ytd'. */
  untilDate: string | null;
  prevFull: YearSummary | null;
  prevYtd: YearSummary | null;
}

/**
 * Réplica de get_comparison_info(year, include_imob=True): decide se a
 * comparação com o ano anterior é homóloga (YTD, quando `ano` é o ano
 * corrente do sistema) ou ano completo vs ano completo.
 */
export function getComparisonInfo(ano: number): ComparisonInfo {
  const anosDisponiveis = getAvailableYears();
  if (!anosDisponiveis.includes(ano - 1)) {
    return { mode: 'no_prev', untilDate: null, prevFull: null, prevYtd: null };
  }

  const prevFull = getKpisRaw(ano - 1);
  const anoSistema = new Date().getFullYear();

  if (ano === anoSistema) {
    const maxRows = query<{ md: string | null }>(
      `SELECT MAX(data) AS md FROM transactions WHERE ano = ?`,
      [ano],
    );
    const maxData = maxRows[0]?.md ?? null;
    if (maxData) {
      const prevUntil = `${ano - 1}${maxData.slice(4)}`;
      const prevYtd = getKpisRaw(ano - 1, prevUntil);
      return { mode: 'ytd', untilDate: maxData, prevFull, prevYtd };
    }
    return { mode: 'no_prev', untilDate: null, prevFull, prevYtd: null };
  }

  return { mode: 'full', untilDate: null, prevFull, prevYtd: null };
}

export interface KpisDelta {
  receitas: number;
  despesas: number;
  saldo: number;
  taxaPoupanca: number;
}

/** Réplica de get_kpis_delta(year, include_imob=True). `null` quando não há ano anterior. */
export function getKpisDelta(ano: number): KpisDelta | null {
  const curr = getYearSummary(ano);
  const info = getComparisonInfo(ano);
  if (info.mode === 'no_prev') return null;
  const prev = info.mode === 'ytd' ? info.prevYtd! : info.prevFull!;
  return {
    receitas: curr.receitas - prev.receitas,
    despesas: curr.despesas - prev.despesas,
    saldo: curr.saldo - prev.saldo,
    taxaPoupanca: curr.taxaPoupanca - prev.taxaPoupanca,
  };
}

/** Receitas e despesas (líquidas) por mês do ano indicado, para o gráfico de evolução. */
export function getMonthlyEvolution(ano: number): MonthlyEvolutionRow[] {
  const rows = query<{ mes: number; receitas: number | null; despesas: number | null }>(
    `
    SELECT
      mes,
      SUM(CASE WHEN tipo = 'Receita' AND NOT (${ACERTOS}) THEN montante ELSE 0 END) AS receitas,
      SUM(CASE WHEN tipo = 'Despesa' THEN montante ELSE 0 END)
        - SUM(CASE WHEN tipo = 'Receita' AND ${REEMBOLSOS} THEN montante ELSE 0 END)
        - SUM(CASE WHEN tipo = 'Receita' AND ${ACERTOS} THEN montante ELSE 0 END) AS despesas
    FROM transactions
    WHERE ano = ? AND is_poupanca = 0 AND is_controlo = 0
    GROUP BY mes
    ORDER BY mes
    `,
    [ano],
  );

  return rows.map((row) => ({
    ano,
    mes: row.mes,
    receitas: row.receitas ?? 0,
    despesas: row.despesas ?? 0,
  }));
}

export interface GrupoDespesa {
  grupo: string;
  total: number;
  n: number;
}

/**
 * Réplica de get_by_group(year) — despesas por grupo principal do ano
 * indicado, para o donut "Despesas por Grupo" da Visão Geral. Sem filtro
 * de is_imobiliario (inclui sempre imobiliário, tal como o resto do
 * Dashboard); exclui poupança e controlo.
 */
export function getDespesasPorGrupo(ano: number): GrupoDespesa[] {
  const rows = query<{ grupo_principal: string | null; total: number | null; n: number | null }>(
    `
    SELECT grupo_principal, SUM(montante) AS total, COUNT(*) AS n
    FROM transactions
    WHERE ano = ? AND tipo = 'Despesa' AND is_poupanca = 0 AND is_controlo = 0
    GROUP BY grupo_principal
    ORDER BY total DESC
    `,
    [ano],
  );

  return rows
    .filter((row) => row.grupo_principal)
    .map((row) => ({
      grupo: row.grupo_principal as string,
      total: row.total ?? 0,
      n: row.n ?? 0,
    }));
}

export interface AnnualTrendRow {
  ano: number;
  receitas: number;
  despesas: number;
  saldo: number;
}

/**
 * Réplica de get_annual_trend(include_imob=True) — evolução anual de
 * receitas/despesas/saldo, para o gráfico de área "Evolução Histórica".
 * Mesma lógica de netting de getYearSummary, agrupada por ano.
 */
export function getAnnualTrend(): AnnualTrendRow[] {
  const rows = query<{ ano: number; receitas: number | null; despesas: number | null; saldo: number | null }>(
    `
    SELECT
      ano,
      SUM(CASE WHEN tipo = 'Receita' AND is_poupanca = 0 AND is_controlo = 0
                    AND NOT (${ACERTOS}) THEN montante ELSE 0 END) AS receitas,
      SUM(CASE WHEN tipo = 'Despesa' AND is_poupanca = 0 AND is_controlo = 0 THEN montante ELSE 0 END)
        - SUM(CASE WHEN tipo = 'Receita' AND is_poupanca = 0 AND is_controlo = 0
                        AND ${REEMBOLSOS} THEN montante ELSE 0 END)
        - SUM(CASE WHEN tipo = 'Receita' AND is_poupanca = 0 AND is_controlo = 0
                        AND ${ACERTOS} THEN montante ELSE 0 END) AS despesas,
      SUM(CASE WHEN tipo = 'Receita' AND is_poupanca = 0 AND is_controlo = 0 THEN montante
               WHEN tipo = 'Despesa' AND is_poupanca = 0 AND is_controlo = 0 THEN -montante
               ELSE 0 END) AS saldo
    FROM transactions
    WHERE ano IS NOT NULL
    GROUP BY ano
    ORDER BY ano
    `,
  );

  return rows.map((row) => ({
    ano: row.ano,
    receitas: row.receitas ?? 0,
    despesas: row.despesas ?? 0,
    saldo: row.saldo ?? 0,
  }));
}

export interface TopCategoria {
  categoria: string;
  grupo: string | null;
  total: number;
  n: number;
  media: number;
}

/**
 * Réplica de get_top_categories(year, n=10, tipo="Despesas") — maiores
 * categorias de despesa do ano indicado. Sem filtro de is_imobiliario
 * (tal como o resto da Visão Geral); exclui poupança e controlo.
 */
export function getTopCategorias(ano: number, n = 10): TopCategoria[] {
  const rows = query<{
    categoria_normalizada: string | null;
    grupo_principal: string | null;
    total: number | null;
    n: number | null;
    media: number | null;
  }>(
    `
    SELECT categoria_normalizada, grupo_principal,
           SUM(montante) AS total, COUNT(*) AS n, AVG(montante) AS media
    FROM transactions
    WHERE ano = ? AND tipo = 'Despesa' AND is_poupanca = 0 AND is_controlo = 0
    GROUP BY categoria_normalizada, grupo_principal
    ORDER BY total DESC
    LIMIT ?
    `,
    [ano, n],
  );

  return rows
    .filter((row) => row.categoria_normalizada)
    .map((row) => ({
      categoria: row.categoria_normalizada as string,
      grupo: row.grupo_principal,
      total: row.total ?? 0,
      n: row.n ?? 0,
      media: row.media ?? 0,
    }));
}

export interface Anomalia {
  categoria: string;
  grupo: string | null;
  totalAtual: number;
  mediaHistorica: number;
  desvioPct: number;
  desvioAbs: number;
}

/**
 * Réplica de get_anomalies(year, threshold_pct) — categorias de despesa
 * cujo total no ano se desvia da média dos anos anteriores acima de
 * `thresholdPct`% e mais de 100€ em valor absoluto. `thresholdPct` vem de
 * finance_config.json (anomaly_threshold_pct, default 25 — ver
 * core/config.py DEFAULT_CONFIG no desktop).
 */
export function getAnomalias(ano: number, thresholdPct = 25): Anomalia[] {
  const anosAnteriores = getAvailableYears().filter((y) => y < ano);
  if (anosAnteriores.length === 0) return [];

  const placeholders = anosAnteriores.map(() => '?').join(',');
  const historico = query<{ categoria_normalizada: string | null; grupo_principal: string | null; media_hist: number | null }>(
    `
    SELECT categoria_normalizada, grupo_principal, AVG(total_anual) AS media_hist
    FROM (
      SELECT categoria_normalizada, grupo_principal, ano, SUM(montante) AS total_anual
      FROM transactions
      WHERE ano IN (${placeholders}) AND tipo = 'Despesa' AND is_poupanca = 0 AND is_controlo = 0
      GROUP BY categoria_normalizada, grupo_principal, ano
    )
    GROUP BY categoria_normalizada, grupo_principal
    `,
    anosAnteriores,
  );

  const atual = query<{ categoria_normalizada: string | null; grupo_principal: string | null; total_curr: number | null }>(
    `
    SELECT categoria_normalizada, grupo_principal, SUM(montante) AS total_curr
    FROM transactions
    WHERE ano = ? AND tipo = 'Despesa' AND is_poupanca = 0 AND is_controlo = 0
    GROUP BY categoria_normalizada, grupo_principal
    `,
    [ano],
  );

  if (historico.length === 0 || atual.length === 0) return [];

  const chave = (categoria: string | null, grupo: string | null) => `${categoria ?? ''} ${grupo ?? ''}`;
  const mediaPorChave = new Map(
    historico.map((row) => [chave(row.categoria_normalizada, row.grupo_principal), row.media_hist ?? 0]),
  );

  const anomalias: Anomalia[] = [];
  for (const row of atual) {
    const mediaHist = mediaPorChave.get(chave(row.categoria_normalizada, row.grupo_principal));
    // mediaHist === 0 seria SUM(montante)=0 num ano anterior — caso degenerado que
    // o desktop também não trata (dividiria por zero); excluído aqui em vez de
    // produzir Infinity/NaN na UI.
    if (mediaHist === undefined || !row.categoria_normalizada || mediaHist === 0) continue;
    const totalAtual = row.total_curr ?? 0;
    const desvioAbs = totalAtual - mediaHist;
    const desvioPct = (desvioAbs / mediaHist) * 100;
    if (Math.abs(desvioPct) >= thresholdPct && Math.abs(desvioAbs) > 100) {
      anomalias.push({
        categoria: row.categoria_normalizada,
        grupo: row.grupo_principal,
        totalAtual,
        mediaHistorica: mediaHist,
        desvioPct,
        desvioAbs,
      });
    }
  }

  return anomalias.sort((a, b) => b.desvioAbs - a.desvioAbs);
}

export interface BudgetVsActual {
  grupo: string;
  orcamento: number;
  realizado: number;
  desvio: number;
  /** null quando não há orçamento definido para o grupo (orçamento = 0). */
  pctExecucao: number | null;
}

/**
 * Réplica de get_budgets_vs_actual(year, budgets) — despesas reais do ano
 * por grupo principal vs orçamento anual (orçamento mensal de
 * finance_config.json × 12). Sem filtro de is_imobiliario (inclui
 * imobiliário, tal como o resto da Visão Geral).
 */
export function getBudgetsVsActual(ano: number, budgets: Record<string, number>): BudgetVsActual[] {
  const rows = query<{ grupo_principal: string | null; realizado: number | null }>(
    `
    SELECT grupo_principal, SUM(montante) AS realizado
    FROM transactions
    WHERE ano = ? AND tipo = 'Despesa' AND is_poupanca = 0 AND is_controlo = 0
    GROUP BY grupo_principal
    ORDER BY realizado DESC
    `,
    [ano],
  );

  return rows
    .filter((row) => row.grupo_principal)
    .map((row) => {
      const grupo = row.grupo_principal as string;
      const realizado = row.realizado ?? 0;
      const orcamento = (budgets[grupo] ?? 0) * 12;
      return {
        grupo,
        orcamento,
        realizado,
        desvio: realizado - orcamento,
        pctExecucao: orcamento > 0 ? (realizado / orcamento) * 100 : null,
      };
    });
}

export interface AdvancedKpis {
  receitasOp: number;
  despesasCorrentes: number;
  despesasTotais: number;
  custoMensal: number;
  mesesComDados: number;
  saldoReal: number;
  taxaPoupancaReal: number;
  custosHabitacao: number;
  racioHabitacao: number;
  inflacaoPessoal: number | null;
  inflacaoModo: 'ytd' | 'full' | null;
}

/**
 * Réplica de get_advanced_kpis(year) — tab "🎯 KPIs Avançados" de
 * dash_v1.py (2º separador do Dashboard no desktop, não da Análise —
 * apesar de ser pessoal/Philosophy B, a estrutura real do desktop tem-no
 * aqui, e replicamos a estrutura tal qual).
 *
 * IMPORTANTE — esta função tem a sua PRÓPRIA regra de exclusão de
 * despesas pontuais, diferente da usada no FIRE/Análise: exclui one-offs
 * do grupo "Empresas" acima de 10 000€ (NOT (grupo_principal='Empresas'
 * AND montante > 10000)), não a categoria "PL - Aquisição" usada em
 * despesasDeCapital.ts. São duas fórmulas desktop genuinamente
 * diferentes — não fundidas numa só, replicada cada uma exatamente onde
 * o desktop a usa. `autonomia_meses` é calculado no desktop mas nunca
 * consumido por nenhuma view (confirmado por grep) — código morto, não
 * replicado aqui.
 */
export function getAdvancedKpis(ano: number): AdvancedKpis {
  const receitasOp =
    query<{ v: number | null }>(
      `
      SELECT SUM(montante) AS v FROM transactions
      WHERE ano = ? AND tipo = 'Receita' AND is_controlo = 0 AND is_poupanca = 0
        AND is_imobiliario = 0 AND categoria_normalizada NOT LIKE 'R.Resgate%'
      `,
      [ano],
    )[0]?.v ?? 0;

  const despesasTotais =
    query<{ v: number | null }>(
      `
      SELECT SUM(montante) AS v FROM transactions
      WHERE ano = ? AND tipo = 'Despesa' AND is_poupanca = 0 AND is_controlo = 0 AND is_imobiliario = 0
      `,
      [ano],
    )[0]?.v ?? 0;

  const despesasCorrentes =
    query<{ v: number | null }>(
      `
      SELECT SUM(montante) AS v FROM transactions
      WHERE ano = ? AND tipo = 'Despesa' AND is_poupanca = 0 AND is_controlo = 0 AND is_imobiliario = 0
        AND NOT (grupo_principal = 'Empresas' AND montante > 10000)
      `,
      [ano],
    )[0]?.v ?? 0;

  const custosHabitacao =
    query<{ v: number | null }>(
      `
      SELECT SUM(montante) AS v FROM transactions
      WHERE ano = ? AND grupo_principal = 'Habitação' AND tipo = 'Despesa' AND is_controlo = 0
      `,
      [ano],
    )[0]?.v ?? 0;

  const mesesComDados =
    query<{ meses: number | null }>(
      `
      SELECT COUNT(DISTINCT mes) AS meses FROM transactions
      WHERE ano = ? AND tipo = 'Despesa' AND is_poupanca = 0 AND is_controlo = 0 AND is_imobiliario = 0
      `,
      [ano],
    )[0]?.meses ?? 1;

  const custoMensal = mesesComDados > 0 ? despesasCorrentes / mesesComDados : 0;
  const saldoReal = receitasOp - despesasCorrentes;
  const taxaPoupancaReal = receitasOp > 0 ? (saldoReal / receitasOp) * 100 : 0;
  const racioHabitacao = receitasOp > 0 ? (custosHabitacao / receitasOp) * 100 : 0;

  let inflacaoPessoal: number | null = null;
  let inflacaoModo: 'ytd' | 'full' | null = null;
  const anosAnteriores = getAvailableYears().filter((y) => y < ano);
  if (anosAnteriores.length > 0) {
    const anoAnterior = anosAnteriores[0] as number; // getAvailableYears() é descendente — o 1º é o mais recente
    const anoSistema = new Date().getFullYear();
    let untilDatePrev: string | null = null;
    if (ano === anoSistema) {
      const maxData = query<{ md: string | null }>(
        `SELECT MAX(data) AS md FROM transactions WHERE ano = ?`,
        [ano],
      )[0]?.md ?? null;
      if (maxData) untilDatePrev = `${anoAnterior}${maxData.slice(4)}`;
    }
    const params: (number | string)[] = [anoAnterior];
    let extraWhere = '';
    if (untilDatePrev) {
      extraWhere = ' AND data <= ?';
      params.push(untilDatePrev);
      inflacaoModo = 'ytd';
    } else {
      inflacaoModo = 'full';
    }
    const despPrev =
      query<{ v: number | null }>(
        `
        SELECT SUM(montante) AS v FROM transactions
        WHERE ano = ? AND tipo = 'Despesa' AND is_poupanca = 0 AND is_controlo = 0 AND is_imobiliario = 0
          AND NOT (grupo_principal = 'Empresas' AND montante > 10000)${extraWhere}
        `,
        params,
      )[0]?.v ?? 0;
    if (despPrev > 0) inflacaoPessoal = ((despesasCorrentes - despPrev) / despPrev) * 100;
  }

  return {
    receitasOp,
    despesasCorrentes,
    despesasTotais,
    custoMensal,
    mesesComDados,
    saldoReal,
    taxaPoupancaReal,
    custosHabitacao,
    racioHabitacao,
    inflacaoPessoal,
    inflacaoModo,
  };
}

export interface FixedVsVariableKpi {
  fixas: number;
  variaveis: number;
  total: number;
  pctFixas: number;
  /** false para 2015-2017 (dados legacy sem classificação fixa/variável fiável). */
  anoClassificado: boolean;
}

/**
 * Réplica de get_fixed_vs_variable(year) — usada só na tab "KPIs
 * Avançados" do Dashboard (ano único). Diferente de qualquer exclusão de
 * despesas de capital: aqui não há exclusão de PL-Aquisição nem de
 * Empresas>10k, só is_imobiliario=0 — replicada tal qual o desktop.
 */
export function getFixedVsVariableKpi(ano: number): FixedVsVariableKpi {
  const rows = query<{ fixas: number | null; variaveis: number | null; total: number | null; n: number | null }>(
    `
    SELECT
      SUM(CASE WHEN is_fixa = 1 THEN montante ELSE 0 END) AS fixas,
      SUM(CASE WHEN is_fixa = 0 THEN montante ELSE 0 END) AS variaveis,
      SUM(montante) AS total,
      COUNT(*) AS n
    FROM transactions
    WHERE ano = ? AND tipo = 'Despesa' AND is_poupanca = 0 AND is_controlo = 0 AND is_imobiliario = 0
    `,
    [ano],
  );

  if (!rows[0] || (rows[0].n ?? 0) === 0) {
    return { fixas: 0, variaveis: 0, total: 0, pctFixas: 0, anoClassificado: ano >= 2018 };
  }

  const fixas = rows[0].fixas ?? 0;
  const variaveis = rows[0].variaveis ?? 0;
  const total = rows[0].total ?? 0;

  return {
    fixas,
    variaveis,
    total,
    pctFixas: total > 0 ? (fixas / total) * 100 : 0,
    anoClassificado: ano >= 2018,
  };
}
