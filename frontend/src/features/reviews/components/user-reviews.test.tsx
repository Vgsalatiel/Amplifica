import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mockApi, renderWithProviders } from '../../../test/helpers'
import { page, releaseSummary, userReview } from '../../../test/fixtures'
import { UserReviews } from './user-reviews'

const LIST = 'GET /users/ana/reviews?page=1'

describe('UserReviews', () => {
  it('lista os discos avaliados com capa, nota e texto, ligando ao disco', async () => {
    mockApi({
      [LIST]: {
        status: 200,
        body: page([userReview(), userReview({ id: 'rv2', body: null, rating: 6, release: releaseSummary({ id: 'r2', title: 'amo', slug: 'amo' }) })]),
      },
    })
    renderWithProviders(<UserReviews username="ana" displayName="Ana" isOwnProfile={false} />)

    expect(await screen.findByRole('link', { name: 'Sempiternal' })).toHaveAttribute('href', '/lancamentos/bring-me-the-horizon-sempiternal')
    expect(screen.getByText('Um disco que mudou a banda.')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Capa de Sempiternal' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'amo' })).toBeInTheDocument()
    expect(screen.getByText('6/10')).toBeInTheDocument()
  })

  it('no próprio perfil, sem avaliações, convida a avaliar o primeiro disco', async () => {
    mockApi({ [LIST]: { status: 200, body: page([]) } })
    renderWithProviders(<UserReviews username="ana" displayName="Ana" isOwnProfile />)

    expect(await screen.findByText(/Você ainda não avaliou nenhum disco/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Escolha um artista' })).toHaveAttribute('href', '/artistas')
  })

  it('no perfil de outra pessoa, diz que ela ainda não avaliou', async () => {
    mockApi({ [LIST]: { status: 200, body: page([]) } })
    renderWithProviders(<UserReviews username="ana" displayName="Ana" isOwnProfile={false} />)

    expect(await screen.findByText('Ana ainda não avaliou nenhum disco.')).toBeInTheDocument()
  })

  it('pagina as avaliações', async () => {
    mockApi({
      [LIST]: { status: 200, body: page([userReview()], { totalPages: 2, total: 11 }) },
      'GET /users/ana/reviews?page=2': { status: 200, body: page([userReview({ id: 'rv9', body: 'Outra página.' })], { page: 2, totalPages: 2, total: 11 }) },
    })
    renderWithProviders(<UserReviews username="ana" displayName="Ana" isOwnProfile={false} />)

    await screen.findByText('Um disco que mudou a banda.')
    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }))

    expect(await screen.findByText('Outra página.')).toBeInTheDocument()
  })
})
