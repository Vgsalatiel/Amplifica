import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../users/user.types.js';
import { FollowsService, MAX_FOLLOWING } from './follows.service.js';

const me = { id: 'u1', username: 'ana' } as AuthUser;

function setup() {
  const users: Record<string, { id: string; username: string; displayName: string; bio: null; avatarPath: null; createdAt: Date }> = {
    ana: { id: 'u1', username: 'ana', displayName: 'Ana', bio: null, avatarPath: null, createdAt: new Date() },
    bia: { id: 'u2', username: 'bia', displayName: 'Bia', bio: null, avatarPath: null, createdAt: new Date() },
  };
  const follows: Array<{ followerId: string; followedId: string; createdAt: Date }> = [];
  const prisma = {
    user: { findUnique: ({ where }: { where: { username: string } }) => Promise.resolve(users[where.username] ?? null) },
    follow: {
      findUnique: ({ where }: { where: { followerId_followedId: { followerId: string; followedId: string } } }) =>
        Promise.resolve(
          follows.find((f) => f.followerId === where.followerId_followedId.followerId && f.followedId === where.followerId_followedId.followedId) ?? null,
        ),
      count: ({ where }: { where: { followerId?: string; followedId?: string } }) =>
        Promise.resolve(follows.filter((f) => (where.followerId ? f.followerId === where.followerId : f.followedId === where.followedId)).length),
      createMany: ({ data }: { data: Array<{ followerId: string; followedId: string }> }) => {
        for (const row of data) {
          if (!follows.some((f) => f.followerId === row.followerId && f.followedId === row.followedId)) follows.push({ ...row, createdAt: new Date(follows.length) });
        }
        return Promise.resolve();
      },
      deleteMany: ({ where }: { where: { followerId: string; followedId: string } }) => {
        const index = follows.findIndex((f) => f.followerId === where.followerId && f.followedId === where.followedId);
        if (index >= 0) follows.splice(index, 1);
        return Promise.resolve();
      },
      findMany: ({ where }: { where: { followerId?: string; followedId?: string } }) =>
        Promise.resolve(
          follows
            .filter((f) => (where.followerId ? f.followerId === where.followerId : f.followedId === where.followedId))
            .map((f) => ({ follower: Object.values(users).find((u) => u.id === f.followerId), followed: Object.values(users).find((u) => u.id === f.followedId) })),
        ),
    },
  };
  const images = { toSet: () => null };
  return { service: new FollowsService(prisma as never, images as never), follows };
}

describe('FollowsService', () => {
  it('segue, confere e deixa de seguir; repetir não duplica nem dá erro', async () => {
    const { service, follows } = setup();
    expect(await service.state(me, 'bia')).toEqual({ following: false });
    expect(await service.follow(me, 'bia')).toEqual({ following: true });
    await service.follow(me, 'bia');
    expect(follows).toHaveLength(1);
    expect(await service.state(me, 'bia')).toEqual({ following: true });
    await service.unfollow(me, 'bia');
    await expect(service.unfollow(me, 'bia')).resolves.toBeUndefined();
    expect(await service.state(me, 'bia')).toEqual({ following: false });
  });

  it('ninguém segue a si mesmo, e perfil inexistente é 404', async () => {
    const { service } = setup();
    await expect(service.follow(me, 'ana')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.follow(me, 'ninguem')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.counts('ninguem')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('respeita o limite de pessoas seguidas', async () => {
    const { service, follows } = setup();
    for (let i = 0; i < MAX_FOLLOWING; i += 1) follows.push({ followerId: 'u1', followedId: `x${i}`, createdAt: new Date(i) });
    await expect(service.follow(me, 'bia')).rejects.toBeInstanceOf(ConflictException);
  });

  it('conta seguidores e seguindo, e as listas só trazem dados públicos', async () => {
    const { service } = setup();
    await service.follow(me, 'bia');
    expect(await service.counts('bia')).toEqual({ followers: 1, following: 0 });
    expect(await service.counts('ana')).toEqual({ followers: 0, following: 1 });
    const followers = await service.followers('bia');
    expect(followers.map((user) => user.username)).toEqual(['ana']);
    expect(Object.keys(followers[0]!).sort()).toEqual(['avatar', 'bio', 'createdAt', 'displayName', 'username']);
    expect((await service.following('ana')).map((user) => user.username)).toEqual(['bia']);
  });
});
