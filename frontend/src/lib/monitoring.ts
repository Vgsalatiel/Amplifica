/**
 * Aviso de erros do site (Sentry). Só liga se `VITE_SENTRY_DSN` existir na hora do build: sem ela,
 * nada é baixado nem enviado. O Sentry carrega sob demanda, então quem não usa não paga o peso.
 * Nada pessoal sai daqui: sem cookies, sem cabeçalhos, sem e-mail, e endereços perdem o que vem depois do "?".
 */
type SentryModule = typeof import('@sentry/react')

let sentry: SentryModule | null = null

/** Tira do endereço a busca e o fragmento (podem trazer termos digitados ou códigos). */
export function scrubUrl(url: string): string {
  return url.replace(/[?#].*$/, '')
}

interface ScrubbableEvent {
  request?: { url?: string; headers?: unknown; cookies?: unknown; query_string?: unknown; data?: unknown }
  user?: unknown
}

/** Remove de um evento do Sentry tudo o que poderia identificar a pessoa. */
export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  if (event.request) {
    delete event.request.headers
    delete event.request.cookies
    delete event.request.query_string
    delete event.request.data
    if (event.request.url) {
      event.request.url = scrubUrl(event.request.url)
    }
  }
  delete event.user
  return event
}

export function initMonitoring(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) {
    return
  }
  void import('@sentry/react')
    .then((module) => {
      module.init({
        dsn,
        environment: import.meta.env.MODE,
        tracesSampleRate: 0,
        // Ruído conhecido: a API acordando derruba o fetch, e o site já avisa a pessoa.
        ignoreErrors: ['ResizeObserver loop', 'Failed to fetch', 'Load failed', 'NetworkError'],
        beforeSend: (event) => scrubEvent(event),
        beforeBreadcrumb: (breadcrumb) => {
          // Cliques e navegação ficam; o texto que a pessoa digitou e os endereços com busca, não.
          if (breadcrumb.category === 'ui.input') {
            return null
          }
          if (typeof breadcrumb.data?.['url'] === 'string') {
            breadcrumb.data['url'] = scrubUrl(breadcrumb.data['url'])
          }
          return breadcrumb
        },
      })
      sentry = module
    })
    .catch(() => {
      // Bloqueador de anúncios ou rede: o aviso é um extra, o site segue normal.
    })
}

/** Manda um erro capturado (por exemplo, o de uma tela quebrada) ao Sentry, se ele estiver ligado. */
export function reportError(error: unknown): void {
  sentry?.captureException(error)
}
