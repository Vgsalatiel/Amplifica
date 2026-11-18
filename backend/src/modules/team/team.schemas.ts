import { z } from 'zod';

/** Aceita "@ana" ou "ana", em qualquer caixa: o nome de usuário é guardado em minúsculas. */
export const usernameParamSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/^@/, '').toLowerCase())
  .pipe(z.string().min(1).max(40));

/** Só dá para promover a moderador ou voltar a ser usuário comum: administrador não se cria por aqui. */
export const setRoleSchema = z.object({
  role: z.enum(['MODERATOR', 'USER'], 'Escolha moderador ou usuário comum.'),
});

export type SetRoleDto = z.infer<typeof setRoleSchema>;
