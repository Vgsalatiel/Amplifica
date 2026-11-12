import { describe, expect, it } from 'vitest'
import type { ReleaseDetail } from '../../../types/api'
import {
  artistToValues,
  buildArtistPayload,
  buildReleasePayload,
  nextTrack,
  releaseToValues,
  type ReleaseFormValues,
} from './forms'

describe('buildArtistPayload', () => {
  const base = { ...artistToValues(), name: '  Vidro Fosco  ', country: ' BR ', formedYear: '2016' }

  it('converte textos em números e vazios em null', () => {
    const result = buildArtistPayload({ ...base, disbandedYear: '', slug: '  ' })

    expect(result).toEqual({
      payload: expect.objectContaining({
        name: 'Vidro Fosco',
        country: 'BR',
        formedYear: 2016,
        disbandedYear: null,
        type: 'BAND',
      }),
    })
    // Slug vazio é omitido: a API gera o endereço a partir do nome.
    expect('slug' in (result as { payload: object }).payload).toBe(false)
  })

  it('envia país vazio como null, para a API não recusar o campo', () => {
    const result = buildArtistPayload({ ...base, country: '' })

    expect(result).toEqual({ payload: expect.objectContaining({ country: null }) })
  })

  it('aponta anos que não são números de quatro dígitos', () => {
    expect(buildArtistPayload({ ...base, formedYear: '16', disbandedYear: 'abc' })).toEqual({
      errors: {
        formedYear: expect.any(String),
        disbandedYear: expect.any(String),
      },
    })
  })
})

describe('buildReleasePayload', () => {
  const values: ReleaseFormValues = {
    ...releaseToValues(),
    title: ' Tudo Que Sobrou ',
    releaseDate: '2024-06-14',
    artists: [{ artistId: 'a1', name: 'Vidro Fosco', role: 'PRIMARY' }],
    tracks: [
      { key: 'k1', discNumber: '1', position: '1', title: 'Geada', duration: '2:48' },
      { key: 'k2', discNumber: '', position: '2', title: 'Vidro', duration: '' },
    ],
  }

  it('monta o corpo da requisição com durações em milissegundos', () => {
    expect(buildReleasePayload(values)).toEqual({
      payload: {
        title: 'Tudo Que Sobrou',
        type: 'ALBUM',
        releaseDate: '2024-06-14',
        description: '',
        youtube: '',
        artists: [{ artistId: 'a1', role: 'PRIMARY' }],
        tracks: [
          { title: 'Geada', discNumber: 1, position: 1, durationMs: 168_000 },
          { title: 'Vidro', discNumber: 1, position: 2, durationMs: null },
        ],
      },
    })
  })

  it('aponta a faixa e o campo com problema, sem chamar a API', () => {
    const result = buildReleasePayload({
      ...values,
      artists: [],
      tracks: [{ key: 'k1', discNumber: '1', position: '', title: ' ', duration: '3:99' }],
    })

    expect(result).toEqual({
      errors: {
        artists: expect.any(String),
        'tracks.0.position': expect.any(String),
        'tracks.0.durationMs': expect.any(String),
        'tracks.0.title': expect.any(String),
      },
    })
  })
})

describe('releaseToValues', () => {
  it('prepara o formulário de edição a partir do lançamento salvo', () => {
    const release = {
      title: 'Tudo Que Sobrou',
      slug: 'vidro-fosco-tudo-que-sobrou',
      type: 'EP',
      releaseDate: '2024-06',
      description: null,
      youtubeVideoId: 'dQw4w9WgXcQ',
      artists: [{ id: 'a1', name: 'Vidro Fosco', slug: 'vidro-fosco', role: 'PRIMARY' }],
      tracks: [{ id: 't1', title: 'Geada', discNumber: 2, position: 1, durationMs: 207_000 }],
    } as unknown as ReleaseDetail

    const values = releaseToValues(release)

    expect(values).toMatchObject({
      type: 'EP',
      releaseDate: '2024-06',
      description: '',
      youtube: 'https://youtu.be/dQw4w9WgXcQ',
      artists: [{ artistId: 'a1', name: 'Vidro Fosco', role: 'PRIMARY' }],
    })
    expect(values.tracks[0]).toMatchObject({ discNumber: '2', position: '1', duration: '3:27' })
  })
})

describe('nextTrack', () => {
  it('começa na faixa 1 do disco 1', () => {
    expect(nextTrack([])).toMatchObject({ discNumber: '1', position: '1' })
  })

  it('continua a numeração do último disco', () => {
    const tracks = [
      { key: 'a', discNumber: '1', position: '1', title: '', duration: '' },
      { key: 'b', discNumber: '1', position: '2', title: '', duration: '' },
      { key: 'c', discNumber: '2', position: '1', title: '', duration: '' },
    ]

    expect(nextTrack(tracks)).toMatchObject({ discNumber: '2', position: '2' })
  })
})
