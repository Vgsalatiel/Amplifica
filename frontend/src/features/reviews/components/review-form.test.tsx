import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mockApi, renderWithProviders } from '../../../test/helpers'
import { review } from '../../../test/fixtures'
import { ReviewForm } from './review-form'

const PUT = 'PUT /releases/sempiternal/reviews/me'

describe('ReviewForm', () => {
  it('envia a nota e o texto e confirma que salvou', async () => {
    const fetchMock = mockApi({ [PUT]: { status: 200, body: review({ rating: 8 }) } })
    renderWithProviders(<ReviewForm slug="sempiternal" existing={null} />)

    fireEvent.click(screen.getByRole('radio', { name: 'Nota 8' }))
    fireEvent.change(screen.getByLabelText('Sua resenha (opcional)'), { target: { value: 'Muito bom.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Publicar avaliação' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Avaliação salva.')
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({ rating: 8, body: 'Muito bom.' })
  })

  it('só a nota é suficiente: o texto vai vazio', async () => {
    const fetchMock = mockApi({ [PUT]: { status: 200, body: review({ rating: 5, body: null }) } })
    renderWithProviders(<ReviewForm slug="sempiternal" existing={null} />)

    fireEvent.click(screen.getByRole('radio', { name: 'Nota 5' }))
    fireEvent.click(screen.getByRole('button', { name: 'Publicar avaliação' }))

    await screen.findByRole('status')
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({ rating: 5, body: '' })
  })

  it('não envia sem nota e explica o motivo', () => {
    const fetchMock = mockApi({})
    renderWithProviders(<ReviewForm slug="sempiternal" existing={null} />)

    fireEvent.click(screen.getByRole('button', { name: 'Publicar avaliação' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Escolha uma nota de 1 a 10.')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('a nota se escolhe com o teclado, como qualquer grupo de botões de rádio', () => {
    mockApi({})
    renderWithProviders(<ReviewForm slug="sempiternal" existing={null} />)

    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(10)
    expect(screen.getByRole('group', { name: 'Sua nota' })).toBeInTheDocument()
    fireEvent.click(radios[2])
    expect(radios[2]).toBeChecked()
    fireEvent.click(radios[9])
    expect(radios[2]).not.toBeChecked()
  })

  it('mostra o erro da API no campo do texto', async () => {
    mockApi({
      [PUT]: {
        status: 400,
        body: {
          statusCode: 400,
          code: 'validation_failed',
          message: 'Dados inválidos.',
          details: [{ field: 'body', message: 'A resenha pode ter até 3.000 caracteres.' }],
        },
      },
    })
    renderWithProviders(<ReviewForm slug="sempiternal" existing={null} />)

    fireEvent.click(screen.getByRole('radio', { name: 'Nota 3' }))
    fireEvent.click(screen.getByRole('button', { name: 'Publicar avaliação' }))

    expect(await screen.findByText('A resenha pode ter até 3.000 caracteres.')).toBeInTheDocument()
    expect(screen.getByLabelText('Sua resenha (opcional)')).toHaveAttribute('aria-invalid', 'true')
  })

  it('explica quando o disco ainda não saiu (recusa da API)', async () => {
    mockApi({
      [PUT]: {
        status: 400,
        body: { statusCode: 400, code: 'release_not_out', message: 'Esse disco ainda não foi lançado, então ainda não pode receber nota.' },
      },
    })
    renderWithProviders(<ReviewForm slug="sempiternal" existing={null} />)

    fireEvent.click(screen.getByRole('radio', { name: 'Nota 3' }))
    fireEvent.click(screen.getByRole('button', { name: 'Publicar avaliação' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('ainda não foi lançado')
  })

  it('apaga a avaliação depois de confirmar', async () => {
    const fetchMock = mockApi({ 'DELETE /releases/sempiternal/reviews/me': { status: 204 } })
    renderWithProviders(<ReviewForm slug="sempiternal" existing={review()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }))
    expect(fetchMock).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Sim, excluir' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock.mock.calls[0][1]?.method).toBe('DELETE')
  })
})
