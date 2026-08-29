import { query } from '../db';

// Queries do Dashboard (Visão Geral), sobre a tabela `transactions`.
//
// Regras aplicadas (CLAUDE.md):
//   - inclui imobiliário (Philosophy B, Visão Geral: include_imob=true) —
//     por isso NÃO filtramos por is_imobiliario.
//   - exclui sempre is_poupanca=1 e is_controlo=1. Estas flags mandam
//     sobre o `tipo`: há linhas com tipo='Despesa'/'Receita' marcadas
//     is_controlo=1 (ex.: "Controlo - CO Pagamentos Via Verde") ou
//     is_poupanca=1 que têm de ficar neutras — confirmado no schema real.
//   - `tipo` distingue receita/despesa; linhas com tipo='Controlo' ou
//     'Poupanca' nunca contam para receitas/despesas (o CASE só soma
//     'Receita'/'Despesa').

export interface YearSummary {
  receitas: number;
  despesas: number;
  saldo: number;
}

export interface MonthlyEvolutionRow {
  ano: number;
  mes: number;
  receitas: number;
  despesas: number;
}

/** Receitas, despesas e saldo do ano indicado, para os KPIs da Visão Geral. */
export function getYearSummary(ano: number): YearSummary {
  const rows = query<{ receitas: number | null; despesas: number | null }>(
    `
    SELECT
      SUM(CASE WHEN tipo = 'Receita' THEN montante ELSE 0 END) AS receitas,
      SUM(CASE WHEN tipo = 'Despesa' THEN montante ELSE 0 END) AS despesas
    FROM transactions
    WHERE ano = ? AND is_poupanca = 0 AND is_controlo = 0
    `,
    [ano],
  );

  const receitas = rows[0]?.receitas ?? 0;
  const despesas = rows[0]?.despesas ?? 0;
  return { receitas, despesas, saldo: receitas - despesas };
}

/** Receitas e despesas por mês do ano indicado, para o gráfico de evolução. */
export function getMonthlyEvolution(ano: number): MonthlyEvolutionRow[] {
  const rows = query<{ mes: number; receitas: number | null; despesas: number | null }>(
    `
    SELECT
      mes,
      SUM(CASE WHEN tipo = 'Receita' THEN montante ELSE 0 END) AS receitas,
      SUM(CASE WHEN tipo = 'Despesa' THEN montante ELSE 0 END) AS despesas
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
