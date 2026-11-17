import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { endSession } from '../../../lib/session'
import { page, show } from '../../../test/fixtures'
import { mockApi, renderRoutes } from '../../../test/helpers'
import { EmoTourPage } from './emo-tour-page'

const open = () => renderRoutes([{ path: '/emo-tour', element: <EmoTourPage /> }], '/emo-tour')

describe('EmoTourPage', () => {
  it('lista os eventos do organizador e leva ao Instagram dele', async () => {
    endSession()
    const fetchMock = mockApi({
      'GET /shows?organizer=Emo+Tour&limit=50': {
        status: 200,
        body: page([
          show({
            id: 'e1',
            name: 'Festival de Teste',
            acts: [
              { position: 0, name: 'Banda Um', artist: null },
              { position: 1, name: 'Banda Dois', artist: null },
            ],
            organizerName: 'Emo Tour',
            organizerUrl: 'https://www.instagram.com/emotourbrasil/',
          }),
        ]),
      },
    })
    open()

    expect(await screen.findByRole('heading', { level: 3, name: 'Festival de Teste' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /@emotourbrasil no Instagram/ })[0]).toHaveAttribute(
      'href',
      'https://www.instagram.com/emotourbrasil/',
    )
    expect(document.title).toBe('Emo Tour | Amplifica')
    expect(fetchMock).toHaveBeenCalled()
  })

  it('sem eventos, avisa e aponta para os shows de emo', async () => {
    endSession()
    mockApi({ 'GET /shows?organizer=Emo+Tour&limit=50': { status: 200, body: page([]) } })
    open()

    expect(await screen.findByText(/Nenhum evento da Emo Tour na agenda/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'shows de emo' })).toHaveAttribute('href', '/shows?genero=emo')
  })
})
