import type { AuthUser } from '../users/user.types.js';
import { ReviewPolicy } from './review.policy.js';

const user = (id: string, role: 'USER' | 'ADMIN' = 'USER') =>
  ({ id, role }) as AuthUser;

describe('ReviewPolicy.delete', () => {
  const policy = new ReviewPolicy();
  const review = { userId: 'autor' };

  it('o autor pode apagar a própria avaliação', () => {
    expect(policy.delete(user('autor'), review)).toBe(true);
  });

  it('outra pessoa não pode apagar a avaliação de alguém', () => {
    expect(policy.delete(user('outra-pessoa'), review)).toBe(false);
  });

  it('um administrador pode apagar a de qualquer pessoa (moderação)', () => {
    expect(policy.delete(user('admin', 'ADMIN'), review)).toBe(true);
  });

  it('um visitante não pode apagar nada', () => {
    expect(policy.delete(null, review)).toBe(false);
  });
});
