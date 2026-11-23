/**
 * Links para ouvir um disco. Sem acordo com as plataformas e sem os códigos de cada disco, o link do
 * Spotify e o do YouTube Music levam à busca por "artista + título", que acha o disco. Se o disco
 * tiver um vídeo cadastrado, o link do YouTube Music vai direto a ele.
 */
export function listenLinks(input: { title: string; artists: string[]; youtubeVideoId: string | null }) {
  const query = encodeURIComponent([...input.artists, input.title].join(' '))
  return {
    youtubeMusic: input.youtubeVideoId
      ? `https://music.youtube.com/watch?v=${input.youtubeVideoId}`
      : `https://music.youtube.com/search?q=${query}`,
    spotify: `https://open.spotify.com/search/${query}`,
  }
}
