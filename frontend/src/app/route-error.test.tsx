import { fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { RouteError } from './route-error'

const report = vi.hoisted(() => vi.fn())
vi.mock('../lib/monitoring', () => ({ reportError: report }))

function open(loader: () => never) {
  const router = createMemoryRouter([{ path: '/', loader, element: <p>ok</p>, errorElement: <RouteError /> }])
  return render(<RouterProvider router={router} />)
}

describe('RouteError', () => {
  it('uma rota que quebra mostra a tela de erro com o botão de recarregar e avisa o monitoramento', async () => {
    const error = new Error('falhou de verdade')
    open(() => {
      throw error
    })

    expect(await screen.findByRole('heading', { name: 'Algo quebrou nesta página' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recarregar' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar para o início' })).toHaveAttribute('href', '/')
    expect(report).toHaveBeenCalledWith(error)
  })

  it('erro ao baixar um pedaço do site (versão nova no ar) pede para recarregar', async () => {
    open(() => {
      throw new TypeError('Failed to fetch dynamically imported module: https://x/assets/a.js')
    })

    expect(await screen.findByRole('heading', { name: 'O site foi atualizado' })).toBeInTheDocument()
    const reload = vi.fn()
    Object.defineProperty(window, 'location', { value: { ...window.location, reload }, writable: true })
    fireEvent.click(screen.getByRole('button', { name: 'Recarregar' }))
    expect(reload).toHaveBeenCalled()
  })
})
