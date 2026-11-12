import { useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/button'
import { DeleteButton } from '../../../components/ui/delete-button'
import { TextArea } from '../../../components/ui/text-area'
import { fieldErrorsFrom, formMessageFrom } from '../../../lib/form-errors'
import type { Review } from '../../../types/api'
import { useDeleteMyReview, useSaveMyReview } from '../hooks/use-reviews'
import { RatingInput } from './rating-input'

const MAX_LENGTH = 3000

interface ReviewFormProps {
  slug: string
  /** A avaliação que a pessoa já fez, para editar; null se for a primeira. */
  existing: Review | null
}

/** Formulário de nota e resenha. A mesma tela cria, edita e apaga a avaliação da pessoa. */
export function ReviewForm({ slug, existing }: ReviewFormProps) {
  const [rating, setRating] = useState<number | null>(existing?.rating ?? null)
  const [body, setBody] = useState(existing?.body ?? '')
  const [ratingError, setRatingError] = useState<string>()
  const [saved, setSaved] = useState(false)
  const save = useSaveMyReview(slug)
  const remove = useDeleteMyReview(slug)

  const apiErrors = fieldErrorsFrom(save.error)
  const message = formMessageFrom(save.error) ?? formMessageFrom(remove.error)

  function submit(event: FormEvent) {
    event.preventDefault()
    setSaved(false)
    if (rating === null) {
      setRatingError('Escolha uma nota de 1 a 10.')
      return
    }
    setRatingError(undefined)
    save.mutate({ rating, body }, { onSuccess: () => setSaved(true) })
  }

  return (
    <form onSubmit={submit} noValidate className="mt-6 flex max-w-2xl flex-col gap-6">
      <RatingInput
        value={rating}
        onChange={(value) => {
          setRating(value)
          setRatingError(undefined)
          setSaved(false)
        }}
        error={ratingError ?? apiErrors.rating}
      />
      <TextArea
        label="Sua resenha (opcional)"
        hint={`${body.length.toLocaleString('pt-BR')} de ${MAX_LENGTH.toLocaleString('pt-BR')} caracteres. Só texto simples.`}
        error={apiErrors.body}
        rows={6}
        maxLength={MAX_LENGTH}
        value={body}
        onChange={(event) => {
          setBody(event.target.value)
          setSaved(false)
        }}
      />

      {message && (
        <p role="alert" className="text-sm font-medium text-danger">
          {message}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-6">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Salvando…' : existing ? 'Salvar alterações' : 'Publicar avaliação'}
        </Button>
        {existing && (
          <DeleteButton
            subject="sua avaliação"
            pending={remove.isPending}
            onConfirm={() => {
              setSaved(false)
              // Depois de apagar, o formulário volta ao estado de quem ainda não avaliou.
              remove.mutate(undefined, {
                onSuccess: () => {
                  setRating(null)
                  setBody('')
                },
              })
            }}
          />
        )}
        {saved && (
          <p role="status" className="font-medium">
            Avaliação salva.
          </p>
        )}
      </div>
    </form>
  )
}
