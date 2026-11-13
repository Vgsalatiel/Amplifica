import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/button'
import { TextField } from '../../../components/ui/text-field'
import { TextLink } from '../../../components/ui/text-link'
import { formMessageFrom } from '../../../lib/form-errors'
import type { ShowImportPreview } from '../../../types/api'
import { FormAlert } from '../../auth/components/form-alert'
import { previewShowImport } from '../../shows/api/shows-api'

interface ImportFromLinkProps {
  onImport: (preview: ShowImportPreview) => void
}

/**
 * Preenche o formulário a partir da página de um show em um site de ingressos. A API lê só aquela
 * página (como uma pré-visualização de link) e devolve uma sugestão; nada é salvo até a pessoa
 * conferir e enviar o formulário.
 */
export function ImportFromLink({ onImport }: ImportFromLinkProps) {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState<ShowImportPreview | null>(null)

  const read = useMutation({
    mutationFn: (link: string) => previewShowImport(link),
    onSuccess: (preview) => {
      setResult(preview)
      onImport(preview)
    },
  })

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (url.trim()) {
      setResult(null)
      read.mutate(url.trim())
    }
  }

  return (
    <section aria-labelledby="import-title" className="border border-rule bg-surface-raised p-5">
      <h3 id="import-title" className="text-lg font-semibold">
        Importar de um link
      </h3>
      <p className="mt-1 text-sm text-muted">
        Cole o link da página do show em um site de ingressos. O formulário é preenchido com o que a página informa, e
        você confere tudo antes de salvar.
      </p>

      {/* Fora do formulário principal: Enter aqui busca os dados, não salva o show. */}
      <div role="group" aria-label="Importar de um link" className="mt-4 flex flex-wrap items-end gap-4">
        <TextField
          label="Link da página do evento"
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              handleSubmit(event)
            }
          }}
          placeholder="https://www.ticket360.com.br/evento/..."
          className="min-w-64 flex-1"
        />
        <Button
          type="button"
          variant="secondary"
          disabled={read.isPending || url.trim() === ''}
          onClick={(event) => handleSubmit(event)}
        >
          {read.isPending ? 'Lendo a página…' : 'Buscar dados'}
        </Button>
      </div>

      <div aria-live="polite" className="mt-4">
        <FormAlert message={formMessageFrom(read.error)} />
        {result && (
          <div role="status" className="flex flex-col gap-2">
            <p className="font-medium">
              {result.structured
                ? `Dados lidos de ${result.source}. Confira cada campo com a página antes de salvar.`
                : `A página de ${result.source} não informa os dados do evento. Só o título foi aproveitado.`}
            </p>
            {result.warnings.length > 0 && (
              <ul className="list-disc pl-5 text-sm">
                {result.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
            {result.existingShowSlug && (
              <p className="text-sm font-medium">
                Atenção: já existe um show igual cadastrado.{' '}
                <TextLink to={`/admin/shows/${result.existingShowSlug}`}>Abrir o show existente</TextLink>
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
