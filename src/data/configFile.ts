// Parsing e validação do finance_config.json — segunda fonte de dados
// (a par do finance.db), usada pela app desktop para guardar valores de
// mercado de imóveis e veículos, que não vivem em lado nenhum do
// finance.db (confirmado por pesquisa exaustiva ao schema).
//
// O ficheiro real tem mais campos (preferences) que esta app não usa —
// extraímos property_config, patrimonio_config.veiculos, budgets e
// anomaly_threshold_pct (usados nos Alertas & Orçamento do Dashboard,
// tab "Alertas & Orçamento" de dash_v1.py) e ignoramos o resto. Nunca
// assumimos que o ficheiro está bem formado: é escolhido manualmente
// pelo utilizador, tal como o finance.db.

export interface PropertyConfig {
  chave: string;
  nome: string;
  tipo: string;
  valorMercado: number;
  anoAquisicao: number | null;
}

export interface VehicleConfig {
  nome: string;
  valor: number;
  ano: number | null;
}

export interface FinanceConfig {
  imoveis: PropertyConfig[];
  veiculos: VehicleConfig[];
  /** Orçamento mensal (€) por grupo principal — chaves iguais às de DEFAULT_CONFIG no desktop. */
  budgets: Record<string, number>;
  /** % de desvio vs média histórica a partir do qual uma categoria é assinalada como anomalia. */
  anomalyThresholdPct: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parsePropertyConfig(raw: unknown): PropertyConfig[] {
  if (!isRecord(raw)) return [];
  const imoveis: PropertyConfig[] = [];
  for (const [chave, valor] of Object.entries(raw)) {
    if (!isRecord(valor)) continue;
    const { nome, tipo, valor_mercado: valorMercado, ano_aquisicao: anoAquisicao } = valor;
    if (typeof nome !== 'string' || typeof tipo !== 'string' || typeof valorMercado !== 'number') {
      continue;
    }
    imoveis.push({
      chave,
      nome,
      tipo,
      valorMercado,
      anoAquisicao: typeof anoAquisicao === 'number' ? anoAquisicao : null,
    });
  }
  return imoveis;
}

function parseVeiculos(raw: unknown): VehicleConfig[] {
  if (!Array.isArray(raw)) return [];
  const veiculos: VehicleConfig[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const { nome, valor, ano } = item;
    if (typeof nome !== 'string' || typeof valor !== 'number') continue;
    veiculos.push({ nome, valor, ano: typeof ano === 'number' ? ano : null });
  }
  return veiculos;
}

function parseBudgets(raw: unknown): Record<string, number> {
  if (!isRecord(raw)) return {};
  const budgets: Record<string, number> = {};
  for (const [grupo, valor] of Object.entries(raw)) {
    if (typeof valor === 'number') budgets[grupo] = valor;
  }
  return budgets;
}

/**
 * Interpreta o texto do finance_config.json. Lança um erro com mensagem
 * amigável em PT-PT se o ficheiro não for um JSON válido ou não tiver
 * nenhuma das chaves esperadas — nunca inventa dados.
 */
export function parseFinanceConfig(text: string): FinanceConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('O ficheiro escolhido não é um JSON válido.');
  }

  if (!isRecord(parsed) || (!('property_config' in parsed) && !('patrimonio_config' in parsed))) {
    throw new Error(
      'O ficheiro escolhido não parece ser o finance_config.json — falta "property_config" e "patrimonio_config".',
    );
  }

  const patrimonioConfig = isRecord(parsed.patrimonio_config) ? parsed.patrimonio_config : {};
  const anomalyThresholdPct =
    typeof parsed.anomaly_threshold_pct === 'number' ? parsed.anomaly_threshold_pct : 25;

  return {
    imoveis: parsePropertyConfig(parsed.property_config),
    veiculos: parseVeiculos(patrimonioConfig.veiculos),
    budgets: parseBudgets(parsed.budgets),
    anomalyThresholdPct,
  };
}
