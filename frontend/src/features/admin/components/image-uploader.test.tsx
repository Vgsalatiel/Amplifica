import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ImageUploader, MAX_IMAGE_BYTES } from './image-uploader'

function renderUploader(props: Partial<Parameters<typeof ImageUploader>[0]> = {}) {
  const onUpload = vi.fn()
  const onRemove = vi.fn()
  render(
    <ImageUploader
      label="Capa"
      description="JPEG, PNG ou WebP."
      image={null}
      onUpload={onUpload}
      onRemove={onRemove}
      {...props}
    />,
  )
  return { onUpload, onRemove }
}

describe('ImageUploader', () => {
  it('envia o arquivo escolhido', () => {
    const { onUpload } = renderUploader()
    const file = new File(['x'], 'capa.png', { type: 'image/png' })

    fireEvent.change(screen.getByLabelText('Enviar imagem'), { target: { files: [file] } })

    expect(onUpload).toHaveBeenCalledWith(file)
  })

  it('barra arquivos acima de 5 MB sem chamar a API', () => {
    const { onUpload } = renderUploader()
    const big = new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], 'grande.png', { type: 'image/png' })

    fireEvent.change(screen.getByLabelText('Enviar imagem'), { target: { files: [big] } })

    expect(onUpload).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('passa de 5 MB')
  })

  it('mostra a imagem atual e permite trocar ou remover', () => {
    const { onRemove } = renderUploader({ image: { large: '/g.webp', small: '/p.webp' } })

    expect(screen.getByRole('img', { name: 'Capa atual' })).toHaveAttribute('src', '/p.webp')
    expect(screen.getByLabelText('Trocar imagem')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Remover' }))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('mostra o erro devolvido pela API', () => {
    renderUploader({ error: 'Envie uma imagem JPEG, PNG ou WebP.' })

    expect(screen.getByRole('alert')).toHaveTextContent('Envie uma imagem JPEG, PNG ou WebP.')
  })
})
