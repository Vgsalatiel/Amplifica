import { QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { RouterProvider } from 'react-router'
import { createQueryClient } from '../lib/query-client'
import { refreshSession } from '../lib/session'
import { router } from './router'

export function AppProviders() {
  // useState garante um único QueryClient durante toda a vida da aplicação.
  const [queryClient] = useState(createQueryClient)

  // Ao abrir o site, tenta recuperar a sessão pelo cookie de renovação.
  // É isso que mantém a pessoa logada depois de recarregar a página.
  useEffect(() => {
    void refreshSession()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
