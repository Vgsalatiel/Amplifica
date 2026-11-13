import { z } from 'zod';
import { displayNameSchema } from '../users/users.schemas.js';

/** Nomes que não podem virar perfil porque colidem com rotas ou sugerem cargo oficial. */
const RESERVED_USERNAMES = new Set([
  'admin',
  'amplifica',
  'api',
  'cadastro',
  'conta',
  'entrar',
  'guia',
  'me',
  'suporte',
]);

const emailSchema = z
  .email('Digite um e-mail válido, como nome@exemplo.com.')
  .max(254, 'Esse e-mail é longo demais.')
  // E-mails são comparados sem diferenciar maiúsculas.
  .transform((value) => value.toLowerCase());

export const usernameSchema = z
  .string()
  .min(3, 'O nome de usuário precisa de pelo menos 3 caracteres.')
  .max(20, 'O nome de usuário pode ter até 20 caracteres.')
  .regex(
    /^[a-z0-9._]+$/,
    'Use apenas letras minúsculas, números, ponto e sublinhado.',
  )
  .refine((value) => !RESERVED_USERNAMES.has(value), {
    message: 'Esse nome de usuário não está disponível.',
  });

export const passwordSchema = z
  .string()
  .min(8, 'A senha precisa de pelo menos 8 caracteres.')
  .max(128, 'A senha pode ter até 128 caracteres.');

export const registerSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema,
  displayName: displayNameSchema.optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  // No login não repetimos as regras de senha: qualquer valor é apenas conferido.
  password: z.string().min(1, 'Digite sua senha.').max(128),
});

/** Token de e-mail: 32 bytes em base64url (43 caracteres). A faixa larga só evita rejeitar por detalhe de formato. */
const tokenSchema = z
  .string()
  .min(20, 'Esse link está incompleto.')
  .max(200, 'Esse link é inválido.');

export const verifyEmailSchema = z.object({ token: tokenSchema });
export const forgotPasswordSchema = z.object({ email: emailSchema });
export const resetPasswordSchema = z.object({
  token: tokenSchema,
  password: passwordSchema,
});

export type VerifyEmailDto = z.infer<typeof verifyEmailSchema>;
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
