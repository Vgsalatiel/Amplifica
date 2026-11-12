import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TrackList } from './track-list'

const track = (id: string, title: string, position: number, discNumber = 1, durationMs: number | null = 200_000) => ({
  id,
  title,
  position,
  discNumber,
  durationMs,
})

describe('TrackList', () => {
  it('mostra número, título e duração de cada faixa', () => {
    render(<TrackList tracks={[track('a', 'Geada', 1, 1, 168_000), track('b', 'Vidro', 2, 1, 207_000)]} />)

    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('Geada')).toBeInTheDocument()
    expect(screen.getByText('2:48')).toBeInTheDocument()
    expect(screen.getByText('3:27')).toBeInTheDocument()
    expect(screen.queryByText(/Disco/)).not.toBeInTheDocument()
  })

  it('separa os discos quando há mais de um', () => {
    render(<TrackList tracks={[track('a', 'A', 1, 1), track('b', 'B', 1, 2)]} />)

    expect(screen.getByRole('heading', { name: 'Disco 1' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Disco 2' })).toBeInTheDocument()
  })

  it('não inventa duração para faixa sem duração conhecida', () => {
    render(<TrackList tracks={[track('a', 'Sem tempo', 1, 1, null)]} />)

    expect(screen.getByText('Sem tempo').closest('li')).not.toHaveTextContent(/\d:\d\d/)
  })
})
