import { useEffect } from 'react'

const SITE = 'Amplifica'

/** Título da aba: "Sempiternal, Bring Me the Horizon | Amplifica". Volta ao padrão ao sair da página. */
export function useDocumentTitle(title: string | null | undefined): void {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE}` : SITE
    return () => {
      document.title = SITE
    }
  }, [title])
}
