import { ConflictException, NotFoundException } from '@nestjs/common';
import { FavoritesService, MAX_FAVORITES } from './favorites.service.js';
import type { AuthUser } from '../users/user.types.js';

const user = { id: 'u1' } as AuthUser;

/** Banco de mentira só com o que o serviço usa. */
function setup(artists: Record<string, string> = { 'knocked-loose': 'a1', 'fresno': 'a2' }) {
  const favorites: Array<{ userId: string; artistId: string; createdAt: Date }> = [];
  const users: Record<string, string> = { ana: 'u1' };
  const prisma = {
    artist: {
      findUnique: ({ where }: { where: { slug: string } }) =>
        Promise.resolve(artists[where.slug] ? { id: artists[where.slug] } : null),
    },
    user: {
      findUnique: ({ where }: { where: { username: string } }) =>
        Promise.resolve(users[where.username] ? { id: users[where.username] } : null),
    },
    artistFavorite: {
      findUnique: ({ where }: { where: { userId_artistId: { userId: string; artistId: string } } }) =>
        Promise.resolve(
          favorites.find(
            (f) => f.userId === where.userId_artistId.userId && f.artistId === where.userId_artistId.artistId,
          ) ?? null,
        ),
      count: ({ where }: { where: { userId: string } }) =>
        Promise.resolve(favorites.filter((f) => f.userId === where.userId).length),
      createMany: ({ data }: { data: Array<{ userId: string; artistId: string }> }) => {
        for (const row of data) {
          if (!favorites.some((f) => f.userId === row.userId && f.artistId === row.artistId)) {
            favorites.push({ ...row, createdAt: new Date(favorites.length) });
          }
        }
        return Promise.resolve();
      },
      deleteMany: ({ where }: { where: { userId: string; artistId: string } }) => {
        const index = favorites.findIndex((f) => f.userId === where.userId && f.artistId === where.artistId);
        if (index >= 0) favorites.splice(index, 1);
        return Promise.resolve();
      },
      findMany: ({ where }: { where: { userId: string } }) =>
        Promise.resolve(
          favorites
            .filter((f) => f.userId === where.userId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .map((f) => ({ artistId: f.artistId })),
        ),
    },
  };
  const artistsService = { summariesByIds: (ids: string[]) => Promise.resolve(ids.map((id) => ({ id }))) };
  return { service: new FavoritesService(prisma as never, artistsService as never), favorites };
}

describe('FavoritesService', () => {
  it('marca, confere e tira a estrela', async () => {
    const { service } = setup();
    expect(await service.mine(user, 'knocked-loose')).toEqual({ favorite: false });
    expect(await service.add(user, 'knocked-loose')).toEqual({ favorite: true });
    expect(await service.mine(user, 'knocked-loose')).toEqual({ favorite: true });
    await service.remove(user, 'knocked-loose');
    expect(await service.mine(user, 'knocked-loose')).toEqual({ favorite: false });
  });

  it('marcar duas vezes não duplica, e tirar uma que não estava marcada não dá erro', async () => {
    const { service, favorites } = setup();
    await service.add(user, 'fresno');
    await service.add(user, 'fresno');
    expect(favorites).toHaveLength(1);
    await expect(service.remove(user, 'knocked-loose')).resolves.toBeUndefined();
  });

  it('banda que não existe responde 404', async () => {
    const { service } = setup();
    await expect(service.add(user, 'nao-existe')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.mine(user, 'nao-existe')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('respeita o limite de favoritas', async () => {
    const { service, favorites } = setup();
    for (let i = 0; i < MAX_FAVORITES; i += 1) favorites.push({ userId: 'u1', artistId: `x${i}`, createdAt: new Date(i) });
    await expect(service.add(user, 'fresno')).rejects.toBeInstanceOf(ConflictException);
  });

  it('a lista do perfil vem da mais recente para a mais antiga, e perfil inexistente é 404', async () => {
    const { service } = setup();
    await service.add(user, 'knocked-loose');
    await service.add(user, 'fresno');
    expect(await service.listFor('ana')).toEqual([{ id: 'a2' }, { id: 'a1' }]);
    await expect(service.listFor('ninguem')).rejects.toBeInstanceOf(NotFoundException);
  });
});
