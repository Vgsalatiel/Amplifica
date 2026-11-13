import { useMutation } from '@tanstack/react-query'
import { Button } from '../../../components/ui/button'
import { formMessageFrom } from '../../../lib/form-errors'
import { resendVerification } from '../api/auth-api'

/** Botão "Reenviar e-mail" com a confirmação do envio ou o motivo da falha. */
export function ResendVerification() {
  const resend = useMutation({ mutationFn: resendVerification })

  return (
    <span className="inline-flex flex-wrap items-center gap-x-4 gap-y-1">
      <Button variant="secondary" disabled={resend.isPending} onClick={() => resend.mutate()} className="h-11">
        {resend.isPending ? 'Enviando…' : 'Reenviar e-mail'}
      </Button>
      {resend.isSuccess && (
        <span role="status" className="font-medium">
          E-mail enviado. Olhe também a caixa de spam.
        </span>
      )}
      {resend.isError && (
        <span role="alert" className="font-medium text-danger">
          {formMessageFrom(resend.error)}
        </span>
      )}
    </span>
  )
}
