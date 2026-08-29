import type { Configuration } from '@azure/msal-browser';

// A autenticação Microsoft está isolada nesta configuração. Enquanto não
// existir um App Registration no Entra ID (clientId por preencher em
// VITE_MSAL_CLIENT_ID), a flag AUTH_ENABLED mantém-se "false" e a app usa
// o carregador manual de ficheiro .db em modo de desenvolvimento — ver
// src/auth/DevDbLoader.tsx.
export const AUTH_ENABLED = import.meta.env.VITE_AUTH_ENABLED === 'true';

const clientId = import.meta.env.VITE_MSAL_CLIENT_ID ?? '';

// Contas Microsoft pessoais (não corporativas) — authority "consumers".
export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: 'https://login.microsoftonline.com/consumers',
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
