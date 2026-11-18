import { createBrowserRouter, Navigate } from 'react-router'
import { AppLayout } from '../components/layout/app-layout'
import { AdminRoute } from '../features/admin/components/admin-route'
import { AdminLayout } from '../features/admin/pages/admin-layout'
import { ArtistsAdminPage } from '../features/admin/pages/artists-admin-page'
import { EditArtistPage, NewArtistPage } from '../features/admin/pages/artist-form-page'
import { GenresAdminPage } from '../features/admin/pages/genres-admin-page'
import { TeamAdminPage } from '../features/admin/pages/team-admin-page'
import { ModeratorRoute } from '../features/moderation/components/moderator-route'
import { CommentsModerationPage } from '../features/moderation/pages/comments-moderation-page'
import { GroupsModerationPage } from '../features/moderation/pages/groups-moderation-page'
import { ClipsModerationPage } from '../features/moderation/pages/clips-moderation-page'
import { ModerationLayout } from '../features/moderation/pages/moderation-layout'
import { ShowsAdminPage } from '../features/admin/pages/shows-admin-page'
import { EditShowPage, NewShowPage } from '../features/admin/pages/show-form-page'
import { ReleasesAdminPage } from '../features/admin/pages/releases-admin-page'
import { EditReleasePage, NewReleasePage } from '../features/admin/pages/release-form-page'
import { ProtectedRoute } from '../features/auth/components/protected-route'
import { ForgotPasswordPage } from '../features/auth/pages/forgot-password-page'
import { ResetPasswordPage } from '../features/auth/pages/reset-password-page'
import { VerifyEmailPage } from '../features/auth/pages/verify-email-page'
import { LoginPage } from '../features/auth/pages/login-page'
import { RegisterPage } from '../features/auth/pages/register-page'
import { HomePage } from '../features/home/pages/home-page'
import { NotFoundPage } from '../features/home/pages/not-found-page'
import { AccountPage } from '../features/profile/pages/account-page'
import { ProfilePage } from '../features/profile/pages/profile-page'
import { ArtistPage } from '../features/catalog/pages/artist-page'
import { ArtistsPage } from '../features/catalog/pages/artists-page'
import { GenrePage } from '../features/catalog/pages/genre-page'
import { GenresPage } from '../features/catalog/pages/genres-page'
import { ReleasePage } from '../features/catalog/pages/release-page'
import { ReleasesPage } from '../features/catalog/pages/releases-page'
import { SearchPage } from '../features/search/pages/search-page'
import { EmoTourPage } from '../features/shows/pages/emo-tour-page'
import { ShowPage } from '../features/shows/pages/show-page'
import { ShowsPage } from '../features/shows/pages/shows-page'
import { BrazilHistoryPage } from '../features/catalog/pages/brazil-history-page'
import { BrazilScenePage } from '../features/catalog/pages/brazil-scene-page'
import { StyleguidePage } from '../features/styleguide/pages/styleguide-page'

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/artistas', element: <ArtistsPage /> },
      { path: '/artistas/:slug', element: <ArtistPage /> },
      { path: '/lancamentos', element: <ReleasesPage /> },
      { path: '/lancamentos/:slug', element: <ReleasePage /> },
      { path: '/buscar', element: <SearchPage /> },
      { path: '/generos', element: <GenresPage /> },
      { path: '/generos/:slug', element: <GenrePage /> },
      { path: '/shows', element: <ShowsPage /> },
      { path: '/shows/:slug', element: <ShowPage /> },
      { path: '/cena-br', element: <BrazilScenePage /> },
      { path: '/cena-br/historia', element: <BrazilHistoryPage /> },
      { path: '/emo-tour', element: <EmoTourPage /> },
      { path: '/guia', element: <StyleguidePage /> },
      { path: '/entrar', element: <LoginPage /> },
      { path: '/cadastro', element: <RegisterPage /> },
      { path: '/esqueci-a-senha', element: <ForgotPasswordPage /> },
      { path: '/redefinir-senha', element: <ResetPasswordPage /> },
      { path: '/confirmar-email', element: <VerifyEmailPage /> },
      { path: '/u/:username', element: <ProfilePage /> },
      {
        // Tudo aqui dentro exige login.
        element: <ProtectedRoute />,
        children: [
          { path: '/conta', element: <AccountPage /> },
          {
            // Dentro daqui só entra quem é administrador ou moderador.
            element: <ModeratorRoute />,
            children: [
              {
                path: '/moderacao',
                element: <ModerationLayout />,
                children: [
                  { index: true, element: <Navigate to="/moderacao/clipes" replace /> },
                  { path: 'clipes', element: <ClipsModerationPage /> },
                  { path: 'denuncias', element: <CommentsModerationPage /> },
                  { path: 'grupos', element: <GroupsModerationPage /> },
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
                  { path: 'shows', element: <ShowsAdminPage /> },
                  { path: 'equipe', element: <TeamAdminPage /> },
                  { path: 'shows/novo', element: <NewShowPage /> },
                  { path: 'shows/:slug', element: <EditShowPage /> },
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
