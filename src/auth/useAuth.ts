import { useCallback, useEffect, useRef, useState } from 'react';
import {
  InteractionRequiredAuthError,
  PublicClientApplication,
  type AccountInfo,
} from '@azure/msal-browser';
import { AUTH_ENABLED, loginRequest, msalConfig } from './config';

// Instância única do MSAL, criada apenas quando a autenticação está
// ativa — evita inicializar o SDK (e exigir clientId) em modo dev.
let msalInstance: PublicClientApplication | null = null;
let initPromise: Promise<void> | null = null;

function getMsalInstance(): PublicClientApplication {
  msalInstance ??= new PublicClientApplication(msalConfig);
  return msalInstance;
}

export interface AuthState {
  /** Se a autenticação Microsoft está ativa (VITE_AUTH_ENABLED=true). */
  authEnabled: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  account: AccountInfo | null;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  /** Obtém um token de acesso Graph (silencioso, com fallback a popup). */
  getAccessToken: () => Promise<string | null>;
}

export function useAuth(): AuthState {
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [isLoading, setIsLoading] = useState(AUTH_ENABLED);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!AUTH_ENABLED) return;
    const instance = getMsalInstance();
    initPromise ??= instance.initialize();

    (async () => {
      try {
        await initPromise;
        const redirectResult = await instance.handleRedirectPromise();
        if (redirectResult?.account) {
          instance.setActiveAccount(redirectResult.account);
        }
        const accounts = instance.getAllAccounts();
        const active = instance.getActiveAccount() ?? accounts[0] ?? null;
        if (active) {
          instance.setActiveAccount(active);
        }
        if (mountedRef.current) setAccount(active);
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : 'Falha ao iniciar sessão Microsoft.');
        }
      } finally {
        if (mountedRef.current) setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async () => {
    if (!AUTH_ENABLED) return;
    const instance = getMsalInstance();
    setError(null);
    setIsLoading(true);
    try {
      await (initPromise ?? instance.initialize());
      const result = await instance.loginPopup(loginRequest);
      instance.setActiveAccount(result.account);
      setAccount(result.account);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível iniciar sessão.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    if (!AUTH_ENABLED) return;
    const instance = getMsalInstance();
    await instance.logoutPopup();
    setAccount(null);
  }, []);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (!AUTH_ENABLED) return null;
    const instance = getMsalInstance();
    const active = instance.getActiveAccount();
    if (!active) return null;
    try {
      const result = await instance.acquireTokenSilent({ ...loginRequest, account: active });
      return result.accessToken;
    } catch (err) {
      if (err instanceof InteractionRequiredAuthError) {
        const result = await instance.acquireTokenPopup(loginRequest);
        return result.accessToken;
      }
      throw err;
    }
  }, []);

  return {
    authEnabled: AUTH_ENABLED,
    isAuthenticated: AUTH_ENABLED ? account !== null : false,
    isLoading,
    account,
    error,
    login,
    logout,
    getAccessToken,
  };
}
