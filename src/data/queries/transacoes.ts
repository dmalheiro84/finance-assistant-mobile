import { query } from '../db';

// Queries do separador "Transacções" da Análise — pesquisa/filtro de
// movimentos individuais. Replica exatamente get_transactions(...) e o
// uso de get_grupos(...) em app/views/analysis.py::_render_transactions
// (fonte de verdade — ver CLAUDE.md).
//
// Ao contrário das restantes queries de Análise, "Todos" aqui não filtra
// nada — nem is_poupanca nem is_controlo: o objetivo deste separador é
// deixar ver TODOS os movimentos, incluindo poupança/controlo, para que o
// utilizador perceba porque é que ficam de fora dos totais de outros
// separadores (nunca desaparecem silenciosamente).

export type TipoTransacoes = 'Todos' | 'Despesas' | 'Receitas' | 'Controlo';

export interface TransacoesFiltro {
  ano?: number;
  mes?: number;
  grupo?: string;
  tipo?: TipoTransacoes;
  pesquisa?: string;
  limite?: number;
}

export interface Transacao {
  id: number;
  data: string | null;
  categoria: string | null;
  grupo: string | null;
  tipo: string | null;
  montante: number;
  comentario: string | null;
  modo: string | null;
  categoriaOriginal: string | null;
  isPoupanca: boolean;
  isControlo: boolean;
  isImobiliario: boolean;
}

/**
 * Réplica de get_transactions(year, mes, grupo, tipo, search, limit=500).
 * O total mostrado no cabeçalho da lista é sempre a soma do conjunto
 * devolvido (já limitado por `limite`), tal como no desktop — nunca uma
 * soma separada de todas as linhas que correspondem ao filtro.
 */
export function getTransacoes(filtro: TransacoesFiltro): Transacao[] {
  const wherePartes = ['montante IS NOT NULL'];
  const params: (string | number)[] = [];

  if (filtro.ano) {
    wherePartes.push('ano = ?');
    params.push(filtro.ano);
  }
  if (filtro.mes) {
    wherePartes.push('mes = ?');
    params.push(filtro.mes);
  }
  if (filtro.grupo && filtro.grupo !== 'Todos') {
    wherePartes.push('grupo_principal = ?');
    params.push(filtro.grupo);
  }
  if (filtro.tipo === 'Despesas') {
    wherePartes.push(`tipo = 'Despesa' AND is_poupanca = 0 AND is_controlo = 0`);
  } else if (filtro.tipo === 'Receitas') {
    wherePartes.push(`tipo = 'Receita' AND is_controlo = 0`);
  } else if (filtro.tipo === 'Controlo') {
    wherePartes.push('is_controlo = 1');
  }
  if (filtro.pesquisa) {
    wherePartes.push('(categoria_normalizada LIKE ? OR comentario LIKE ?)');
    const termo = `%${filtro.pesquisa}%`;
    params.push(termo, termo);
  }

  const limite = filtro.limite ?? 500;

  const rows = query<{
    id: number;
    data: string | null;
    categoria: string | null;
    grupo: string | null;
    tipo: string | null;
    montante: number | null;
    comentario: string | null;
    modo: string | null;
    categoria_original: string | null;
    is_poupanca: number;
    is_controlo: number;
    is_imobiliario: number;
  }>(
    `
    SELECT id, data, categoria_normalizada AS categoria, grupo_principal AS grupo, tipo, montante,
           comentario, modo_normalizado AS modo, categoria_original,
           is_poupanca, is_controlo, is_imobiliario
    FROM transactions
    WHERE ${wherePartes.join(' AND ')}
    ORDER BY data DESC
    LIMIT ?
    `,
    [...params, limite],
  );

  return rows.map((row) => ({
    id: row.id,
    data: row.data,
    categoria: row.categoria,
    grupo: row.grupo,
    tipo: row.tipo,
    montante: row.montante ?? 0,
    comentario: row.comentario,
    modo: row.modo,
    categoriaOriginal: row.categoria_original,
    isPoupanca: row.is_poupanca === 1,
    isControlo: row.is_controlo === 1,
    isImobiliario: row.is_imobiliario === 1,
  }));
}

/**
 * Réplica de get_grupos(year, tipo) tal como chamada em
 * _render_transactions — "Todos" e "Controlo" caem ambos no ramo
 * `is_controlo=0` da função original (só "Despesas"/"Receitas" têm ramo
 * próprio). Para tipo="Controlo" isto é uma inconsistência do próprio
 * desktop (a lista de grupos fica calculada sobre movimentos SEM
 * controlo, enquanto a lista de transacções mostrada é só de controlo) —
 * replicada tal qual, não corrigida por nós.
 */
export function getGruposTransacoes(ano: number, tipo: TipoTransacoes): string[] {
  let where: string;
  if (tipo === 'Despesas') where = `tipo = 'Despesa' AND is_poupanca = 0 AND is_controlo = 0`;
  else if (tipo === 'Receitas') where = `tipo = 'Receita' AND is_poupanca = 0 AND is_controlo = 0`;
  else where = `is_controlo = 0`;

  const rows = query<{ grupo_principal: string | null }>(
    `
    SELECT DISTINCT grupo_principal FROM transactions
    WHERE ano = ? AND ${where} AND grupo_principal IS NOT NULL AND grupo_principal != ''
    ORDER BY grupo_principal
    `,
    [ano],
  );
  return rows.map((row) => row.grupo_principal).filter((g): g is string => g !== null);
}
