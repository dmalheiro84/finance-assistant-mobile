import { query } from '../db';
import { CATEGORIAS_DESPESA_DE_CAPITAL } from './despesasDeCapital';

// Queries do módulo Análise, sobre a tabela `transactions`.
//
// Regras aplicadas (CLAUDE.md):
//   - Análise fina é apenas pessoal (Philosophy B) — exclui is_imobiliario=1.
//     Confirmado no schema real: is_imobiliario=1 coincide exatamente com
//     grupo_principal='Imobiliário' (868/868 linhas).
//   - Exclui sempre is_poupanca=1 e is_controlo=1 (mesma regra do Dashboard).
//   - Exclui despesas de capital pontuais (ver despesasDeCapital.ts) —
//     confirmado com o utilizador: distorcem a análise de custo de vida
//     corrente. O Dashboard não aplica esta exclusão.
//   - Breakdown fixo/variável só é fiável de 2018 em diante: confirmado que
//     `frequencia`/`is_fixa` são sempre NULL/0 antes de 2018 (dados legacy
//     sem esta classificação) — por isso qualquer período que inclua anos
//     <2018 devolve fiavel=false, e o UI tem de mostrar aviso em vez de
//     apresentar os valores como fiáveis.
//   - `categoria_normalizada` é a rubrica; `grupo_principal` é o grupo.

const FILTRO_BASE = `tipo = 'Despesa' AND is_imobiliario = 0 AND is_poupanca = 0 AND is_controlo = 0 AND categoria_normalizada NOT IN (${CATEGORIAS_DESPESA_DE_CAPITAL})`;

export interface ExpenseByGroup {
  grupo: string;
  despesas: number;
}

export interface ExpenseByCategory {
  grupo: string;
  categoria: string;
  despesas: number;
}

export interface FixedVariableBreakdown {
  fixo: number;
  variavel: number;
  /** false quando o período inclui anos anteriores a 2018 (dados legacy sem classificação fiável). */
  fiavel: boolean;
}

/** Despesas agregadas por grupo principal, no período [anoInicio, anoFim]. */
export function getExpensesByGroup(anoInicio: number, anoFim: number): ExpenseByGroup[] {
  const rows = query<{ grupo_principal: string; despesas: number | null }>(
    `
    SELECT grupo_principal, SUM(montante) AS despesas
    FROM transactions
    WHERE ${FILTRO_BASE} AND ano BETWEEN ? AND ?
    GROUP BY grupo_principal
    ORDER BY despesas DESC
    `,
    [anoInicio, anoFim],
  );
  return rows.map((row) => ({ grupo: row.grupo_principal, despesas: row.despesas ?? 0 }));
}

/** Despesas agregadas por rubrica (categoria_normalizada), no período [anoInicio, anoFim]. */
export function getExpensesByCategory(anoInicio: number, anoFim: number): ExpenseByCategory[] {
  const rows = query<{ grupo_principal: string; categoria_normalizada: string; despesas: number | null }>(
    `
    SELECT grupo_principal, categoria_normalizada, SUM(montante) AS despesas
    FROM transactions
    WHERE ${FILTRO_BASE} AND ano BETWEEN ? AND ?
    GROUP BY grupo_principal, categoria_normalizada
    ORDER BY despesas DESC
    `,
    [anoInicio, anoFim],
  );
  return rows.map((row) => ({
    grupo: row.grupo_principal,
    categoria: row.categoria_normalizada,
    despesas: row.despesas ?? 0,
  }));
}

/**
 * Breakdown fixo vs. variável no período [anoInicio, anoFim]. `fiavel` fica
 * false se o período incluir algum ano anterior a 2018 — nesse caso os
 * valores ainda são devolvidos (podem ser úteis), mas o UI tem de os
 * apresentar com aviso, nunca como dado fiável.
 */
export function getFixedVariableBreakdown(anoInicio: number, anoFim: number): FixedVariableBreakdown {
  const rows = query<{ fixo: number | null; variavel: number | null }>(
    `
    SELECT
      SUM(CASE WHEN is_fixa = 1 THEN montante ELSE 0 END) AS fixo,
      SUM(CASE WHEN is_fixa = 0 THEN montante ELSE 0 END) AS variavel
    FROM transactions
    WHERE ${FILTRO_BASE} AND ano BETWEEN ? AND ?
    `,
    [anoInicio, anoFim],
  );
  return {
    fixo: rows[0]?.fixo ?? 0,
    variavel: rows[0]?.variavel ?? 0,
    fiavel: anoInicio >= 2018,
  };
}

/** Anos com dados disponíveis (para o filtro de período), do mais recente para o mais antigo. */
export function getAvailableYears(): number[] {
  const rows = query<{ ano: number }>(`SELECT DISTINCT ano FROM transactions ORDER BY ano DESC`);
  return rows.map((row) => row.ano);
}
