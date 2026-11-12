import { createBrowserRouter, Navigate } from 'react-router'
import { AppLayout } from '../components/layout/app-layout'
import { AdminRoute } from '../features/admin/components/admin-route'
import { AdminLayout } from '../features/admin/pages/admin-layout'
import { ArtistsAdminPage } from '../features/admin/pages/artists-admin-page'
import { EditArtistPage, NewArtistPage } from '../features/admin/pages/artist-form-page'
import { GenresAdminPage } from '../features/admin/pages/genres-admin-page'
import { ReleasesAdminPage } from '../features/admin/pages/releases-admin-page'
import { EditReleasePage, NewReleasePage } from '../features/admin/pages/release-form-page'
import { ProtectedRoute } from '../features/auth/components/protected-route'
import { LoginPage } from '../features/auth/pages/login-page'
import { RegisterPage } from '../features/auth/pages/register-page'
import { HomePage } from '../features/home/pages/home-page'
import { NotFoundPage } from '../features/home/pages/not-found-page'
import { AccountPage } from '../features/profile/pages/account-page'
import { ProfilePage } from '../features/profile/pages/profile-page'
import { StyleguidePage } from '../features/styleguide/pages/styleguide-page'

// As páginas públicas do catálogo (artista, álbum, busca) entram na etapa 4.
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
        children: [
          { path: '/conta', element: <AccountPage /> },
          {
            // Dentro daqui só entra quem é administrador.
            element: <AdminRoute />,
            children: [
              {
                path: '/admin',
                element: <AdminLayout />,
                children: [
                  { index: true, element: <Navigate to="/admin/lancamentos" replace /> },
                  { path: 'lancamentos', element: <ReleasesAdminPage /> },
                  { path: 'lancamentos/novo', element: <NewReleasePage /> },
                  { path: 'lancamentos/:slug', element: <EditReleasePage /> },
                  { path: 'artistas', element: <ArtistsAdminPage /> },
                  { path: 'artistas/novo', element: <NewArtistPage /> },
                  { path: 'artistas/:slug', element: <EditArtistPage /> },
                  { path: 'generos', element: <GenresAdminPage /> },
                ],
              },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
