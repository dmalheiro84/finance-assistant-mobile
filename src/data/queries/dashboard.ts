// Queries do Dashboard (Visão Geral) — por implementar.
//
// Antes de escrever SQL aqui é preciso confirmar, no schema real da base
// carregada (visível na app via SchemaPanel, gerado por
// src/data/queries/schema.ts), os nomes de:
//   - tabela de transações/movimentos
//   - coluna de data
//   - coluna de valor
//   - coluna de tipo (receita/despesa) ou sinal do valor
//   - colunas de flags: is_poupanca, is_controlo, is_imobiliario
//
// Regras a aplicar assim que os nomes estiverem confirmados (CLAUDE.md):
//   - Dashboard Visão Geral inclui imobiliário (Philosophy B)
//   - excluir is_poupanca = 1 e is_controlo = 1
//   - formatação de moeda/data em src/theme/format.ts
//
// TODO: implementar getYearSummary(year) e getMonthlyEvolution(year) aqui,
// sem SQL fora deste ficheiro (CLAUDE.md, regra 6) — nunca no componente.
export {};
