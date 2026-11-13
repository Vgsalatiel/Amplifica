import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service.js';
import { resetPasswordMessage, verifyEmailMessage } from './mail.templates.js';

function service(env: Record<string, string | undefined>): MailService {
  return new MailService({
    get: (key: string) => env[key],
  } as unknown as ConfigService<never, true>);
}

describe('MailService', () => {
  it('escolhe o transporte pelo ambiente e pela configuração', () => {
    const resend = { RESEND_API_KEY: 'k', MAIL_FROM: 'a@b.com' };
    expect(service({ NODE_ENV: 'production', ...resend }).transport).toBe('resend');
    expect(service({ NODE_ENV: 'development' }).transport).toBe('console');
    expect(service({ NODE_ENV: 'test' }).transport).toBe('outbox');
    expect(service({ NODE_ENV: 'production' }).transport).toBe('none');
  });

  it('só diz que consegue entregar quando há transporte', () => {
    expect(service({ NODE_ENV: 'production' }).canDeliver).toBe(false);
    expect(service({ NODE_ENV: 'development' }).canDeliver).toBe(true);
  });

  it('em produção sem configuração, enviar falha em vez de fingir que enviou', async () => {
    await expect(
      service({ NODE_ENV: 'production' }).send(verifyEmailMessage('a@b.com', 'Ana', 'https://x/y')),
    ).rejects.toThrow(/não está configurado/);
  });

  it('no transporte de testes, guarda as mensagens na lista', async () => {
    const mail = service({ NODE_ENV: 'test' });
    await mail.send(verifyEmailMessage('a@b.com', 'Ana', 'https://x/y'));
    expect(mail.outbox).toHaveLength(1);
    expect(mail.outbox[0].to).toBe('a@b.com');
  });

  it('no Resend, envia pela API com a chave e sem vazá-la na mensagem de erro', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response('{"message":"domain not verified"}', { status: 403 })));
    vi.stubGlobal('fetch', fetchMock);
    try {
      const mail = service({ NODE_ENV: 'production', RESEND_API_KEY: 're_segredo', MAIL_FROM: 'Amplifica <a@b.com>' });
      const error = await mail.send(resetPasswordMessage('ana@x.com', 'Ana', 'https://x/y')).catch((e: Error) => e);

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer re_segredo' }) }),
      );
      expect((error as Error).message).toMatch(/403/);
      expect((error as Error).message).not.toContain('re_segredo');
      expect((error as Error).message).not.toContain('ana@x.com');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('templates de e-mail', () => {
  it('trazem o link no texto e no HTML, e escapam o nome', () => {
    const link = 'https://site/confirmar-email?token=abc_-123';
    const message = verifyEmailMessage('a@b.com', '<script>x</script>', link);

    expect(message.text).toContain(link);
    expect(message.html).toContain(`href="${link}"`);
    expect(message.html).not.toContain('<script>');
    expect(message.html).toContain('&lt;script&gt;');
  });

  it('o e-mail de senha avisa que vale 1 hora e que a senha atual continua valendo se não foi a pessoa', () => {
    const message = resetPasswordMessage('a@b.com', 'Ana', 'https://x/y');
    expect(message.text).toMatch(/1 hora/);
    expect(message.text).toMatch(/senha atual continua valendo/);
  });
});
