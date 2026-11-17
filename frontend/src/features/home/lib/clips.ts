/** Um clipe da seção "Agora na tela", na página inicial. */
export interface Clip {
  /** Identificador estável, só para a lista. */
  id: string
  /** Endereço (slug) da banda no catálogo: dá a capa e o link da página dela. */
  artistSlug: string
  band: string
  /** Nome do clipe ou da música; `null` enquanto não se sabe. */
  title: string | null
  /** Link do clipe no YouTube (pode colar o endereço inteiro) ou só o código dele; `null` enquanto não há. */
  youtube: string | null
}

/** Legenda de abertura: aparece na tela antes do clipe, no lugar de uma narração em áudio. */
export const NARRATION = 'E agora, confira as novidades.'

/**
 * Os clipes da página inicial, na ordem em que aparecem. Para colocar um clipe no ar, preencha o
 * `youtube` dele (o link inteiro serve); sem ele, a tela mostra a capa da banda e o link para a página dela. Para
 * acrescentar um, copie uma linha e use o slug de uma banda que já esteja no catálogo.
 */
export const CLIPS: Clip[] = [
  {
    id: 'bullet-bane',
    artistSlug: 'bullet-bane',
    band: 'Bullet Bane',
    title: null,
    youtube: 'https://www.youtube.com/watch?v=JPUuPU6VuZY',
  },
  {
    id: 'fresno',
    artistSlug: 'fresno',
    band: 'Fresno',
    title: null,
    youtube: 'https://www.youtube.com/watch?v=3psvNDHQv7Y',
  },
]
