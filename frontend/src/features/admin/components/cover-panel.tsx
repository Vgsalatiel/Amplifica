import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '../../../components/ui/button'
import { RatingMeter } from '../../../components/ui/rating-meter'
import { contrastWithWhite, isHexColor, MIN_CONTRAST } from '../../../lib/color'
import { ApiError } from '../../../lib/http'
import type { ReleaseDetail } from '../../../types/api'
import { removeReleaseCover, updateRelease, uploadReleaseCover } from '../../catalog/api/catalog-api'
import { useInvalidateCatalog } from '../../catalog/hooks/use-catalog'
import { ImageUploader } from './image-uploader'

/** Violeta padrão do site: a cor usada quando o lançamento não tem cor própria. */
const DEFAULT_ACCENT = '#5630D0'

/**
 * Capa e cor de destaque do lançamento. Ao enviar a capa, a API escolhe a cor; aqui o admin
 * vê o resultado aplicado em um exemplo e pode trocar por outra. Fica separado do formulário
 * principal para que salvar o texto do lançamento nunca sobrescreva a cor recém-extraída.
 */
export function CoverPanel({ release }: { release: ReleaseDetail }) {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateCatalog()
  const [draftColor, setDraftColor] = useState<string | null>(null)

  const color = draftColor ?? release.accentColor ?? DEFAULT_ACCENT
  const contrast = isHexColor(color) ? contrastWithWhite(color) : 0

  const store = (updated: ReleaseDetail) => {
    queryClient.setQueryData(['release', updated.slug], updated)
    setDraftColor(null)
    void invalidate()
  }

  const upload = useMutation({ mutationFn: (file: File) => uploadReleaseCover(release.id, file), onSuccess: store })
  const remove = useMutation({ mutationFn: () => removeReleaseCover(release.id), onSuccess: store })
  const saveColor = useMutation({
    mutationFn: (accentColor: string | null) => updateRelease(release.id, { accentColor }),
    onSuccess: store,
  })

  const messageOf = (error: unknown) =>
    error ? (error instanceof ApiError ? error.message : 'Não foi possível falar com o servidor.') : null

  return (
    <div className="flex flex-col gap-8">
      <ImageUploader
        label="Capa"
        description="JPEG, PNG ou WebP, até 5 MB. Ao enviar, a cor de destaque da página é escolhida a partir da capa."
        image={release.cover}
        onUpload={(file) => upload.mutate(file)}
        onRemove={() => remove.mutate()}
        pending={upload.isPending || remove.isPending}
        error={messageOf(upload.error ?? remove.error)}
      />

      <section aria-labelledby="accent-title" className="flex flex-col gap-4">
        <h2 id="accent-title" className="text-sm font-semibold">
          Cor da página do álbum
        </h2>

        <div className="flex items-center gap-3">
          <input
            type="color"
            aria-label="Escolher cor"
            value={isHexColor(color) ? color.toLowerCase() : DEFAULT_ACCENT.toLowerCase()}
            onChange={(event) => setDraftColor(event.target.value.toUpperCase())}
            className="size-11 cursor-pointer border border-rule-strong bg-transparent p-0.5"
          />
          <input
            aria-label="Código da cor"
            value={color}
            onChange={(event) => setDraftColor(event.target.value.toUpperCase())}
            maxLength={7}
            className="h-11 w-28 rounded-xs border border-rule-strong bg-transparent px-2 font-mono text-sm uppercase hover:border-ink"
          />
        </div>

        <p className={contrast >= MIN_CONTRAST ? 'text-sm text-muted' : 'text-sm font-medium text-danger'}>
          {!isHexColor(color)
            ? 'Use o formato #RRGGBB.'
            : contrast >= MIN_CONTRAST
              ? `Contraste de ${contrast.toFixed(1).replace('.', ',')}:1 sobre branco: legível.`
              : `Contraste de ${contrast.toFixed(1).replace('.', ',')}:1: claro demais para texto. O mínimo é 4,5:1.`}
        </p>

        {/* Prévia: a cor aplicada nos elementos que mudam de cor na página do álbum. */}
        <div className="flex flex-wrap items-center gap-5 border border-rule p-4" aria-hidden="true">
          <span className="rounded-xs px-5 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: color }}>
            Dar minha nota
          </span>
          <span className="font-display text-5xl leading-none font-light" style={{ color }}>
            8,4
          </span>
          <div style={{ color }}>
            <RatingMeter value={8} className="[&_[data-lit=true]]:bg-current" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Button
            className="h-11 px-5 text-sm"
            disabled={saveColor.isPending || draftColor === null || !isHexColor(color)}
            onClick={() => saveColor.mutate(color)}
          >
            {saveColor.isPending ? 'Salvando…' : 'Salvar cor'}
          </Button>
          <Button
            variant="secondary"
            className="h-11 px-5 text-sm"
            disabled={saveColor.isPending || (release.accentColor === null && draftColor === null)}
            onClick={() => saveColor.mutate(null)}
          >
            Usar a cor padrão
          </Button>
        </div>

        {saveColor.error && (
          <p role="alert" className="text-sm font-medium text-danger">
            {messageOf(saveColor.error)}
          </p>
        )}
        {!release.accentColor && !draftColor && (
          <p className="text-sm text-muted">Sem cor própria: a página usa o violeta padrão do site.</p>
        )}
      </section>
    </div>
  )
}
