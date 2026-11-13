import { describe, expect, it } from 'vitest'
import type { Show, ShowImportPreview } from '../../../types/api'
import { applyImportPreview, buildShowPayload, moveAct, newAct, showToValues } from './show-forms'

const show: Show = {
  id: 's1',
  slug: 'linkin-park-sao-paulo-2027-03-15',
  name: null,
  date: '2027-03-15',
  startTime: '20:00',
  venue: 'Allianz Parque',
  city: 'São Paulo',
  state: 'SP',
  status: 'SOLD_OUT',
  ticketUrl: 'https://ingressos.exemplo.test/lp',
  verifiedAt: '2026-11-13T15:30:00.000Z',
  acts: [
    {
      position: 0,
      name: 'Linkin Park',
      artist: {
        id: 'a1',
        name: 'Linkin Park',
        slug: 'linkin-park',
        image: null,
      },
    },
    { position: 1, name: 'Banda de Fora', artist: null },
  ],
  genres: [{ id: 'g1', name: 'Rock alternativo', slug: 'rock-alternativo' }],
}

describe('showToValues', () => {
  it('preenche o formulário com o show e guarda quais bandas são do catálogo', () => {
    const values = showToValues(show)

    expect(values).toMatchObject({
      date: '2027-03-15',
      startTime: '20:00',
      status: 'SOLD_OUT',
      verifiedAt: '2026-11-13',
      genreIds: ['g1'],
    })
    expect(values.acts.map((act) => [act.name, act.artistId])).toEqual([
      ['Linkin Park', 'a1'],
      ['Banda de Fora', null],
    ])
  })

  it('em um show novo, a conferência é de hoje e a situação é "confirmado"', () => {
    const values = showToValues()

    expect(values.status).toBe('CONFIRMED')
    expect(values.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(values.acts).toEqual([])
  })
})

describe('buildShowPayload', () => {
  const base = {
    ...showToValues(),
    date: '2027-03-15',
    venue: '  Allianz Parque ',
    city: ' São Paulo ',
    state: 'SP',
    acts: [newAct(' Linkin Park ', 'a1')],
  }

  it('apara os textos, mantém o link da banda e omite o endereço vazio', () => {
    const result = buildShowPayload({ ...base, slug: '  ' })

    expect(result).toEqual({
      payload: expect.objectContaining({
        venue: 'Allianz Parque',
        city: 'São Paulo',
        acts: [{ name: 'Linkin Park', artistId: 'a1' }],
      }),
    })
    expect('slug' in (result as { payload: object }).payload).toBe(false)
  })

  it('exige ao menos uma banda', () => {
    expect(buildShowPayload({ ...base, acts: [] })).toEqual({
      errors: { acts: expect.any(String) },
    })
  })

  it('aponta a banda sem nome pela posição dela', () => {
    expect(buildShowPayload({ ...base, acts: [newAct('Ok'), newAct('   ')] })).toEqual({
      errors: { 'acts.1.name': expect.any(String) },
    })
  })
})

describe('moveAct', () => {
  const acts = [newAct('A'), newAct('B'), newAct('C')]
  const names = (list: typeof acts) => list.map((act) => act.name).join('')

  it('troca a banda de lugar', () => {
    expect(names(moveAct(acts, 2, -1))).toBe('ACB')
    expect(names(moveAct(acts, 0, 1))).toBe('BAC')
  })

  it('não sai dos limites da lista', () => {
    expect(moveAct(acts, 0, -1)).toBe(acts)
    expect(moveAct(acts, 2, 1)).toBe(acts)
  })
})

describe('applyImportPreview', () => {
  const preview: ShowImportPreview = {
    source: 'www.exemplo-ingressos.test',
    sourceUrl: 'https://www.exemplo-ingressos.test/evento/1',
    structured: true,
    name: 'Festival',
    date: '2027-05-10',
    startTime: '17:00',
    venue: 'Arena',
    city: 'Goiânia',
    state: 'GO',
    ticketUrl: 'https://www.exemplo-ingressos.test/evento/1',
    status: 'SOLD_OUT',
    acts: [
      { name: 'Vidro Fosco', artistId: 'a1' },
      { name: 'Banda de Fora', artistId: null },
    ],
    warnings: [],
    existingShowSlug: null,
  }

  it('preenche os campos e leva o link das bandas do catálogo', () => {
    const values = applyImportPreview(showToValues(), preview)

    expect(values).toMatchObject({
      name: 'Festival',
      date: '2027-05-10',
      startTime: '17:00',
      venue: 'Arena',
      city: 'Goiânia',
      state: 'GO',
      status: 'SOLD_OUT',
    })
    expect(values.acts.map((act) => [act.name, act.artistId])).toEqual([
      ['Vidro Fosco', 'a1'],
      ['Banda de Fora', null],
    ])
    expect(values.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('o que a página não informa fica como a pessoa já tinha digitado', () => {
    const typed = {
      ...showToValues(),
      venue: 'Digitado',
      startTime: '20:00',
      acts: [newAct('Minha banda')],
    }
    const values = applyImportPreview(typed, {
      ...preview,
      venue: null,
      startTime: null,
      acts: [],
    })

    expect(values.venue).toBe('Digitado')
    expect(values.startTime).toBe('20:00')
    expect(values.acts.map((act) => act.name)).toEqual(['Minha banda'])
  })

  it('não mexe nos gêneros nem no endereço', () => {
    const values = applyImportPreview({ ...showToValues(), genreIds: ['g1'], slug: 'meu-endereco' }, preview)

    expect(values.genreIds).toEqual(['g1'])
    expect(values.slug).toBe('meu-endereco')
  })
})
