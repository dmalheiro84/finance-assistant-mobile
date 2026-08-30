import { query } from '../db';

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

/** Receitas, despesas (líquidas) e saldo do ano indicado, para os KPIs da Visão Geral. */
export function getYearSummary(ano: number): YearSummary {
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
    WHERE ano = ? AND is_poupanca = 0 AND is_controlo = 0
    `,
    [ano],
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
