import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../test/helpers'
import type { PlaylistItem } from '../lib/playlist'
import { ClipPlaylist } from './clip-playlist'

const items: PlaylistItem[] = [
  {
    id: 'a',
    videoId: 'dQw4w9WgXcQ',
    title: 'Uma Vida',
    subtitle: 'Bullet Bane',
    artist: { slug: 'bullet-bane', name: 'Bullet Bane' },
    suggestedBy: null,
  },
  {
    id: 'b',
    videoId: '3psvNDHQv7Y',
    title: 'Clipe de uma banda nova',
    subtitle: 'Canal da Banda',
    artist: null,
    suggestedBy: { username: 'ana', displayName: 'Ana' },
  },
]

describe('ClipPlaylist', () => {
  it('lista os clipes, destaca o que está tocando e diz quem sugeriu os de fora', () => {
    renderWithProviders(<ClipPlaylist items={items} current={0} onSelect={() => {}} />)

    const list = screen.getByRole('list', { name: 'Playlist' })
    const [first, second] = within(list).getAllByRole('button')
    expect(first).toHaveAttribute('aria-current', 'true')
    expect(first).toHaveTextContent('(tocando agora)')
    expect(second).not.toHaveAttribute('aria-current')
    expect(second).toHaveTextContent('Canal da Banda · sugerido por @ana')
    expect(first).not.toHaveTextContent('sugerido por')
  })

  it('clicar em um clipe avisa qual foi escolhido', () => {
    const onSelect = vi.fn()
    renderWithProviders(<ClipPlaylist items={items} current={0} onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('button', { name: /Clipe de uma banda nova/ }))

    expect(onSelect).toHaveBeenCalledWith(1)
  })

  it('a banda do catálogo leva à página dela; clipe sem banda não tem o link', () => {
    renderWithProviders(<ClipPlaylist items={items} current={0} onSelect={() => {}} />)

    expect(screen.getByRole('link', { name: 'Página de Bullet Bane' })).toHaveAttribute('href', '/artistas/bullet-bane')
    expect(screen.getAllByRole('link', { name: /^Página de / })).toHaveLength(1)
  })

  it('a sugestão aprovada leva ao perfil de quem a sugeriu; os fixos não têm esse link', () => {
    renderWithProviders(<ClipPlaylist items={items} current={0} onSelect={() => {}} />)

    expect(screen.getByRole('link', { name: /Perfil de @ana/ })).toHaveAttribute('href', '/u/ana')
    expect(screen.getAllByRole('link', { name: /^Perfil de / })).toHaveLength(1)
  })
  it('marca o clipe que toca depois do atual com "A seguir"', () => {
    renderWithProviders(<ClipPlaylist items={items} current={0} onSelect={() => {}} />)

    const rows = screen.getAllByRole('listitem')
    expect(rows[1]).toHaveTextContent('A SEGUIR')
    expect(rows[0]).not.toHaveTextContent('A SEGUIR')
  })
})
