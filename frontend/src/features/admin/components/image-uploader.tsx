import { useId, useRef, useState } from 'react'
import { Button } from '../../../components/ui/button'
import { cn } from '../../../lib/cn'
import type { ImageSet } from '../../../types/api'

/** O mesmo limite da API: arquivos maiores são recusados lá, mas avisar antes poupa o envio. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

interface ImageUploaderProps {
  label: string
  description: string
  image: ImageSet | null
  onUpload: (file: File) => void
  onRemove: () => void
  pending?: boolean
  /** Erro devolvido pela API no envio anterior. */
  error?: string | null
  className?: string
}

/** Envio e remoção de uma imagem, com a prévia da que está salva. */
export function ImageUploader({
  label,
  description,
  image,
  onUpload,
  onRemove,
  pending = false,
  error,
  className,
}: ImageUploaderProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const message = localError ?? error

  function handleChange(file: File | undefined) {
    // Limpa o campo para que escolher o mesmo arquivo de novo dispare o envio outra vez.
    if (inputRef.current) {
      inputRef.current.value = ''
    }
    if (!file) {
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setLocalError('A imagem passa de 5 MB. Escolha um arquivo menor.')
      return
    }
    setLocalError(null)
    onUpload(file)
  }

  return (
    <section aria-labelledby={`${inputId}-title`} className={cn('flex flex-col gap-4', className)}>
      <h2 id={`${inputId}-title`} className="text-sm font-semibold">
        {label}
      </h2>

      {image ? (
        <img src={image.small} alt={`${label} atual`} className="size-48 border border-rule object-cover" />
      ) : (
        <div className="flex size-48 items-center justify-center border border-dashed border-rule-strong p-4 text-center text-sm text-muted">
          Nenhuma imagem enviada
        </div>
      )}

      <p className="max-w-xs text-sm text-muted">{description}</p>

      <div className="flex flex-wrap items-center gap-4">
        <label
          htmlFor={inputId}
          className={cn(
            'inline-flex h-11 cursor-pointer items-center rounded-xs border border-rule-strong px-5 text-sm font-semibold hover:border-ink',
            pending && 'pointer-events-none opacity-50',
          )}
        >
          {pending ? 'Enviando…' : image ? 'Trocar imagem' : 'Enviar imagem'}
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={pending}
          className="sr-only"
          onChange={(event) => handleChange(event.target.files?.[0])}
        />
        {image && (
          <Button variant="secondary" className="h-11 px-5 text-sm" disabled={pending} onClick={onRemove}>
            Remover
          </Button>
        )}
      </div>

      {message && (
        <p role="alert" className="max-w-xs text-sm font-medium text-danger">
          {message}
        </p>
      )}
    </section>
  )
}
