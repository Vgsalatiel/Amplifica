import type { GroupPlatform } from '../../generated/prisma/client.js';

export interface GroupLink {
  platform: GroupPlatform;
  /** Endereço normalizado: https, sem parâmetros nem âncora. */
  url: string;
}

const CODE = '[A-Za-z0-9_+-]{2,64}';

/** Cada plataforma aceita só o formato de convite dela. Qualquer outro endereço é recusado. */
const RULES: Array<{
  platform: GroupPlatform;
  hosts: string[];
  path: RegExp;
}> = [
  {
    platform: 'WHATSAPP',
    hosts: ['chat.whatsapp.com'],
    path: new RegExp(`^/${CODE}$`),
  },
  {
    platform: 'TELEGRAM',
    hosts: ['t.me', 'telegram.me'],
    path: new RegExp(`^/(joinchat/)?${CODE}$`),
  },
  {
    platform: 'DISCORD',
    hosts: ['discord.gg', 'discord.com'],
    path: new RegExp(`^/(invite/)?${CODE}$`),
  },
];

/**
 * Confere o link de convite e devolve a plataforma e o endereço limpo; `null` se não for convite
 * de WhatsApp, Telegram ou Discord. Só https é aceito, e nunca com usuário, senha ou porta.
 */
export function parseGroupLink(text: string): GroupLink | null {
  let url: URL;
  try {
    url = new URL(text.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) {
    return null;
  }
  const host = url.hostname.toLowerCase();
  for (const rule of RULES) {
    if (!rule.hosts.includes(host)) {
      continue;
    }
    // discord.com só vale com /invite/; discord.gg aceita o código direto.
    if (host === 'discord.com' && !url.pathname.startsWith('/invite/')) {
      return null;
    }
    const path = url.pathname.replace(/\/$/, '');
    if (!rule.path.test(path)) {
      return null;
    }
    return { platform: rule.platform, url: `https://${host}${path}` };
  }
  return null;
}
