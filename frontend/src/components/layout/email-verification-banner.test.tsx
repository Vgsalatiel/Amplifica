import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { endSession, startSession } from '../../lib/session'
import { mockApi, renderWithProviders, sessionFor, testUser } from '../../test/helpers'
import { EmailVerificationBanner } from './email-verification-banner'

describe('EmailVerificationBanner', () => {
  it('aparece só para quem está logado e ainda precisa confirmar o e-mail', () => {
    startSession(sessionFor({ ...testUser, needsEmailVerification: true }))
    renderWithProviders(<EmailVerificationBanner />)

    expect(screen.getByText(/Confirme seu e-mail para poder avaliar discos/)).toBeInTheDocument()
    expect(screen.getByText(/marina@exemplo.com/)).toBeInTheDocument()
  })

  it('não aparece para visitante nem para quem já confirmou', () => {
    endSession()
    const { unmount } = renderWithProviders(<EmailVerificationBanner />)
    expect(screen.queryByText(/Confirme seu e-mail/)).not.toBeInTheDocument()
    unmount()

    startSession(sessionFor())
    renderWithProviders(<EmailVerificationBanner />)
    expect(screen.queryByText(/Confirme seu e-mail/)).not.toBeInTheDocument()
  })

  it('reenvia o e-mail e confirma o envio', async () => {
    startSession(sessionFor({ ...testUser, needsEmailVerification: true }))
    const fetchMock = mockApi({ 'POST /auth/resend-verification': { status: 204 } })
    renderWithProviders(<EmailVerificationBanner />)

    fireEvent.click(screen.getByRole('button', { name: 'Reenviar e-mail' }))

    expect(await screen.findByRole('status')).toHaveTextContent('E-mail enviado')
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST')
  })

  it('mostra o motivo quando o reenvio falha', async () => {
    startSession(sessionFor({ ...testUser, needsEmailVerification: true }))
    mockApi({ 'POST /auth/resend-verification': { status: 503, body: { statusCode: 503, code: 'email_send_failed', message: 'Não foi possível enviar o e-mail agora. Tente de novo em instantes.' } } })
    renderWithProviders(<EmailVerificationBanner />)

    fireEvent.click(screen.getByRole('button', { name: 'Reenviar e-mail' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível enviar o e-mail agora')
  })
})
