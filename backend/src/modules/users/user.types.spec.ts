import { needsEmailVerification } from './user.types.js';

describe('needsEmailVerification', () => {
  const pending = { emailVerifiedAt: null, role: 'USER' } as const;

  it('exige a confirmação quando há como enviar o e-mail e a conta ainda não confirmou', () => {
    expect(needsEmailVerification(pending, true)).toBe(true);
  });

  it('não exige nada sem como enviar e-mail: ninguém fica barrado', () => {
    expect(needsEmailVerification(pending, false)).toBe(false);
  });

  it('não exige de quem já confirmou nem de administradores', () => {
    expect(needsEmailVerification({ emailVerifiedAt: new Date(), role: 'USER' }, true)).toBe(false);
    expect(needsEmailVerification({ emailVerifiedAt: null, role: 'ADMIN' }, true)).toBe(false);
  });
});
