import { createBrowserRouter } from 'react-router'
import { StatusPage } from '../features/status/pages/status-page'

// As rotas do produto (artistas, lançamentos, perfil) entram nas próximas etapas.
export const router = createBrowserRouter([
  {
    path: '/',
    element: <StatusPage />,
  },
])
