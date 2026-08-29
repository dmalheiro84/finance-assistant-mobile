// Categorias que são despesas de capital pontuais (compra de um
// ativo), não custo de vida corrente — confirmado com o utilizador
// que devem ficar de fora das "despesas pessoais" usadas em Análise e
// FIRE. O Dashboard (Visão Geral) NÃO usa esta exclusão: mostra sempre
// o total real, capital incluído.
//
// Não é um filtro genérico por "Aquisição" no nome da categoria:
// "Volvo - Aquisição" são as prestações mensais do financiamento
// (is_fixa=1, frequencia='Mensal', 13 lançamentos ao longo de 2026) —
// uma despesa de vida corrente legítima. "PL - Aquisição" é a compra
// da casa própria (4 lançamentos, todos em 2016) — um evento pontual
// de capital. Só esta última entra na exclusão.
export const CATEGORIAS_DESPESA_DE_CAPITAL = `'PL - Aquisição'`;
