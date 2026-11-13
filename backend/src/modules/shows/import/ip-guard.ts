import { BlockList, isIP } from 'node:net';

/**
 * Endereços que a importação nunca acessa: a máquina local, redes privadas, link-local
 * (inclui o endereço de metadados de nuvem, 169.254.169.254) e faixas reservadas.
 * Sem isto, quem pudesse chamar a rota faria o servidor ler serviços internos (SSRF).
 */
const blocked = new BlockList();
for (const [network, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const) {
  blocked.addSubnet(network, prefix, 'ipv4');
}
for (const [network, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['64:ff9b::', 96],
  ['100::', 64],
  ['2001:db8::', 32],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
] as const) {
  blocked.addSubnet(network, prefix, 'ipv6');
}

/** IPv6 que carrega um IPv4 (::ffff:127.0.0.1 ou ::ffff:7f00:1): vale a regra do IPv4. */
function embeddedIpv4(address: string): string | null {
  const dotted = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(address);
  if (dotted) {
    return dotted[1] as string;
  }
  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(address);
  if (hex) {
    const high = parseInt(hex[1] as string, 16);
    const low = parseInt(hex[2] as string, 16);
    return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
  }
  return null;
}

/** `true` só para endereço IP público. Texto que não é IP vale como não público. */
export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 0) {
    return false;
  }
  if (family === 6) {
    const embedded = embeddedIpv4(address);
    if (embedded) {
      return !blocked.check(embedded, 'ipv4');
    }
  }
  return !blocked.check(address, family === 4 ? 'ipv4' : 'ipv6');
}
