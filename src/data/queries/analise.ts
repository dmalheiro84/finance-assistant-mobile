import { query } from '../db';

// Queries do módulo Análise, sobre a tabela `transactions`.
//
// Replica exatamente app/views/analysis.py + as funções correspondentes de
// app/core/db.py no repo dmalheiro84/FinanceAssistant (fonte de verdade —
// ver CLAUDE.md). O desktop tem 4 separadores nesta página — Por Grupo,
// Por Categoria, Comparação de Anos, Transacções — e esta página replica
// os 4, um a um, com a mesma lógica de filtros:
//
//   - "Despesas": tipo='Despesa' AND is_poupanca=0 AND is_controlo=0
//   - "Receitas": tipo='Receita' AND is_poupanca=0 AND is_controlo=0
//   - "Todos" (get_grupos/get_top_categories): só exclui is_controlo=1 —
//     inclui poupança. Nota: isto é DIFERENTE do "Todos" da Transacções
//     (get_transactions), que não filtra nada — nem controlo nem poupança.
//     Cada função replica o "Todos" da sua função desktop correspondente,
//     nunca um significado genérico único.
//
// Nenhuma destas queries exclui imobiliário nem despesas de capital
// pontuais (PL - Aquisição) — o desktop não aplica essas exclusões aqui,
// só em get_advanced_kpis/get_fixed_vs_variable (tab "KPIs Avançados" do
// Dashboard) e no FIRE. Ver src/data/queries/dashboard.ts e fire.ts.

export type TipoAnalise = 'Despesas' | 'Receitas' | 'Todos';

function whereTipo(tipo: TipoAnalise): string {
  if (tipo === 'Despesas') return `tipo = 'Despesa' AND is_poupanca = 0 AND is_controlo = 0`;
  if (tipo === 'Receitas') return `tipo = 'Receita' AND is_poupanca = 0 AND is_controlo = 0`;
  return `is_controlo = 0`;
}

/** Anos com dados disponíveis, do mais recente para o mais antigo. */
export function getAvailableYears(): number[] {
  const rows = query<{ ano: number }>(`SELECT DISTINCT ano FROM transactions ORDER BY ano DESC`);
  return rows.map((row) => row.ano);
}

/** Réplica de get_grupos(year, tipo) — grupos disponíveis para o ano e tipo indicados. */
export function getGrupos(ano: number, tipo: TipoAnalise): string[] {
  const rows = query<{ grupo_principal: string | null }>(
    `
    SELECT DISTINCT grupo_principal FROM transactions
    WHERE ano = ? AND ${whereTipo(tipo)} AND grupo_principal IS NOT NULL AND grupo_principal != ''
    ORDER BY grupo_principal
    `,
    [ano],
  );
  return rows.map((row) => row.grupo_principal).filter((g): g is string => g !== null);
}

export interface CategoriaAnalise {
  categoria: string;
  grupo: string | null;
  total: number;
  n: number;
  media: number;
}

/** Réplica de get_top_categories(year, n, grupo, tipo) — tab "Por Grupo". */
export function getTopCategoriesAnalise(
  ano: number,
  tipo: TipoAnalise,
  grupo: string | null,
  n = 20,
): CategoriaAnalise[] {
  const params: (number | string)[] = [ano];
  let where = `${whereTipo(tipo)} AND ano = ?`;
  if (grupo && grupo !== 'Todos') {
    where += ` AND grupo_principal = ?`;
    params.push(grupo);
  }
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
    FROM transactions WHERE ${where}
    GROUP BY categoria_normalizada, grupo_principal
    ORDER BY total DESC
    LIMIT ?
    `,
    [...params, n],
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

export interface GroupTrendRow {
  ano: number;
  total: number;
  n: number;
}

/** Réplica de get_group_trend(grupo, tipo) — evolução anual de um grupo específico. */
export function getGroupTrend(grupo: string, tipo: 'Despesas' | 'Receitas'): GroupTrendRow[] {
  const where =
    tipo === 'Despesas'
      ? `tipo = 'Despesa' AND is_poupanca = 0 AND is_controlo = 0`
      : `tipo = 'Receita' AND is_controlo = 0`;
  const rows = query<{ ano: number; total: number | null; n: number | null }>(
    `
    SELECT ano, SUM(montante) AS total, COUNT(*) AS n
    FROM transactions
    WHERE grupo_principal = ? AND ${where}
    GROUP BY ano ORDER BY ano
    `,
    [grupo],
  );
  return rows.map((row) => ({ ano: row.ano, total: row.total ?? 0, n: row.n ?? 0 }));
}

export interface AnnualTrendPersonalRow {
  ano: number;
  receitas: number;
  despesas: number;
  saldo: number;
}

/**
 * Réplica de get_annual_trend(include_imob=False) — evolução anual pessoal
 * (exclui imobiliário), usada em "Por Grupo" quando o filtro Grupo = Todos.
 * Diferente de getAnnualTrend() em dashboard.ts, que é sempre total
 * (include_imob=True) — são dois modos distintos da mesma função desktop.
 */
export function getAnnualTrendPersonal(): AnnualTrendPersonalRow[] {
  const rows = query<{ ano: number; receitas: number | null; despesas: number | null; saldo: number | null }>(
    `
    SELECT ano,
      SUM(CASE WHEN tipo = 'Receita' AND is_poupanca = 0 AND is_controlo = 0 AND is_imobiliario = 0 THEN montante ELSE 0 END) AS receitas,
      SUM(CASE WHEN tipo = 'Despesa' AND is_poupanca = 0 AND is_controlo = 0 AND is_imobiliario = 0 THEN montante ELSE 0 END) AS despesas,
      SUM(CASE WHEN tipo = 'Receita' AND is_poupanca = 0 AND is_controlo = 0 AND is_imobiliario = 0 THEN montante
               WHEN tipo = 'Despesa' AND is_poupanca = 0 AND is_controlo = 0 AND is_imobiliario = 0 THEN -montante
               ELSE 0 END) AS saldo
    FROM transactions WHERE montante IS NOT NULL AND ano IS NOT NULL
    GROUP BY ano ORDER BY ano
    `,
  );
  return rows.map((row) => ({
    ano: row.ano,
    receitas: row.receitas ?? 0,
    despesas: row.despesas ?? 0,
    saldo: row.saldo ?? 0,
  }));
}

export interface MonthlyComparisonRow {
  mes: number;
  total1: number | null;
  total2: number | null;
}

/** Réplica de get_monthly_by_tipo(year1, year2, tipo, grupo) — tab "Comparação de Anos". */
export function getMonthlyComparison(
  ano1: number,
  ano2: number,
  tipo: 'Despesas' | 'Receitas',
  grupo: string | null,
): MonthlyComparisonRow[] {
  const where =
    tipo === 'Despesas'
      ? `tipo = 'Despesa' AND is_poupanca = 0 AND is_controlo = 0`
      : `tipo = 'Receita' AND is_poupanca = 0 AND is_controlo = 0`;
  const grupoFiltro = grupo && grupo !== 'Todos' ? ` AND grupo_principal = ?` : '';

  const porAno = (ano: number): Map<number, number> => {
    const params: (number | string)[] = [ano];
    if (grupo && grupo !== 'Todos') params.push(grupo);
    const rows = query<{ mes: number; total: number | null }>(
      `
      SELECT mes, SUM(montante) AS total
      FROM transactions
      WHERE ano = ? AND ${where}${grupoFiltro}
      GROUP BY mes ORDER BY mes
      `,
      params,
    );
    return new Map(rows.map((row) => [row.mes, row.total ?? 0]));
  };

  const mapa1 = porAno(ano1);
  const mapa2 = porAno(ano2);
  const meses = new Set([...mapa1.keys(), ...mapa2.keys()]);

  return Array.from(meses)
    .sort((a, b) => a - b)
    .map((mes) => ({ mes, total1: mapa1.get(mes) ?? null, total2: mapa2.get(mes) ?? null }));
}

/** Réplica de get_all_categories(tipo) — lista de categorias para o multi-select "Por Categoria". */
export function getAllCategories(tipo: TipoAnalise): string[] {
  const rows = query<{ categoria_normalizada: string | null }>(
    `
    SELECT DISTINCT categoria_normalizada FROM transactions
    WHERE ${whereTipo(tipo)} AND categoria_normalizada IS NOT NULL AND categoria_normalizada != ''
    ORDER BY categoria_normalizada
    `,
  );
  return rows.map((row) => row.categoria_normalizada).filter((c): c is string => c !== null);
}

export interface CategoryAnnualRow {
  ano: number;
  categoria: string;
  grupo: string | null;
  total: number;
  n: number;
  media: number;
}

/** Réplica de get_category_annual(categorias) — evolução anual de categorias seleccionadas. */
export function getCategoryAnnual(categorias: string[]): CategoryAnnualRow[] {
  if (categorias.length === 0) return [];
  const placeholders = categorias.map(() => '?').join(',');
  const rows = query<{
    ano: number;
    categoria_normalizada: string;
    grupo_principal: string | null;
    total: number | null;
    n: number | null;
    media: number | null;
  }>(
    `
    SELECT ano, categoria_normalizada, grupo_principal,
           SUM(montante) AS total, COUNT(*) AS n, AVG(montante) AS media
    FROM transactions
    WHERE categoria_normalizada IN (${placeholders}) AND montante IS NOT NULL AND ano IS NOT NULL
    GROUP BY ano, categoria_normalizada, grupo_principal
    ORDER BY ano, total DESC
    `,
    categorias,
  );
  return rows.map((row) => ({
    ano: row.ano,
    categoria: row.categoria_normalizada,
    grupo: row.grupo_principal,
    total: row.total ?? 0,
    n: row.n ?? 0,
    media: row.media ?? 0,
  }));
}

export interface CategoryMonthlyRow {
  ano: number;
  mes: number;
  categoria: string;
  total: number;
  n: number;
}

/** Réplica de get_category_monthly(categorias, year) — evolução mensal de categorias seleccionadas. */
export function getCategoryMonthly(categorias: string[], ano?: number): CategoryMonthlyRow[] {
  if (categorias.length === 0) return [];
  const placeholders = categorias.map(() => '?').join(',');
  const params: (string | number)[] = [...categorias];
  let yearFilter = '';
  if (ano) {
    yearFilter = ' AND ano = ?';
    params.push(ano);
  }
  const rows = query<{
    ano: number;
    mes: number;
    categoria_normalizada: string;
    total: number | null;
    n: number | null;
  }>(
    `
    SELECT ano, mes, categoria_normalizada, SUM(montante) AS total, COUNT(*) AS n
    FROM transactions
    WHERE categoria_normalizada IN (${placeholders}) AND montante IS NOT NULL${yearFilter}
    GROUP BY ano, mes, categoria_normalizada
    ORDER BY ano, mes
    `,
    params,
  );
  return rows.map((row) => ({
    ano: row.ano,
    mes: row.mes,
    categoria: row.categoria_normalizada,
    total: row.total ?? 0,
    n: row.n ?? 0,
  }));
}

export interface CategoryStatsRow {
  categoria: string;
  grupo: string | null;
  anosAtivos: number;
  totalHistorico: number;
  mediaTransacao: number;
  minTransacao: number;
  maxTransacao: number;
  nTransacoes: number;
  primeiraData: string | null;
  ultimaData: string | null;
}

/** Réplica de get_category_stats(categorias) — estatísticas históricas por categoria. */
export function getCategoryStats(categorias: string[]): CategoryStatsRow[] {
  if (categorias.length === 0) return [];
  const placeholders = categorias.map(() => '?').join(',');
  const rows = query<{
    categoria_normalizada: string;
    grupo_principal: string | null;
    anos_activos: number | null;
    total_historico: number | null;
    media_transacao: number | null;
    min_transacao: number | null;
    max_transacao: number | null;
    n_transacoes: number | null;
    primeira_data: string | null;
    ultima_data: string | null;
  }>(
    `
    SELECT categoria_normalizada, grupo_principal,
           COUNT(DISTINCT ano) AS anos_activos,
           SUM(montante) AS total_historico,
           AVG(montante) AS media_transacao,
           MIN(montante) AS min_transacao,
           MAX(montante) AS max_transacao,
           COUNT(*) AS n_transacoes,
           MIN(data) AS primeira_data,
           MAX(data) AS ultima_data
    FROM transactions
    WHERE categoria_normalizada IN (${placeholders}) AND montante IS NOT NULL
    GROUP BY categoria_normalizada, grupo_principal
    ORDER BY total_historico DESC
    `,
    categorias,
  );
  return rows.map((row) => ({
    categoria: row.categoria_normalizada,
    grupo: row.grupo_principal,
    anosAtivos: row.anos_activos ?? 0,
    totalHistorico: row.total_historico ?? 0,
    mediaTransacao: row.media_transacao ?? 0,
    minTransacao: row.min_transacao ?? 0,
    maxTransacao: row.max_transacao ?? 0,
    nTransacoes: row.n_transacoes ?? 0,
    primeiraData: row.primeira_data,
    ultimaData: row.ultima_data,
  }));
}
