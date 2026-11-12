/**
 * Árvore inicial de gêneros do Amplifica. É uma proposta de partida, não um cânone:
 * a classificação de gêneros é discutível, e o admin pode renomear, mover e criar
 * gêneros depois. Pais vêm antes dos filhos.
 */
export interface GenreSeed {
  name: string;
  /** Nome do gênero pai, que precisa aparecer antes na lista. */
  parent?: string;
}

export const GENRE_SEEDS: GenreSeed[] = [
  { name: 'Alternative Rock' },
  { name: 'Indie Rock', parent: 'Alternative Rock' },

  { name: 'Emo' },
  { name: 'Midwest Emo', parent: 'Emo' },
  { name: 'Screamo', parent: 'Emo' },

  { name: 'Punk Rock' },
  { name: 'Pop Punk', parent: 'Punk Rock' },

  { name: 'Hardcore' },
  { name: 'Melodic Hardcore', parent: 'Hardcore' },
  { name: 'Post-Hardcore', parent: 'Hardcore' },

  { name: 'Metal' },
  { name: 'Metalcore', parent: 'Metal' },
  { name: 'Deathcore', parent: 'Metal' },
  { name: 'Nu Metal', parent: 'Metal' },

  { name: 'Rock Nacional' },
];
