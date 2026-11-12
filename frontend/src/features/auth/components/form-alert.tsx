interface FormAlertProps {
  message: string | null
}

/** Mensagem geral de erro de um formulário, anunciada por leitores de tela. */
export function FormAlert({ message }: FormAlertProps) {
  if (!message) {
    return null
  }
  return (
    <p role="alert" className="border-l-4 border-danger bg-surface-raised px-4 py-3 font-medium text-danger">
      {message}
    </p>
  )
}
