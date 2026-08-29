# CLAUDE.md — Finance Assistant Mobile

## O que é este projeto

PWA de **consulta (read-only)** de finanças pessoais do Diogo. Lê duas fontes de dados geradas pela app desktop — o `finance.db` (SQLite, ~3 MB) e, opcionalmente, o `finance_config.json` (valores de mercado de imóveis/veículos, sem os quais o Património não existe no `finance.db`) — abre-as no browser (sql.js para o `.db`, `JSON.parse` validado para o config) e apresenta 6 módulos de análise. Não existe backend nem servidor: React + Vite + TypeScript, alojado em GitHub Pages, instalável como PWA.

A app desktop original (Python/Streamlit) continua a ser a única a **escrever** dados (ETL semanal). Esta app **nunca modifica** o `finance.db` nem o `finance_config.json`.

A especificação completa está em `docs/especificacao.md`. Em caso de dúvida, a especificação manda.

## Regras invioláveis

1. **PT-PT em tudo**: interface, labels, mensagens de erro, comentários de código. Português europeu — "Actualizar/Atualizar dados", "Poupança", "Património"; nunca grafias ou vocabulário do PT-BR (ex.: "usuário" → "utilizador", "salvar" → "guardar").
2. **Read-only**: nenhuma operação de escrita sobre a base de dados, nem UI que sugira edição.
3. **Philosophy B** — separação do imobiliário (unidades 5L, 7D, 7E — arrendadas; PL é a habitação própria, nunca entra neste grupo):
   - Dashboard Visão Geral: totais **com** imobiliário (`include_imob = true`)
   - KPIs Avançados / análise fina (Análise): **apenas pessoal** (excluir `is_imobiliario = 1`)
   - FIRE: **inclui** o rendimento líquido do imobiliário de arrendamento (rendas − despesas das unidades) no rendimento passivo — Philosophy B separa os fluxos do imobiliário dos KPIs de finanças pessoais para não os distorcer, não significa ignorá-lo sempre; o FIRE pergunta "o que é que os meus ativos geram", a mesma lógica do `include_imob=true` do Dashboard
   - Acertos de inquilinos = abatimento de despesa, nunca receita, mesmo estando marcados `tipo='Receita'` nos dados — aplicar sempre que se somar receita/despesa do imobiliário (Análise, FIRE, futuro P&L por unidade)
   - P&L do imobiliário é análise separada, por unidade
   - No Património, distinguir sempre habitação própria (`property_config` com `tipo="Habitação Própria"`) dos imóveis de arrendamento (restantes)
4. **Flags de schema a respeitar em todas as queries**:
   - `is_poupanca = 1` → neutro em P&L, FIRE e dashboard (inclui `R.Empréstimo Volvo`)
   - `is_controlo = 1` → excluir de todas as análises
   - `is_imobiliario` → ver regra 3
   - `is_fixa` / `frequencia` → breakdown fixo/variável **apenas fiável de 2018 em diante**; para 2015–2017 mostrar aviso e não apresentar como fiável
5. **Formatação**: moeda em EUR com convenção portuguesa (1 234,56 €), datas DD/MM/AAAA.
6. **Camadas separadas**: SQL vive exclusivamente em `src/data/queries/`; componentes e páginas nunca contêm SQL.
7. **Sem segredos no repo**: apenas o `clientId` do Entra ID (público por natureza em SPAs) pode estar na config. Nunca commitar tokens, API keys, o próprio `finance.db` ou o `finance_config.json` (nem fixtures com valores reais — usar sempre dados fictícios).

## Stack e convenções

- React 18 + Vite + TypeScript estrito
- MUI (Material Design 3), tema claro/escuro pelo sistema
- Recharts para gráficos
- `@azure/msal-browser` (fluxo PKCE, contas Microsoft pessoais)
- sql.js para SQLite em WebAssembly; cache do `.db` em IndexedDB
- vite-plugin-pwa; `base` do Vite configurado para o path do GitHub Pages
- Navegação: bottom navigation (telemóvel) / rail (tablet)
- Ordem dos módulos (paridade com o desktop): Dashboard → Análise → Património → Investimentos → FIRE
- Botão "🔄 Actualizar dados" sempre acessível; cabeçalho mostra "Dados de DD/MM/AAAA HH:mm"

## Regras de dados aprendidas no desktop (não redescobrir)

- **Portfólio total** = soma dos valores mais recentes de cada produto **na data global mais recente** — nunca a data máxima por produto, nunca a linha-resumo "Portfolio"
- **Estado ativo/terminado** de um investimento = último valor do produto (`ultimo_valor = 0` → terminado)
- EVs em Portugal estão **isentos** de IUC (não é taxa reduzida)
- **Imóveis e veículos não existem no `finance.db`** (confirmado por pesquisa exaustiva ao schema) — só o `finance_config.json` os tem, em `property_config` (imóveis, chave = código da unidade) e `patrimonio_config.veiculos` (lista). Fonte opcional: sem ela, o Património mostra "Sem dados de origem" nesses cartões, nunca um valor inventado.
- **Nenhuma fonte de dados regista passivos** (crédito habitação, financiamento de veículos). O total combinado de ativos no Património é por isso sempre "ativos brutos", nunca "valor líquido" — não implementar um cálculo de valor líquido patrimonial sem antes confirmar onde vivem os passivos.
- **Despesas de capital pontuais excluem-se das "despesas pessoais"** (Análise e FIRE, nunca do Dashboard): confirmado que `PL - Aquisição` é a compra da habitação própria (2016, evento único) — ver `src/data/queries/despesasDeCapital.ts`. Não confundir com `Volvo - Aquisição`, que são as prestações **mensais** do financiamento (`is_fixa=1`, `frequencia='Mensal'`) e continuam a contar como despesa de vida corrente — a exclusão é por categoria específica, nunca por padrão genérico no nome ("Aquisição").
- **`R.Investimentos`** (juros/dividendos) só conta como rendimento passivo real quando `is_controlo=0`: confirmado que os registos `is_controlo=1` desta categoria são micro-lançamentos (média ~9 €, 184 linhas) muito diferentes dos ~33 registos reais (média ~230 €) — a flag `is_controlo` aplica-se normalmente, sem exceção.

## Fluxo de trabalho

- Validar cada módulo lado a lado com a app desktop (mesmo `finance.db`) antes de o dar por concluído
- Commits pequenos e frequentes, mensagens em PT-PT
- `npm run build` tem de passar sem erros antes de qualquer commit
