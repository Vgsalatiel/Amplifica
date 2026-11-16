import { describe, expect, it } from 'vitest'
import { show } from '../../../test/fixtures'
import { groupByMonth } from './group-by-month'

const march = show({ id: 's1', date: '2027-03-15' })
const marchLater = show({ id: 's2', date: '2027-03-20' })
const april = show({ id: 's3', date: '2027-04-02' })

describe('groupByMonth', () => {
  it('agrupa por mês e mantém a ordem', () => {
    const groups = groupByMonth([march, marchLater, april])

    expect(groups.map((group) => [group.heading, group.shows.length])).toEqual([
      ['março de 2027', 2],
      ['abril de 2027', 1],
    ])
  })

  it('devolve lista vazia sem shows', () => {
    expect(groupByMonth([])).toEqual([])
  })
})
