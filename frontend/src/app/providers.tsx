import { QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { RouterProvider } from 'react-router'
import { createQueryClient } from '../lib/query-client'
import { router } from './router'

export function AppProviders() {
  // useState garante um único QueryClient durante toda a vida da aplicação.
  const [queryClient] = useState(createQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
