import {
  BadGatewayException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { apiError } from './api-error.js';
import { ApiExceptionFilter, toErrorBody } from './api-exception.filter.js';
import * as monitoring from './monitoring.js';

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

describe('ApiExceptionFilter e o aviso de erros', () => {
  const host = () => {
    const json = vi.fn();
    const response = { status: vi.fn().mockReturnValue({ json }) };
    return {
      host: { switchToHttp: () => ({ getResponse: () => response }) } as never,
      response,
      json,
    };
  };

  it('avisa o monitoramento só nos erros 500 inesperados', () => {
    const report = vi.spyOn(monitoring, 'reportException').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const filter = new ApiExceptionFilter();
    const boom = new Error('banco caiu');

    filter.catch(boom, host().host);
    expect(report).toHaveBeenCalledWith(boom);

    report.mockClear();
    filter.catch(new NotFoundException(), host().host);
    filter.catch(new BadGatewayException(apiError('x', 'y')), host().host);
    expect(report).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
