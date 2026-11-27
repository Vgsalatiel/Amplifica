import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { apiError } from '../../common/api-error.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ImagesService } from '../images/images.service.js';
import {
  toPublicUser,
  type AuthUser,
  type PublicUserResponse,
} from '../users/user.types.js';

/** Teto de pessoas seguidas: o feed lê atividade de todas elas, e o limite evita abuso. */
export const MAX_FOLLOWING = 1000;
/** Quantas pessoas as listas de seguidores e de seguindo mostram. */
const LIST_LIMIT = 100;

export interface FollowState {
  following: boolean;
}

export interface FollowCounts {
  followers: number;
  following: number;
}

const USER_NOT_FOUND = apiError(
  'user_not_found',
  'Não existe um perfil com esse nome.',
);

@Injectable()
export class FollowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly images: ImagesService,
  ) {}

  private async findUser(username: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) {
      throw new NotFoundException(USER_NOT_FOUND);
    }
    return user;
  }

  /** Quem está logado segue esta pessoa? */
  async state(me: AuthUser, username: string): Promise<FollowState> {
    const target = await this.findUser(username);
    const found = await this.prisma.follow.findUnique({
      where: {
        followerId_followedId: { followerId: me.id, followedId: target.id },
      },
      select: { followerId: true },
    });
    return { following: found !== null };
  }

  /** Passa a seguir. Repetir não faz mal. Ninguém segue a si mesmo. */
  async follow(me: AuthUser, username: string): Promise<FollowState> {
    const target = await this.findUser(username);
    if (target.id === me.id) {
      throw new BadRequestException(
        apiError('cannot_follow_self', 'Você não pode seguir a si mesmo.'),
      );
    }
    const already = await this.prisma.follow.findUnique({
      where: {
        followerId_followedId: { followerId: me.id, followedId: target.id },
      },
      select: { followerId: true },
    });
    if (!already) {
      const total = await this.prisma.follow.count({
        where: { followerId: me.id },
      });
      if (total >= MAX_FOLLOWING) {
        throw new ConflictException(
          apiError(
            'following_limit',
            `Você chegou ao limite de ${MAX_FOLLOWING} pessoas seguidas. Deixe de seguir alguém para seguir outra pessoa.`,
          ),
        );
      }
      await this.prisma.follow.createMany({
        data: [{ followerId: me.id, followedId: target.id }],
        skipDuplicates: true,
      });
    }
    return { following: true };
  }

  /** Deixa de seguir. Se não seguia, não faz nada. */
  async unfollow(me: AuthUser, username: string): Promise<void> {
    const target = await this.findUser(username);
    await this.prisma.follow.deleteMany({
      where: { followerId: me.id, followedId: target.id },
    });
  }

  /** Quantos seguem e quantos esta pessoa segue. Público, como o perfil. */
  async counts(username: string): Promise<FollowCounts> {
    const target = await this.findUser(username);
    const [followers, following] = await Promise.all([
      this.prisma.follow.count({ where: { followedId: target.id } }),
      this.prisma.follow.count({ where: { followerId: target.id } }),
    ]);
    return { followers, following };
  }

  /** Quem segue esta pessoa, do mais recente ao mais antigo. */
  async followers(username: string): Promise<PublicUserResponse[]> {
    const target = await this.findUser(username);
    const rows = await this.prisma.follow.findMany({
      where: { followedId: target.id },
      orderBy: [{ createdAt: 'desc' }, { followerId: 'asc' }],
      take: LIST_LIMIT,
      select: { follower: true },
    });
    return rows.map(({ follower }) =>
      toPublicUser(follower, (path) => this.images.toSet(path)),
    );
  }

  /** Quem esta pessoa segue, do mais recente ao mais antigo. */
  async following(username: string): Promise<PublicUserResponse[]> {
    const target = await this.findUser(username);
    const rows = await this.prisma.follow.findMany({
      where: { followerId: target.id },
      orderBy: [{ createdAt: 'desc' }, { followedId: 'asc' }],
      take: LIST_LIMIT,
      select: { followed: true },
    });
    return rows.map(({ followed }) =>
      toPublicUser(followed, (path) => this.images.toSet(path)),
    );
  }
}
