import { useState } from 'react'
import { Button } from './button'

interface DeleteButtonProps {
  /** O que será excluído, para a pergunta de confirmação: "o artista Vidro Fosco". */
  subject: string
  onConfirm: () => void
  pending?: boolean
}

/**
 * Exclusão em dois passos, na própria tela. Evita o diálogo nativo do navegador e deixa
 * claro o que vai acontecer antes de um clique irreversível.
 */
export function DeleteButton({ subject, onConfirm, pending = false }: DeleteButtonProps) {
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="min-h-11 cursor-pointer text-sm font-semibold text-danger underline underline-offset-4"
      >
        Excluir
      </button>
    )
  }

  return (
    <div role="group" aria-label={`Confirmar exclusão de ${subject}`} className="flex flex-wrap items-center gap-3">
      <p className="text-sm font-medium">Excluir {subject}? Não dá para desfazer.</p>
      <Button
        variant="secondary"
        disabled={pending}
        onClick={onConfirm}
        className="h-11 border-danger text-danger hover:border-danger"
      >
        {pending ? 'Excluindo…' : 'Sim, excluir'}
      </Button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="min-h-11 cursor-pointer text-sm font-semibold underline underline-offset-4"
      >
        Cancelar
      </button>
    </div>
  )
}
