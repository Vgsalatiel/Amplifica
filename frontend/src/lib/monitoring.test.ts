import { describe, expect, it } from 'vitest'
import { scrubEvent, scrubUrl } from './monitoring'

describe('monitoramento: nada pessoal vai junto do erro', () => {
  it('tira a busca e o fragmento dos endereços', () => {
    expect(scrubUrl('https://site/buscar?q=minha+banda#x')).toBe('https://site/buscar')
    expect(scrubUrl('https://site/artistas/fresno')).toBe('https://site/artistas/fresno')
  })

  it('tira cabeçalhos, cookies, corpo, busca e usuário do evento', () => {
    const event = scrubEvent({
      request: { url: 'https://site/redefinir-senha?x=1', headers: { cookie: 'a' }, cookies: { a: '1' }, query_string: 'x=1', data: { senha: 's' } },
      user: { email: 'a@b.com' },
    })

    expect(event).toEqual({ request: { url: 'https://site/redefinir-senha' } })
  })

  it('evento sem pedido nem usuário passa inteiro', () => {
    expect(scrubEvent({})).toEqual({})
  })
})
