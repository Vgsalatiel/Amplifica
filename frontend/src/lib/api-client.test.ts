import { describe, expect, it } from 'vitest'
import { headersOfCall, mockApi, sessionFor, testUser } from '../test/helpers'
import { ApiError, apiFetch } from './api-client'
import { refreshSession, sessionStore, startSession } from './session'

const unauthorized = { status: 401, body: { statusCode: 401, code: 'unauthorized', message: 'Entre na sua conta.' } }
const expired = { status: 401, body: { statusCode: 401, code: 'session_expired', message: 'Sua sessão expirou.' } }

describe('apiFetch', () => {
  it('envia o token de acesso quando há sessão', async () => {
    startSession(sessionFor(testUser, 'token-atual'))
    const fetchMock = mockApi({ 'GET /auth/me': { status: 200, body: testUser } })

    await apiFetch('/auth/me')

    expect(headersOfCall(fetchMock, 0).Authorization).toBe('Bearer token-atual')
  })

  it('renova a sessão e repete a chamada quando o token venceu', async () => {
    startSession(sessionFor(testUser, 'token-vencido'))
    const fetchMock = mockApi({
      'GET /auth/me': [unauthorized, { status: 200, body: testUser }],
      'POST /auth/refresh': { status: 200, body: sessionFor(testUser, 'token-novo') },
    })

    const result = await apiFetch('/auth/me')

    expect(result).toEqual(testUser)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(headersOfCall(fetchMock, 2).Authorization).toBe('Bearer token-novo')
  })

  it('encerra a sessão quando a renovação também falha', async () => {
    startSession(sessionFor())
    mockApi({ 'GET /auth/me': unauthorized, 'POST /auth/refresh': expired })

    await expect(apiFetch('/auth/me')).rejects.toBeInstanceOf(ApiError)

    expect(sessionStore.getState()).toEqual({ status: 'anonymous' })
  })

  it('converte o erro da API em ApiError com código, mensagem e campos', async () => {
    mockApi({
      'PATCH /users/me': {
        status: 400,
        body: {
          statusCode: 400,
          code: 'validation_error',
          message: 'Confira os campos destacados.',
          details: [{ field: 'bio', message: 'A bio pode ter até 280 caracteres.' }],
        },
      },
    })

    const error = await apiFetch('/users/me', { method: 'PATCH', json: {} }).catch((caught: unknown) => caught)

    expect(error).toMatchObject({ status: 400, code: 'validation_error' })
    expect((error as ApiError).details).toEqual([{ field: 'bio', message: 'A bio pode ter até 280 caracteres.' }])
  })
})

describe('refreshSession', () => {
  it('faz uma única chamada mesmo quando pedida várias vezes ao mesmo tempo', async () => {
    const fetchMock = mockApi({ 'POST /auth/refresh': { status: 200, body: sessionFor() } })

    await Promise.all([refreshSession(), refreshSession(), refreshSession()])

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(sessionStore.getState()).toEqual({ status: 'authenticated', user: testUser })
  })

  it('trata o visitante sem cookie como anônimo', async () => {
    mockApi({ 'POST /auth/refresh': expired })

    expect(await refreshSession()).toBeNull()
    expect(sessionStore.getState()).toEqual({ status: 'anonymous' })
  })
})
