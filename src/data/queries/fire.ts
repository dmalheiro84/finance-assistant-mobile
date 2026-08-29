import { query } from '../db';

// Queries do módulo FIRE — trajetória e taxa de cobertura de despesas
// por rendimento passivo (Barista FIRE).
//
// Confirmado com o utilizador: ao contrário da Análise, o FIRE INCLUI
// o rendimento passivo do imobiliário de arrendamento. Philosophy B
// separa os fluxos do imobiliário dos KPIs de finanças pessoais (para
// não os distorcer) — não significa ignorar o imobiliário sempre. O
// FIRE responde a "o que é que os meus ativos geram", a mesma lógica
// do Dashboard Visão Geral (include_imob=true).
//
// Rendimento passivo = rendimento líquido do imobiliário (rendas menos
// despesas das unidades, à semelhança de get_property_pnl() no
// desktop) + R.Investimentos (juros/dividendos).
//
// "Acertos" de inquilinos (categorias "... - Acertos") nunca contam
// como receita, mesmo estando marcadas tipo='Receita' nos dados —
// abatem à despesa do imobiliário (CLAUDE.md, Philosophy B). Tratá-los
// como receita inflacionaria artificialmente o rendimento passivo.
//
// Despesas de referência = despesas pessoais (a mesma base do módulo
// Análise): exclui imobiliário, poupança e controlo.

export interface FireYearData {
  ano: number;
  rendimentoImobiliario: number;
  rendimentoInvestimentos: number;
  rendimentoPassivo: number;
  despesasPessoais: number;
  /** rendimentoPassivo / despesasPessoais em percentagem (100 = despesas totalmente cobertas). */
  taxaCobertura: number;
}

export function getFireTrajectory(): FireYearData[] {
  const rows = query<{
    ano: number;
    receita_imob: number | null;
    despesa_imob: number | null;
    acertos: number | null;
    investimentos: number | null;
    despesas_pessoais: number | null;
  }>(
    `
    SELECT
      ano,
      SUM(CASE WHEN tipo = 'Receita' AND is_imobiliario = 1 AND categoria_normalizada NOT LIKE '%Acertos%' THEN montante ELSE 0 END) AS receita_imob,
      SUM(CASE WHEN tipo = 'Despesa' AND is_imobiliario = 1 THEN montante ELSE 0 END) AS despesa_imob,
      SUM(CASE WHEN tipo = 'Receita' AND is_imobiliario = 1 AND categoria_normalizada LIKE '%Acertos%' THEN montante ELSE 0 END) AS acertos,
      SUM(CASE WHEN categoria_normalizada = 'R.Investimentos' THEN montante ELSE 0 END) AS investimentos,
      SUM(CASE WHEN tipo = 'Despesa' AND is_imobiliario = 0 THEN montante ELSE 0 END) AS despesas_pessoais
    FROM transactions
    WHERE is_poupanca = 0 AND is_controlo = 0
    GROUP BY ano
    ORDER BY ano
    `,
  );

  return rows.map((row) => {
    const rendimentoImobiliario = (row.receita_imob ?? 0) - (row.despesa_imob ?? 0) + (row.acertos ?? 0);
    const rendimentoInvestimentos = row.investimentos ?? 0;
    const rendimentoPassivo = rendimentoImobiliario + rendimentoInvestimentos;
    const despesasPessoais = row.despesas_pessoais ?? 0;
    return {
      ano: row.ano,
      rendimentoImobiliario,
      rendimentoInvestimentos,
      rendimentoPassivo,
      despesasPessoais,
      taxaCobertura: despesasPessoais > 0 ? (rendimentoPassivo / despesasPessoais) * 100 : 0,
    };
  });
}
