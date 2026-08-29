/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_ENABLED: string;
  readonly VITE_MSAL_CLIENT_ID: string;
  readonly VITE_MSAL_AUTHORITY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
