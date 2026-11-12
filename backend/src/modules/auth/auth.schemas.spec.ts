import { registerSchema, usernameSchema } from './auth.schemas.js';

describe('usernameSchema', () => {
  it.each(['ana', 'marina.fz', 'caio_dx', 'user2024'])(
    'aceita "%s"',
    (value) => {
      expect(usernameSchema.safeParse(value).success).toBe(true);
    },
  );

  it.each([
    ['ab', 'curto demais'],
    ['a'.repeat(21), 'longo demais'],
    ['Marina', 'com maiúscula'],
    ['nome com espaço', 'com espaço'],
    ['joão', 'com acento'],
    ['admin', 'reservado'],
    ['me', 'curto e reservado'],
  ])('recusa "%s" (%s)', (value) => {
    expect(usernameSchema.safeParse(value).success).toBe(false);
  });
});

describe('registerSchema', () => {
  const valid = {
    email: 'Pessoa@Exemplo.com',
    username: 'pessoa',
    password: 'senha-segura',
  };

  it('normaliza o e-mail para minúsculas', () => {
    expect(registerSchema.parse(valid).email).toBe('pessoa@exemplo.com');
  });

  it('descarta campos desconhecidos', () => {
    expect(
      registerSchema.parse({ ...valid, role: 'ADMIN' }),
    ).not.toHaveProperty('role');
  });

  it('exige senha de pelo menos 8 caracteres', () => {
    expect(
      registerSchema.safeParse({ ...valid, password: '1234567' }).success,
    ).toBe(false);
  });
});
