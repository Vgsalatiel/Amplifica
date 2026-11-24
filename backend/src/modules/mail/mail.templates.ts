import type { MailMessage } from './mail.service.js';

/** Escapa texto para uso em HTML. Os links vêm de nós, mas o nome vem do usuário. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function layout(heading: string, paragraphs: string[], link: string, button: string): string {
  const body = paragraphs.map((p) => `<p style="margin:0 0 16px">${p}</p>`).join('');
  return `<div style="font-family:Georgia,serif;font-size:17px;line-height:1.5;color:#1B1B1D;max-width:520px">
<h1 style="font-size:24px;font-weight:normal;margin:0 0 20px">${heading}</h1>${body}
<p style="margin:24px 0"><a href="${escapeHtml(link)}" style="background:#5630D0;color:#fff;padding:12px 22px;text-decoration:none;font-family:Arial,sans-serif;font-size:15px">${button}</a></p>
<p style="margin:0 0 16px;font-size:14px;color:#555">Se o botão não funcionar, copie este endereço no navegador:<br>${escapeHtml(link)}</p>
</div>`;
}

export function verifyEmailMessage(
  to: string,
  displayName: string,
  link: string,
): MailMessage {
  const name = displayName.trim();
  return {
    to,
    subject: 'Confirme seu e-mail no Amplifica',
    text: `Olá, ${name}!\n\nConfirme seu e-mail para poder avaliar discos no Amplifica:\n${link}\n\nO link vale por 24 horas. Se você não criou uma conta, ignore esta mensagem.`,
    html: layout(
      `Olá, ${escapeHtml(name)}!`,
      [
        'Confirme seu e-mail para poder avaliar discos no Amplifica.',
        'O link vale por 24 horas. Se você não criou uma conta, ignore esta mensagem.',
      ],
      link,
      'Confirmar e-mail',
    ),
  };
}

export function resetPasswordMessage(
  to: string,
  displayName: string,
  code: string,
  /** Página de redefinição no site (sem código nem dado pessoal na URL). */
  link: string,
): MailMessage {
  const name = displayName.trim();
  return {
    to,
    subject: 'Redefina sua senha do Amplifica',
    text: `Olá, ${name}!\n\nO código para redefinir a senha da sua conta no Amplifica é:\n\n${code}\n\nDigite esse código na página de redefinição:\n${link}\n\nO código vale por 30 minutos. Se não foi você, ignore esta mensagem: a senha atual continua valendo.`,
    html: `<div style="font-family:Georgia,serif;font-size:17px;line-height:1.5;color:#1B1B1D;max-width:520px">
<h1 style="font-size:24px;font-weight:normal;margin:0 0 20px">Olá, ${escapeHtml(name)}!</h1>
<p style="margin:0 0 16px">O código para redefinir a senha da sua conta no Amplifica é:</p>
<p style="margin:24px 0;font-family:'Courier New',monospace;font-size:34px;letter-spacing:8px;font-weight:bold">${escapeHtml(code)}</p>
<p style="margin:0 0 16px">Digite esse código na página de redefinição. Ele vale por 30 minutos.</p>
<p style="margin:24px 0"><a href="${escapeHtml(link)}" style="background:#5630D0;color:#fff;padding:12px 22px;text-decoration:none;font-family:Arial,sans-serif;font-size:15px">Ir para a redefinição de senha</a></p>
<p style="margin:0 0 16px;font-size:14px;color:#555">Se o botão não funcionar, copie este endereço no navegador:<br>${escapeHtml(link)}</p>
<p style="margin:0 0 16px;font-size:14px;color:#555">Se não foi você, ignore esta mensagem: a senha atual continua valendo.</p>
</div>`,
  };
}
