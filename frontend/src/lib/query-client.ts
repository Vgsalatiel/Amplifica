import { QueryClient } from '@tanstack/react-query'
import { retryDelay, shouldRetry } from './retry'

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Dados de catálogo mudam pouco: evita refazer a mesma chamada a cada foco na aba.
        staleTime: 30_000,
        retry: shouldRetry,
        retryDelay,
      },
    },
  })
}
