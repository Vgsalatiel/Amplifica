/** Tipos das respostas da API. Espelham o que o backend devolve em /api/v1. */

export type Role = 'USER' | 'MODERATOR' | 'ADMIN'

/** A própria conta, como vem de /auth/me, login, cadastro e renovação. */
/** Duas versões de cada imagem: a grande (página) e a pequena (listas). */
export interface ImageSet {
  large: string
  small: string
}

export interface User {
  id: string
  email: string
  username: string
  displayName: string
  bio: string | null
  avatar: ImageSet | null
  role: Role
  /** A confirmação do e-mail está pendente e impede avaliar discos. */
  needsEmailVerification: boolean
  createdAt: string
}

/** Perfil público: o que qualquer visitante vê. */
export interface PublicUser {
  username: string
  displayName: string
  bio: string | null
  avatar: ImageSet | null
  createdAt: string
}

export interface SessionResponse {
  accessToken: string
  expiresIn: number
  user: User
}

export interface ApiErrorDetail {
  field: string
  message: string
}

export interface Paginated<T> {
  items: T[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

export type ArtistType = 'BAND' | 'SOLO'
export type ReleaseType = 'ALBUM' | 'EP' | 'SINGLE' | 'LIVE' | 'COMPILATION'
export type DatePrecision = 'YEAR' | 'MONTH' | 'DAY'
export type ReleaseArtistRole = 'PRIMARY' | 'FEATURED'
export type ShowStatus = 'CONFIRMED' | 'SOLD_OUT' | 'CANCELLED'

export interface GenreRef {
  id: string
  name: string
  slug: string
}

export interface GenreItem extends GenreRef {
  description: string | null
  parentId: string | null
}

export type GenreNode = GenreItem & { children: GenreNode[] }

export interface ArtistSummary {
  id: string
  name: string
  slug: string
  type: ArtistType
  country: string | null
  image: ImageSet | null
  /** `true` quando não há foto cadastrada e `image` é a capa de um disco da banda. */
  imageFromRelease: boolean
  genres: GenreRef[]
}

/** Média das notas de um disco. `average` é null enquanto ninguém avaliou. */
export interface RatingSummary {
  average: number | null
  count: number
}

export interface ReleaseSummary {
  id: string
  title: string
  slug: string
  type: ReleaseType
  /** "2013", "2013-04" ou "2013-04-01": só a parte da data que se conhece. */
  releaseDate: string
  datePrecision: DatePrecision
  cover: ImageSet | null
  /** Cor de destaque da página do álbum, em #RRGGBB. */
  accentColor: string | null
  /** Média e contagem das avaliações, para mostrar a nota nas listas. */
  rating: RatingSummary
  artists: Array<{ id: string; name: string; slug: string; role: ReleaseArtistRole }>
}

export interface Source {
  name: string
  url: string
}

export interface ArtistDetail extends ArtistSummary {
  bio: string | null
  sources: Source[]
  city: string | null
  formedYear: number | null
  disbandedYear: number | null
  releases: ReleaseSummary[]
}

export interface Track {
  id: string
  title: string
  discNumber: number
  position: number
  durationMs: number | null
}

export interface ReleaseDetail extends ReleaseSummary {
  description: string | null
  youtubeVideoId: string | null
  tracks: Track[]
  durationMs: number | null
}

/** Um gênero com o pai, os subgêneros e quantos artistas estão ligados a ele. */
export interface GenreDetail extends GenreItem {
  parent: GenreRef | null
  children: GenreRef[]
  artistCount: number
}

// ---------------------------------------------------------------------------
// Avaliações
// ---------------------------------------------------------------------------

/** Avaliação na página de um disco: traz o autor (só o que é público). */
export interface Review {
  id: string
  rating: number
  body: string | null
  createdAt: string
  updatedAt: string
  edited: boolean
  author: { username: string; displayName: string; avatar: ImageSet | null }
}

/** Avaliação na página de um perfil: traz o disco avaliado no lugar do autor. */
export interface UserReview {
  id: string
  rating: number
  body: string | null
  createdAt: string
  updatedAt: string
  edited: boolean
  release: ReleaseSummary
}

export interface ShowAct {
  position: number
  name: string
  /** A banda no catálogo, quando existe; `null` para bandas de fora. */
  artist: { id: string; name: string; slug: string; image: ImageSet | null } | null
}

export interface Show {
  id: string
  slug: string
  /** Nome do evento (festival, turnê), quando existe. */
  name: string | null
  /** Dia do show, "AAAA-MM-DD". */
  date: string
  /** Horário de início, "HH:MM", ou `null` se não foi divulgado. */
  startTime: string | null
  venue: string
  city: string
  /** Sigla do estado, como "SP". */
  state: string
  status: ShowStatus
  ticketUrl: string | null
  /** Quem organiza o evento, e o link dela (ex.: o Instagram da produtora). */
  organizerName: string | null
  organizerUrl: string | null
  /** Pôster de divulgação, ou `null` se não há. */
  poster: ImageSet | null
  /** Quando a informação foi conferida pela última vez (ISO). */
  verifiedAt: string
  acts: ShowAct[]
  genres: GenreRef[]
}

/** Sugestão de show lida de uma página de ingressos. Nada é gravado: a pessoa confere e salva. */
export interface ShowImportPreview {
  /** Site de onde vieram os dados, como "www.ticket360.com.br". */
  source: string
  sourceUrl: string
  /** A página publica os dados do evento de forma legível; sem isso só o título vem preenchido. */
  structured: boolean
  name: string | null
  date: string | null
  startTime: string | null
  venue: string | null
  city: string | null
  state: string | null
  ticketUrl: string | null
  status: ShowStatus
  acts: Array<{ name: string; artistId: string | null }>
  warnings: string[]
  /** Endereço de um show igual que já está cadastrado, se houver. */
  existingShowSlug: string | null
}

/** Clipe da playlist "Agora na tela" (só os aprovados aparecem na lista pública). */
export interface PlaylistClip {
  id: string
  /** Código do vídeo no YouTube, com 11 caracteres. */
  youtubeId: string
  title: string
  channelName: string
  /** Os clipes fixos abrem a playlist e não mostram quem sugeriu. */
  pinned: boolean
  /** A banda do catálogo, quando alguém a ligou ao clipe. */
  artist: { slug: string; name: string } | null
  suggestedBy: { username: string; displayName: string } | null
  createdAt: string
}

export type ClipStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

/** Uma sugestão vista por quem a enviou. */
export interface MyClip {
  id: string
  youtubeId: string
  title: string
  channelName: string
  status: ClipStatus
  createdAt: string
}

/** Uma linha da fila de moderação. */
export interface ReviewClip extends PlaylistClip {
  status: ClipStatus
  reviewedAt: string | null
}

/** Alguém da equipe do site: administrador ou moderador. */
export interface TeamMember {
  username: string
  displayName: string
  role: Extract<Role, 'ADMIN' | 'MODERATOR'>
}

/** "Eu vou" num show: o total e só os nomes de quem aceitou aparecer. */
export interface ShowAttendanceSummary {
  count: number
  going: Array<{ username: string; displayName: string; avatar: ImageSet | null }>
}

/** A situação de quem está logado num show. */
export interface MyShowAttendance {
  going: boolean
  showName: boolean
}

/** Um comentário do mural de um show. */
export interface ShowComment {
  id: string
  body: string
  createdAt: string
  author: { username: string; displayName: string; avatar: ImageSet | null }
}

/** Um comentário denunciado, na fila da moderação. */
export interface ReportedComment extends ShowComment {
  show: { slug: string; name: string | null; acts: string[] }
  reportCount: number
  reasons: string[]
}

export type GroupPlatform = 'WHATSAPP' | 'TELEGRAM' | 'DISCORD'
export type GroupStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

/** Link de um grupo externo aprovado para quem vai a um show. */
export interface ShowGroup {
  id: string
  platform: GroupPlatform
  url: string
}

/** Uma linha da fila de moderação dos grupos. */
export interface ReviewGroup extends ShowGroup {
  status: GroupStatus
  createdAt: string
  reviewedAt: string | null
  show: { slug: string; name: string | null; acts: string[] }
  suggestedBy: { username: string } | null
}

/** Os clipes aprovados que uma pessoa sugeriu, para o perfil. */
export interface Discoveries {
  count: number
  items: PlaylistClip[]
}

/** Quanto o gosto de quem está logado combina com o de outra pessoa (pelas notas dadas a discos). */
export interface TasteMatch {
  /** 0 a 100, ou `null` quando há poucas bandas avaliadas pelas duas pessoas. */
  score: number | null
  sharedCount: number
  myRatedCount: number
  theirRatedCount: number
  bothLike: Array<{ artist: { slug: string; name: string; image: ImageSet | null }; mine: number; theirs: number }>
  recommended: Array<{ artist: { slug: string; name: string; image: ImageSet | null }; theirs: number }>
}
