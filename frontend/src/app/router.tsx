import { createBrowserRouter } from 'react-router'
import { AppLayout } from '../components/layout/app-layout'
import { ProtectedRoute } from '../features/auth/components/protected-route'
import { LoginPage } from '../features/auth/pages/login-page'
import { RegisterPage } from '../features/auth/pages/register-page'
import { HomePage } from '../features/home/pages/home-page'
import { NotFoundPage } from '../features/home/pages/not-found-page'
import { AccountPage } from '../features/profile/pages/account-page'
import { ProfilePage } from '../features/profile/pages/profile-page'
import { StyleguidePage } from '../features/styleguide/pages/styleguide-page'

// As rotas do catálogo (artistas, lançamentos, gêneros) entram nas próximas etapas.
export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/guia', element: <StyleguidePage /> },
      { path: '/entrar', element: <LoginPage /> },
      { path: '/cadastro', element: <RegisterPage /> },
      { path: '/u/:username', element: <ProfilePage /> },
      {
        // Tudo aqui dentro exige login.
        element: <ProtectedRoute />,
        children: [{ path: '/conta', element: <AccountPage /> }],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
