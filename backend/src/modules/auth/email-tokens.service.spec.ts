import { EmailTokensService, MAX_CODE_ATTEMPTS } from './email-tokens.service.js';

interface Row {
  id: string;
  userId: string;
  purpose: string;
  tokenHash: string;
  usedAt: Date | null;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
}

/** Banco de mentira só com o que o serviço usa de `emailToken`. */
function fakePrisma() {
  const rows: Row[] = [];
  let next = 1;
  const match = (row: Row, where: Record<string, unknown>) =>
    Object.entries(where).every(([key, cond]) => {
      const value = row[key as keyof Row];
      if (cond && typeof cond === 'object' && 'gt' in cond) return value! > (cond as { gt: Date }).gt;
      if (cond && typeof cond === 'object' && 'lt' in cond) return value! < (cond as { lt: number | Date }).lt;
      return value === cond;
    });
  const emailToken = {
    deleteMany: ({ where }: { where: Record<string, unknown> }) => {
      for (let i = rows.length - 1; i >= 0; i -= 1) if (match(rows[i]!, where)) rows.splice(i, 1);
      return Promise.resolve({ count: 0 });
    },
    create: ({ data }: { data: Partial<Row> }) => {
      rows.push({ id: String(next++), usedAt: null, attempts: 0, createdAt: new Date(), ...data } as Row);
      return Promise.resolve();
    },
    findFirst: ({ where }: { where: Record<string, unknown> }) =>
      Promise.resolve(rows.filter((row) => match(row, where)).at(-1) ?? null),
    updateMany: ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
      const hit = rows.filter((row) => match(row, where));
      for (const row of hit) {
        for (const [key, value] of Object.entries(data)) {
          if (value && typeof value === 'object' && 'increment' in value) {
            (row as unknown as Record<string, number>)[key]! += (value as { increment: number }).increment;
          } else (row as unknown as Record<string, unknown>)[key] = value;
        }
      }
      return Promise.resolve({ count: hit.length });
    },
  };
  const prisma = { emailToken, $transaction: (ops: Array<Promise<unknown>>) => Promise.all(ops) };
  return { service: new EmailTokensService(prisma as never), rows };
}

describe('códigos de e-mail', () => {
  it('cria um código de 6 números e guarda só o hash', async () => {
    const { service, rows } = fakePrisma();
    const code = await service.createCode('u1', 'RESET_PASSWORD');
    expect(code).toMatch(/^\d{6}$/);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.tokenHash).not.toContain(code);
  });

  it('confere sem gastar, e gasta quando pedido', async () => {
    const { service } = fakePrisma();
    const code = await service.createCode('u1', 'RESET_PASSWORD');
    expect(await service.verifyCode('u1', 'RESET_PASSWORD', code, { consume: false })).toBe(true);
    expect(await service.verifyCode('u1', 'RESET_PASSWORD', code, { consume: true })).toBe(true);
    expect(await service.verifyCode('u1', 'RESET_PASSWORD', code, { consume: true })).toBe(false);
  });

  it('o código de uma pessoa não vale para outra', async () => {
    const { service } = fakePrisma();
    const code = await service.createCode('u1', 'RESET_PASSWORD');
    expect(await service.verifyCode('u2', 'RESET_PASSWORD', code, { consume: false })).toBe(false);
  });

  it('depois de várias tentativas erradas, nem o código certo vale mais', async () => {
    const { service } = fakePrisma();
    const code = await service.createCode('u1', 'RESET_PASSWORD');
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < MAX_CODE_ATTEMPTS; i += 1) {
      expect(await service.verifyCode('u1', 'RESET_PASSWORD', wrong, { consume: false })).toBe(false);
    }
    expect(await service.verifyCode('u1', 'RESET_PASSWORD', code, { consume: false })).toBe(false);
  });

  it('um código novo invalida o anterior', async () => {
    const { service } = fakePrisma();
    const first = await service.createCode('u1', 'RESET_PASSWORD');
    const second = await service.createCode('u1', 'RESET_PASSWORD');
    if (first !== second) {
      expect(await service.verifyCode('u1', 'RESET_PASSWORD', first, { consume: false })).toBe(false);
    }
    expect(await service.verifyCode('u1', 'RESET_PASSWORD', second, { consume: false })).toBe(true);
  });
});
