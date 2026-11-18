import { z } from 'zod';

/** Marcar presença. `showName` liga o nome da pessoa na lista pública; desligado por padrão. */
export const setAttendanceSchema = z.object({
  showName: z.boolean('Informe se quer mostrar o seu nome.').default(false),
});

export type SetAttendanceDto = z.infer<typeof setAttendanceSchema>;
