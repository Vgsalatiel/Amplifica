import { PageLoading } from '../components/ui/page-state'

/** Tela de espera da primeira visita, enquanto o código da página pedida ainda está chegando. */
export function PageFallback() {
  return <PageLoading what="a página" />
}
