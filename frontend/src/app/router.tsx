import { createBrowserRouter, Navigate } from 'react-router'
import { page } from './lazy-page'
import { PageFallback } from './page-fallback'
import { RouteError } from './route-error'
import { AppLayout } from '../components/layout/app-layout'
import { AdminRoute } from '../features/admin/components/admin-route'
import { ModeratorRoute } from '../features/moderation/components/moderator-route'
import { ProtectedRoute } from '../features/auth/components/protected-route'
import { HomePage } from '../features/home/pages/home-page'
import { NotFoundPage } from '../features/home/pages/not-found-page'

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    HydrateFallback: PageFallback,
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/artistas', lazy: page(() => import('../features/catalog/pages/artists-page'), 'ArtistsPage') },
      { path: '/artistas/:slug', lazy: page(() => import('../features/catalog/pages/artist-page'), 'ArtistPage') },
      { path: '/lancamentos', lazy: page(() => import('../features/catalog/pages/releases-page'), 'ReleasesPage') },
      { path: '/lancamentos/:slug', lazy: page(() => import('../features/catalog/pages/release-page'), 'ReleasePage') },
      { path: '/buscar', lazy: page(() => import('../features/search/pages/search-page'), 'SearchPage') },
      { path: '/generos', lazy: page(() => import('../features/catalog/pages/genres-page'), 'GenresPage') },
      { path: '/generos/:slug', lazy: page(() => import('../features/catalog/pages/genre-page'), 'GenrePage') },
      { path: '/shows', lazy: page(() => import('../features/shows/pages/shows-page'), 'ShowsPage') },
      { path: '/shows/:slug', lazy: page(() => import('../features/shows/pages/show-page'), 'ShowPage') },
      { path: '/cena-br', lazy: page(() => import('../features/catalog/pages/brazil-scene-page'), 'BrazilScenePage') },
      { path: '/cena-br/historia', lazy: page(() => import('../features/catalog/pages/brazil-history-page'), 'BrazilHistoryPage') },
      { path: '/emo-tour', lazy: page(() => import('../features/shows/pages/emo-tour-page'), 'EmoTourPage') },
      { path: '/termos', lazy: page(() => import('../features/legal/pages/terms-page'), 'TermsPage') },
      { path: '/privacidade', lazy: page(() => import('../features/legal/pages/privacy-page'), 'PrivacyPage') },
      { path: '/seguranca', lazy: page(() => import('../features/legal/pages/safety-page'), 'SafetyPage') },
      { path: '/guia', lazy: page(() => import('../features/styleguide/pages/styleguide-page'), 'StyleguidePage') },
      { path: '/entrar', lazy: page(() => import('../features/auth/pages/login-page'), 'LoginPage') },
      { path: '/cadastro', lazy: page(() => import('../features/auth/pages/register-page'), 'RegisterPage') },
      { path: '/esqueci-a-senha', lazy: page(() => import('../features/auth/pages/forgot-password-page'), 'ForgotPasswordPage') },
      { path: '/redefinir-senha', lazy: page(() => import('../features/auth/pages/reset-password-page'), 'ResetPasswordPage') },
      { path: '/confirmar-email', lazy: page(() => import('../features/auth/pages/verify-email-page'), 'VerifyEmailPage') },
      { path: '/pessoas', lazy: page(() => import('../features/profile/pages/people-page'), 'PeoplePage') },
      { path: '/u/:username', lazy: page(() => import('../features/profile/pages/profile-page'), 'ProfilePage') },
      {
        // Tudo aqui dentro exige login.
        element: <ProtectedRoute />,
        children: [
          { path: '/conta', lazy: page(() => import('../features/profile/pages/account-page'), 'AccountPage') },
          {
            // Dentro daqui só entra quem é administrador ou moderador.
            element: <ModeratorRoute />,
            children: [
              {
                path: '/moderacao',
                lazy: page(() => import('../features/moderation/pages/moderation-layout'), 'ModerationLayout'),
                children: [
                  { index: true, element: <Navigate to="/moderacao/clipes" replace /> },
                  { path: 'clipes', lazy: page(() => import('../features/moderation/pages/clips-moderation-page'), 'ClipsModerationPage') },
                  { path: 'denuncias', lazy: page(() => import('../features/moderation/pages/comments-moderation-page'), 'CommentsModerationPage') },
                  { path: 'grupos', lazy: page(() => import('../features/moderation/pages/groups-moderation-page'), 'GroupsModerationPage') },
                ],
              },
            ],
          },
          {
            // Dentro daqui só entra quem é administrador.
            element: <AdminRoute />,
            children: [
              {
                path: '/admin',
                lazy: page(() => import('../features/admin/pages/admin-layout'), 'AdminLayout'),
                children: [
                  { index: true, element: <Navigate to="/admin/lancamentos" replace /> },
                  { path: 'lancamentos', lazy: page(() => import('../features/admin/pages/releases-admin-page'), 'ReleasesAdminPage') },
                  { path: 'lancamentos/novo', lazy: page(() => import('../features/admin/pages/release-form-page'), 'NewReleasePage') },
                  { path: 'lancamentos/:slug', lazy: page(() => import('../features/admin/pages/release-form-page'), 'EditReleasePage') },
                  { path: 'artistas', lazy: page(() => import('../features/admin/pages/artists-admin-page'), 'ArtistsAdminPage') },
                  { path: 'artistas/novo', lazy: page(() => import('../features/admin/pages/artist-form-page'), 'NewArtistPage') },
                  { path: 'artistas/:slug', lazy: page(() => import('../features/admin/pages/artist-form-page'), 'EditArtistPage') },
                  { path: 'generos', lazy: page(() => import('../features/admin/pages/genres-admin-page'), 'GenresAdminPage') },
                  { path: 'shows', lazy: page(() => import('../features/admin/pages/shows-admin-page'), 'ShowsAdminPage') },
                  { path: 'equipe', lazy: page(() => import('../features/admin/pages/team-admin-page'), 'TeamAdminPage') },
                  { path: 'shows/novo', lazy: page(() => import('../features/admin/pages/show-form-page'), 'NewShowPage') },
                  { path: 'shows/:slug', lazy: page(() => import('../features/admin/pages/show-form-page'), 'EditShowPage') },
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
