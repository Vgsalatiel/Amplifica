import { z } from 'zod';

/** Parâmetro de rota que precisa ser um UUID: `@Param('id', { schema: idParamSchema })`. */
export const idParamSchema = z.uuid('Identificador inválido.');
