import { initMonitoring, scrubEvent } from './monitoring.js';

describe('monitoramento', () => {
  it('sem DSN, não liga nada', () => {
    expect(initMonitoring(undefined, 'production')).toBe(false);
    expect(initMonitoring('', 'production')).toBe(false);
  });

  it('o evento sai sem cabeçalhos, cookies, corpo, busca nem usuário', () => {
    const event = scrubEvent({
      request: {
        url: 'https://api/auth/login?email=a@b.com',
        headers: { authorization: 'Bearer x', cookie: 'r=1' },
        cookies: { r: '1' },
        data: { password: 'segredo' },
        query_string: 'email=a@b.com',
      },
      user: { email: 'a@b.com', ip_address: '1.2.3.4' },
    });

    expect(event).toEqual({ request: { url: 'https://api/auth/login' } });
  });

  it('evento sem pedido nem usuário passa inteiro', () => {
    expect(scrubEvent({})).toEqual({});
  });
});
