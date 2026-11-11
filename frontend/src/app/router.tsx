import { createBrowserRouter } from 'react-router'
import { AppLayout } from '../components/layout/app-layout'
import { HomePage } from '../features/home/pages/home-page'
import { NotFoundPage } from '../features/home/pages/not-found-page'
import { StyleguidePage } from '../features/styleguide/pages/styleguide-page'

// As rotas do produto (artistas, lançamentos, perfil) entram nas próximas etapas.
export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/guia', element: <StyleguidePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
