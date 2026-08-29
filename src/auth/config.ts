import type { Configuration } from '@azure/msal-browser';

// A autenticação Microsoft está isolada nesta configuração e mantém-se
// desativada por omissão (v1 usa importação manual do .db — ver
// src/components/ImportScreen.tsx). Fica pronta para reativar assim que
// houver um App Registration no Entra ID: basta preencher
// VITE_MSAL_CLIENT_ID e ligar VITE_AUTH_ENABLED.
export const AUTH_ENABLED = import.meta.env.VITE_AUTH_ENABLED === 'true';

const clientId = import.meta.env.VITE_MSAL_CLIENT_ID ?? '';

// "consumers" para contas Microsoft pessoais; pode passar a "common" (ou
// outro tenant) consoante o tipo de App Registration que vier a ser
// criado — ver VITE_MSAL_AUTHORITY.
const authorityTenant = import.meta.env.VITE_MSAL_AUTHORITY || 'consumers';

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${authorityTenant}`,
    redirectUri: `${window.location.origin}${import.meta.env.BASE_URL}`,
    postLogoutRedirectUri: `${window.location.origin}${import.meta.env.BASE_URL}`,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
};

// Scopes delegados mínimos: ler perfil e ler ficheiros do OneDrive.
export const loginRequest = {
  scopes: ['User.Read', 'Files.Read'],
};

export const FINANCE_DB_PATH = 'FinanceAssistant_Data/finance.db';
