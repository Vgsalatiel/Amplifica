import { buildGenreTree, descendantIds } from './genre-tree.js';

const rows = [
  { id: 'metal', parentId: null, name: 'Metal' },
  { id: 'metalcore', parentId: 'metal', name: 'Metalcore' },
  { id: 'melodic', parentId: 'metalcore', name: 'Melodic Metalcore' },
  { id: 'deathcore', parentId: 'metal', name: 'Deathcore' },
  { id: 'emo', parentId: null, name: 'Emo' },
  { id: 'midwest', parentId: 'emo', name: 'Midwest Emo' },
];

describe('buildGenreTree', () => {
  it('aninha cada gênero sob o seu pai, em qualquer profundidade', () => {
    const tree = buildGenreTree(rows);

    expect(tree.map((node) => node.id)).toEqual(['metal', 'emo']);
    expect(tree[0].children.map((node) => node.id)).toEqual([
      'metalcore',
      'deathcore',
    ]);
    expect(tree[0].children[0].children.map((node) => node.id)).toEqual([
      'melodic',
    ]);
  });

  it('trata como raiz um gênero cujo pai não veio na lista', () => {
    const tree = buildGenreTree([{ id: 'orfao', parentId: 'sumiu' }]);

    expect(tree.map((node) => node.id)).toEqual(['orfao']);
  });
});

describe('descendantIds', () => {
  it('reúne filhos e netos, sem o próprio gênero', () => {
    expect(descendantIds(rows, 'metal').sort()).toEqual([
      'deathcore',
      'melodic',
      'metalcore',
    ]);
  });

  it('devolve lista vazia para um gênero sem subgêneros', () => {
    expect(descendantIds(rows, 'midwest')).toEqual([]);
  });

  it('não entra em laço se houver um ciclo nos dados', () => {
    const cyclic = [
      { id: 'a', parentId: 'b' },
      { id: 'b', parentId: 'a' },
    ];

    expect(descendantIds(cyclic, 'a')).toEqual(['b']);
  });
});
