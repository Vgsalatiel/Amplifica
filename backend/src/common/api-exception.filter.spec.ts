import {
  BadGatewayException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { apiError } from './api-error.js';
import { toErrorBody } from './api-exception.filter.js';

describe('toErrorBody', () => {
  it('mantém código, mensagem e detalhes das nossas exceções', () => {
    const details = [{ field: 'email', message: 'Já existe.' }];
    const body = toErrorBody(
      new ConflictException(apiError('account_taken', 'Em uso.', details)),
    );

    expect(body).toEqual({
      statusCode: 409,
      code: 'account_taken',
      message: 'Em uso.',
      details,
    });
  });

  it('troca as mensagens em inglês do Nest por um padrão em português', () => {
    const body = toErrorBody(new NotFoundException());

    expect(body.code).toBe('not_found');
    expect(body.message).not.toMatch(/not found/i);
  });

  it('lê o status de erros do pacote de autenticação', () => {
    const error = Object.assign(new Error('Unauthorized'), { status: 401 });

    expect(toErrorBody(error)).toMatchObject({
      statusCode: 401,
      code: 'unauthorized',
    });
  });

  it('mantém a explicação de um 502 lançado de propósito, mas não de outros 5xx', () => {
    const body = toErrorBody(
      new BadGatewayException(
        apiError('import_fetch_failed', 'O site respondeu 500.'),
      ),
    );
    expect(body).toEqual({
      statusCode: 502,
      code: 'import_fetch_failed',
      message: 'O site respondeu 500.',
    });

    const other = Object.assign(new Error('x'), { status: 504 });
    expect(toErrorBody(other).statusCode).toBe(500);
  });

  it('esconde os detalhes de erros inesperados', () => {
    const body = toErrorBody(new Error('senha do banco: hunter2'));

    expect(body.statusCode).toBe(500);
    expect(JSON.stringify(body)).not.toContain('hunter2');
  });
});
