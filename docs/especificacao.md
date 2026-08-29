# Finance Assistant Mobile — Especificação (PWA)

**Versão:** 1.0 · Agosto 2026
**Autor:** Diogo (com apoio do Claude)
**Estado:** Rascunho para arranque de desenvolvimento

---

## 1. Problema e contexto

O Finance Assistant existe hoje como aplicação desktop (Python/Streamlit + SQLite) e só é utilizável no PC. O Diogo pretende consultar os seus dados financeiros (2015–2026) em qualquer dispositivo Android — tablet ou telemóvel — sem depender de o PC estar ligado. A atualização dos dados continua a ser feita exclusivamente no PC (ETL semanal sobre os ficheiros `.xlsm`), pelo que a app móvel é **estritamente de consulta (read-only)**.

## 2. Objetivos

1. Consultar Dashboard, Análise, Património, Investimentos e FIRE em qualquer dispositivo Android, com o PC desligado.
2. Dados sempre atualizáveis a partir do `finance.db`, com um toque ("Actualizar dados"). Na v1 isto é uma importação manual do ficheiro a partir do dispositivo (ver §5); a sincronização automática a partir do OneDrive via Microsoft Graph é a evolução prevista, atrás de uma flag.
3. Zero infraestrutura própria: sem servidor, sem backend, sem custos recorrentes.
4. Privacidade total: os dados nunca saem do dispositivo do Diogo (v1) ou circulam apenas entre o OneDrive e o dispositivo (evolução) — nunca por servidores de terceiros.
5. Funcionamento offline após a primeira importação/sincronização (cache local do `finance.db`).

## 3. Não-objetivos

- **ETL e upload de ficheiros** — permanecem no desktop; a app móvel nunca escreve no `finance.db`.
- **App nativa Android (APK)** — descartada nesta fase; a PWA cobre a necessidade sem passos de compilação/instalação. Reavaliar apenas se a PWA falhar em performance ou UX.
- **Edição de dados ou configurações** (mapeamentos, rubricas, `frequencia`) — só no desktop.
- **Multi-utilizador** — app pessoal, uma única conta Microsoft.
- **AI Insights na v1** — considerado para fase posterior (ver §10).

## 4. Arquitetura

**v1 (atual) — importação manual, sem autenticação:**

```
┌─────────────┐   ETL semanal    ┌──────────────────┐
│  PC (atual)  │ ───────────────▶ │ finance.db        │
│  Streamlit   │                  │ (ficheiro local)   │
│  + ETL       │                  └────────┬─────────┘
└─────────────┘                            │ transferência manual
                                            │ (AirDrop/USB/cloud à escolha)
                                   ┌────────▼─────────┐
                                   │ PWA no dispositivo │
                                   │ React + sql.js     │
                                   │ cache: IndexedDB   │
                                   └──────────────────┘
```

**Evolução prevista — sincronização automática via OneDrive:**

```
┌─────────────┐   ETL semanal    ┌──────────────────┐
│  PC (atual)  │ ───────────────▶ │ OneDrive          │
│  Streamlit   │                  │ FinanceAssistant_ │
│  + ETL       │                  │ Data/finance.db   │
└─────────────┘                  └────────┬─────────┘
                                          │ Microsoft Graph API
                                          │ (download, Files.Read)
                                 ┌────────▼─────────┐
                                 │ PWA no dispositivo │
                                 │ React + sql.js     │
                                 │ cache: IndexedDB   │
                                 └──────────────────┘
```

A app já traz o código MSAL/Graph pronto (atrás da flag `VITE_AUTH_ENABLED`, `false` por omissão) — a evolução é apenas: fazer o registo Entra ID, preencher `VITE_MSAL_CLIENT_ID` e ligar a flag. Nenhuma reescrita de arquitetura é necessária.

| Camada | Tecnologia | Notas |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript | Base gerada/iterada no Google AI Studio |
| UI | Material Design 3 (MUI ou similar) | PT-PT em toda a interface; dark mode |
| Gráficos | Recharts | Replicar os gráficos Plotly do desktop |
| Importação de dados (v1) | `<input type="file">` + validação do cabeçalho SQLite | Sem autenticação; ver §5 |
| Autenticação (evolução) | MSAL.js (`@azure/msal-browser`) | Desativada por omissão (`VITE_AUTH_ENABLED=false`); conta Microsoft pessoal, fluxo PKCE |
| Dados remotos (evolução) | Microsoft Graph API | `GET /me/drive/root:/FinanceAssistant_Data/finance.db:/content` |
| Motor SQL | sql.js (SQLite compilado para WebAssembly) | As queries SQL atuais portam quase sem alterações |
| Configuração de património (opcional) | `finance_config.json` + `JSON.parse` validado | Segunda fonte de dados, só para imóveis/veículos (`property_config`, `patrimonio_config.veiculos`) — não existem no `finance.db`; ver §5 |
| Cache local | IndexedDB | Guarda o `.db` + o config (quando importado) + nomes de ficheiro + datas de importação/sincronização; permite offline |
| Alojamento | GitHub Pages (repo privado, Pages público*) | Deploy = `git push`; sem servidor |
| PWA | manifest + service worker (vite-plugin-pwa) | Instalável como ícone no ecrã inicial |

\* A página é pública mas **não contém dados** — apenas código; os dados só existem no dispositivo depois de importados (v1) ou após login Microsoft (evolução).

### Princípios herdados do desktop

- **Philosophy B**: fluxos do imobiliário (5L, 7D, 7E — arrendados; PL é a habitação própria, fora deste grupo) isolados dos KPIs pessoais; Dashboard Visão Geral com `include_imob=True`; KPIs Avançados apenas pessoais; acertos como abatimento de despesa.
- **Flags de schema respeitadas**: `is_poupanca` (ex.: `R.Empréstimo Volvo` neutro em todos os cálculos), `is_controlo`, `is_imobiliario`, `is_fixa` + `frequencia`.
- **Fixo/variável só fiável de 2018 em diante**; legacy 2015–2017 apresentado com aviso.
- **Imóveis e veículos não têm valor no `finance.db`** — vêm do `finance_config.json` (`property_config`, `patrimonio_config.veiculos`); sem passivos registados em nenhuma fonte, o total combinado do Património é sempre "ativos brutos", nunca "valor líquido".
- Separação limpa entre camada de dados (queries SQL) e camada de apresentação.

## 5. Fluxo de dados

### v1 — importação manual (fluxo atual, sem autenticação)

1. **Primeira utilização:** sem nenhum `.db` em cache, a app mostra o ecrã "Importar dados" — explica em PT-PT que o `finance.db` é gerado no PC (ETL semanal) e pede para escolher o ficheiro no dispositivo.
2. **Validação:** o ficheiro escolhido é validado (cabeçalho SQLite) antes de ser aberto; ficheiro inválido/corrompido mostra um erro amigável e não mexe nos dados já em cache, se existirem.
3. **Cache manda:** o `.db` importado fica em IndexedDB junto com nome do ficheiro e data/hora de importação. Em utilizações seguintes, havendo cache válida, a app abre directamente no Dashboard — o ecrã de importação não volta a aparecer sozinho.
4. **Reimportar:** o botão "🔄 Actualizar dados" no cabeçalho abre sempre o seletor de ficheiro nativo, para trazer uma versão mais recente do `finance.db` (transferido do PC por AirDrop, USB, cloud, etc., à escolha do utilizador).
5. **Indicador de frescura:** cabeçalho mostra "Dados de DD/MM/AAAA HH:mm" + nome do ficheiro importado; um aviso discreto aparece quando os dados têm mais de 8 dias (a atualização no PC é semanal).
6. **Offline:** por não haver rede envolvida nesta importação, a app funciona sempre com a última cópia em cache — o aviso "offline" existe apenas para assinalar falta de ligação (ex.: para a evolução com Graph).

### Configuração de património (finance_config.json, opcional)

O `finance.db` não tem o valor de mercado de imóveis nem de veículos — só a app desktop guarda isso, no `finance_config.json` (`property_config` para imóveis, `patrimonio_config.veiculos` para veículos; o ficheiro tem outros campos como `budgets`/`preferences` que a PWA ignora).

1. **Totalmente opcional:** sem este ficheiro, o Património funciona à mesma — mostra "Sem dados de origem" nos cartões de imóveis/veículos, com um botão para importar.
2. **Importação:** mesmo padrão do `finance.db` — seletor de ficheiro nativo, validado (JSON bem formado + tem `property_config` ou `patrimonio_config`) antes de ser aceite; erro amigável em caso de ficheiro errado, sem mexer na configuração já em cache.
3. **Cache:** guardado em IndexedDB (loja separada da do `finance.db`); reaberto automaticamente nas visitas seguintes.
4. **Atualizar:** botão dedicado no Património reabre o seletor de ficheiro para trazer uma versão mais recente.

### Evolução prevista — sincronização automática via OneDrive

Todo o código já existe atrás de `VITE_AUTH_ENABLED` (ver §4). Quando ativado:

1. **Registo único (uma vez, pode ser feito no browser do tablet):** criar App Registration no Microsoft Entra ID (portal.azure.com) — tipo "contas pessoais Microsoft" (ou multi-tenant, consoante `VITE_MSAL_AUTHORITY`), plataforma SPA, redirect URI = URL do GitHub Pages, scopes delegados `User.Read` e `Files.Read`. Guardar o `clientId` em `VITE_MSAL_CLIENT_ID`.
2. **Primeiro arranque:** ecrã de login → popup Microsoft → token guardado pelo MSAL (silent refresh nas visitas seguintes).
3. **Sincronização:** botão "🔄 Actualizar dados" passa a descarregar o `finance.db` via Graph em vez de abrir o seletor de ficheiro → gravação em IndexedDB → recarregamento do sql.js. Salta o download se os metadados Graph indicarem a mesma versão já em cache.
4. **Offline:** sem rede, a app abre com a última cópia em cache e assinala "modo offline".

## 6. Módulos e requisitos

### P0 — sem isto a app não cumpre o propósito

| Módulo | Conteúdo mínimo |
|---|---|
| **Importação + dados** | Importação manual do `finance.db` (v1), validação do ficheiro, cache/indicador de frescura, offline. Sincronização Microsoft (login + download automático) fica pronta atrás de flag, para ativar mais tarde |
| **Dashboard (Visão Geral)** | KPIs principais com tooltips de breakdown (incl. imobiliário), gráfico de evolução mensal/anual |
| **Análise** | Despesas por grupo/rubrica, fixo vs. variável (2018+), filtros de período |
| **Património** | Ativos brutos: contas líquidas + investimentos (`finance.db`), imóveis e veículos (`finance_config.json`, opcional). Distingue habitação própria de imóveis de arrendamento. Sem passivos em nenhuma fonte — nunca apresentado como "valor líquido" |
| **Investimentos** | Portfólio total (soma dos valores mais recentes na data global mais recente), estado ativo/terminado |
| **FIRE** | Trajetória, taxa de cobertura de despesas por rendimento passivo (Barista FIRE) |

Critérios de aceitação transversais (P0):
- [ ] Todos os valores batem certo com o desktop para o mesmo `finance.db` (validação lado a lado)
- [ ] Philosophy B verificada: KPIs Avançados excluem imobiliário; Visão Geral inclui
- [ ] `R.Empréstimo Volvo` neutro em P&L/FIRE/dashboard
- [ ] Entradas `is_controlo` excluídas de todas as análises
- [ ] Interface integral em PT-PT
- [ ] Layouts adaptativos telemóvel/tablet (breakpoints MD3)

### P1 — melhora muito, mas não bloqueia

- P&L imobiliário dedicado (equivalente a `get_property_pnl()` por unidade 5L/7D/7E)
- Dark mode automático (preferência do sistema)
- Item 15 da master list: breakdown fixo/variável dedicado ao imobiliário no Património
- Comparações homólogas (ano vs. ano)

### P2 — considerações futuras (não construir, mas não impedir)

- AI Insights (chat SQL via API Claude) — exige guardar a API key com cuidado; avaliar depois
- Notificação/badge quando há `finance.db` novo no OneDrive
- Export de vistas para PDF/imagem

## 7. Estrutura do projeto

```
finance-assistant-mobile/
├── public/               # manifest, ícones PWA
├── src/
│   ├── auth/             # MSAL config + hooks (useAuth) — desativado por omissão (evolução)
│   ├── data/
│   │   ├── graph.ts               # download finance.db + metadados (evolução, atrás de flag)
│   │   ├── db.ts                   # init sql.js, validação SQLite, cache IndexedDB
│   │   ├── ImportFileContext.tsx   # seletor de ficheiro partilhado (finance.db)
│   │   ├── configFile.ts           # parsing/validação do finance_config.json (opcional)
│   │   ├── ConfigContext.tsx       # cache/estado do finance_config.json
│   │   ├── ConfigFileContext.tsx   # seletor de ficheiro partilhado (finance_config.json)
│   │   └── queries/                # SQL portado do desktop, 1 ficheiro por módulo
│   ├── components/       # KPICard, ImportScreen, Header, BottomNav, ...
│   ├── pages/            # Dashboard, Analise, Patrimonio, Investimentos, Fire
│   ├── theme/            # MD3, PT-PT locale, formatação € e datas
│   └── App.tsx           # navegação inferior (bottom nav) + router
├── vite.config.ts        # base = /finance-assistant-mobile/, plugin PWA
└── .github/workflows/deploy.yml   # build + deploy GitHub Pages
```

## 8. Faseamento

1. **Fase 1 — Fundação (validar risco técnico primeiro):** projeto Vite + auth MSAL + download Graph + sql.js a abrir o `finance.db` real + Dashboard com 2–3 KPIs. *Se isto funcionar, o resto é trabalho conhecido.*
2. **Fase 2 — Módulos:** Análise, Património, Investimentos, FIRE, com validação lado a lado contra o desktop.
3. **Fase 3 — Polimento:** PWA instalável, offline robusto, dark mode, tooltips completos.
4. **Fase 4 (opcional):** itens P1/P2.

Desenvolvimento via **Claude Code ligado ao repo GitHub** (possível a partir do tablet); o protótipo do AI Studio serve de referência visual/estrutural para as páginas.

## 9. Questões em aberto

- **Bloqueante — tamanho do `finance.db`:** confirmar o tamanho atual (MB). sql.js carrega a base inteira em memória; até ~50 MB é confortável em qualquer dispositivo recente. *(Responder: Diogo, no PC ou via OneDrive.)*
- Adiado (não bloqueia a v1) — App Registration no Entra ID: registo fica para quando se quiser ativar a sincronização automática via OneDrive; até lá, `VITE_AUTH_ENABLED=false` e a app usa importação manual (§5). Quando avançar, confirmar se a conta é Microsoft pessoal (`VITE_MSAL_AUTHORITY=consumers`) ou mista (`common`).
- Não bloqueante — inventário exato das queries do desktop a portar (extrair do repo `FinanceAssistant`).
- Não bloqueante — nome/ícone da PWA e URL final do GitHub Pages.

## 10. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| `finance.db` demasiado grande para sql.js | Fase 1 testa com o ficheiro real logo no início; plano B: exportar do desktop um `.db` reduzido só com tabelas de consulta |
| Divergência de resultados vs. desktop | Validação lado a lado por módulo antes de dar por concluído |
| Esquecer-se de importar uma versão nova do `finance.db` | Aviso discreto no cabeçalho quando os dados têm mais de 8 dias |
| Ficheiro errado/corrompido na importação manual | Validação do cabeçalho SQLite antes de abrir; erro amigável sem perder os dados já em cache |
| Fricção no registo Entra ID (quando avançar para a evolução) | Passo único e documentado; pode ser feito no browser do tablet; até lá não bloqueia a v1 |
| Token Graph expirado offline (evolução) | Cache IndexedDB garante consulta mesmo sem login renovado |
