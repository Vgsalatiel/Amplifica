import * as Sentry from '@sentry/node';

/**
 * Aviso de erros 500 da API (Sentry). Só liga com `SENTRY_DSN`; sem ela, nada é enviado.
 * Nada pessoal sai daqui: sem corpo do pedido, sem cookies, sem cabeçalhos (a senha e o token de
 * sessão passam por eles), sem endereço IP e sem e-mail do usuário; endereços perdem a busca.
 */
interface ScrubbableEvent {
  request?: {
    url?: string;
    headers?: unknown;
    cookies?: unknown;
    data?: unknown;
    query_string?: unknown;
  };
  user?: unknown;
}

/** Remove de um evento do Sentry tudo o que poderia identificar a pessoa. */
export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  if (event.request) {
    delete event.request.headers;
    delete event.request.cookies;
    delete event.request.data;
    delete event.request.query_string;
    if (event.request.url) {
      event.request.url = event.request.url.replace(/[?#].*$/, '');
    }
  }
  delete event.user;
  return event;
}

export function initMonitoring(dsn: string | undefined, environment: string): boolean {
  if (!dsn) {
    return false;
  }
  Sentry.init({
    dsn,
    environment,
    tracesSampleRate: 0,
    beforeSend: (event) => scrubEvent(event),
  });
  return true;
}

/** Manda o erro ao Sentry. Se ele não foi ligado, não faz nada. */
export function reportException(exception: unknown): void {
  Sentry.captureException(exception);
}
