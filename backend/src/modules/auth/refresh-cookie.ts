import type { Request, Response } from 'express';

/**
 * O token de renovação viaja em um cookie que o JavaScript da página não consegue ler
 * (HttpOnly). Assim, um script malicioso injetado no site não tem como roubar a sessão.
 *
 * - SameSite=Strict: o navegador só envia o cookie em requisições feitas pelo próprio site.
 * - Path restrito: o cookie só acompanha as rotas de autenticação.
 * - Secure em produção: só trafega por HTTPS.
 */
export const REFRESH_COOKIE = 'amplifica_refresh';
const COOKIE_PATH = '/api/v1/auth';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function baseOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure,
    path: COOKIE_PATH,
  } as const;
}

export function setRefreshCookie(
  response: Response,
  token: string,
  secure: boolean,
): void {
  response.cookie(REFRESH_COOKIE, token, {
    ...baseOptions(secure),
    maxAge: THIRTY_DAYS_MS,
  });
}

export function clearRefreshCookie(response: Response, secure: boolean): void {
  response.clearCookie(REFRESH_COOKIE, baseOptions(secure));
}

export function readRefreshCookie(request: Request): string | undefined {
  return parseCookies(request.headers.cookie)[REFRESH_COOKIE];
}

/** Lê o cabeçalho Cookie. Feito à mão para não adicionar uma dependência só para isso. */
export function parseCookies(
  header: string | undefined,
): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) {
    return cookies;
  }

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) {
      continue;
    }
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (name && !(name in cookies)) {
      try {
        cookies[name] = decodeURIComponent(value);
      } catch {
        cookies[name] = value;
      }
    }
  }
  return cookies;
}
