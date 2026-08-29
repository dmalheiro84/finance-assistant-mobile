# Finance Assistant Mobile — Especificação (PWA)

**Versão:** 1.0 · Agosto 2026
**Autor:** Diogo (com apoio do Claude)
**Estado:** Rascunho para arranque de desenvolvimento

---

## 1. Problema e contexto

O Finance Assistant existe hoje como aplicação desktop (Python/Streamlit + SQLite) e só é utilizável no PC. O Diogo pretende consultar os seus dados financeiros (2015–2026) em qualquer dispositivo Android — tablet ou telemóvel — sem depender de o PC estar ligado. A atualização dos dados continua a ser feita exclusivamente no PC (ETL semanal sobre os ficheiros `.xlsm`), pelo que a app móvel é **estritamente de consulta (read-only)**.

## 2. Objetivos

1. Consultar Dashboard, Análise, Património, Investimentos e FIRE em qualquer dispositivo Android, com o PC desligado.
2. Dados sempre sincronizáveis a partir do `finance.db` no OneDrive, com um toque ("Actualizar dados").
3. Zero infraestrutura própria: sem servidor, sem backend, sem custos recorrentes.
4. Privacidade total: os dados circulam apenas entre o OneDrive do Diogo e o dispositivo — nunca por servidores de terceiros.
5. Funcionamento offline após a primeira sincronização (cache local do `finance.db`).

## 3. Não-objetivos

- **ETL e upload de ficheiros** — permanecem no desktop; a app móvel nunca escreve no `finance.db`.
- **App nativa Android (APK)** — descartada nesta fase; a PWA cobre a necessidade sem passos de compilação/instalação. Reavaliar apenas se a PWA falhar em performance ou UX.
- **Edição de dados ou configurações** (mapeamentos, rubricas, `frequencia`) — só no desktop.
- **Multi-utilizador** — app pessoal, uma única conta Microsoft.
- **AI Insights na v1** — considerado para fase posterior (ver §10).

## 4. Arquitetura

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

| Camada | Tecnologia | Notas |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript | Base gerada/iterada no Google AI Studio |
| UI | Material Design 3 (MUI ou similar) | PT-PT em toda a interface; dark mode |
| Gráficos | Recharts | Replicar os gráficos Plotly do desktop |
| Autenticação | MSAL.js (`@azure/msal-browser`) | Conta Microsoft pessoal; fluxo PKCE |
| Dados remotos | Microsoft Graph API | `GET /me/drive/root:/FinanceAssistant_Data/finance.db:/content` |
| Motor SQL | sql.js (SQLite compilado para WebAssembly) | As queries SQL atuais portam quase sem alterações |
| Cache local | IndexedDB | Guarda o `.db` + data de sincronização; permite offline |
| Alojamento | GitHub Pages (repo privado, Pages público*) | Deploy = `git push`; sem servidor |
| PWA | manifest + service worker (vite-plugin-pwa) | Instalável como ícone no ecrã inicial |

\* A página é pública mas **não contém dados** — apenas código; os dados exigem sempre login Microsoft.

### Princípios herdados do desktop

- **Philosophy B**: fluxos do imobiliário (5L, 7D, 7E) isolados dos KPIs pessoais; Dashboard Visão Geral com `include_imob=True`; KPIs Avançados apenas pessoais; acertos como abatimento de despesa.
- **Flags de schema respeitadas**: `is_poupanca` (ex.: `R.Empréstimo Volvo` neutro em todos os cálculos), `is_controlo`, `is_imobiliario`, `is_fixa` + `frequencia`.
- **Fixo/variável só fiável de 2018 em diante**; legacy 2015–2017 apresentado com aviso.
- Separação limpa entre camada de dados (queries SQL) e camada de apresentação.

## 5. Fluxo de autenticação e sincronização

1. **Registo único (uma vez, pode ser feito no browser do tablet):** criar App Registration no Microsoft Entra ID (portal.azure.com) — tipo "contas pessoais Microsoft", plataforma SPA, redirect URI = URL do GitHub Pages, scopes delegados `User.Read` e `Files.Read`. Guardar o `clientId` na config da app.
2. **Primeiro arranque:** ecrã de login → popup/redirect Microsoft → token guardado pelo MSAL (silent refresh nas visitas seguintes).
3. **Sincronização:** botão "🔄 Actualizar dados" (paridade com o desktop) → download do `finance.db` via Graph → gravação em IndexedDB → recarregamento do sql.js.
4. **Indicador de frescura:** cabeçalho mostra "Dados de DD/MM/AAAA HH:mm" (data de modificação do ficheiro no OneDrive, obtida dos metadados Graph antes do download — permite também *skip* do download se não houver versão nova).
5. **Offline:** sem rede, a app abre com a última cópia em cache e assinala "modo offline".

## 6. Módulos e requisitos

### P0 — sem isto a app não cumpre o propósito

| Módulo | Conteúdo mínimo |
|---|---|
| **Autenticação + Sync** | Login Microsoft, download/cache do `finance.db`, indicador de frescura, offline |
| **Dashboard (Visão Geral)** | KPIs principais com tooltips de breakdown (incl. imobiliário), gráfico de evolução mensal/anual |
| **Análise** | Despesas por grupo/rubrica, fixo vs. variável (2018+), filtros de período |
| **Património** | Valor líquido, imóveis, veículos (Volvo EX30, Renault ESPACE), contas líquidas |
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
│   ├── auth/             # MSAL config + hooks (useAuth)
│   ├── data/
│   │   ├── graph.ts      # download finance.db + metadados
│   │   ├── db.ts         # init sql.js, cache IndexedDB
│   │   └── queries/      # SQL portado do desktop, 1 ficheiro por módulo
│   ├── components/       # KPICard, ChartCard, PeriodFilter, ...
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
- **Bloqueante — App Registration com conta pessoal:** confirmar que a conta OneDrive é Microsoft pessoal (não corporativa), o que define o `authority` do MSAL. *(Responder: Diogo.)*
- Não bloqueante — inventário exato das queries do desktop a portar (extrair do repo `FinanceAssistant`).
- Não bloqueante — nome/ícone da PWA e URL final do GitHub Pages.

## 10. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| `finance.db` demasiado grande para sql.js | Fase 1 testa com o ficheiro real logo no início; plano B: exportar do desktop um `.db` reduzido só com tabelas de consulta |
| Divergência de resultados vs. desktop | Validação lado a lado por módulo antes de dar por concluído |
| Fricção no registo Entra ID | Passo único e documentado; pode ser feito no browser do tablet |
| Token Graph expirado offline | Cache IndexedDB garante consulta mesmo sem login renovado |
