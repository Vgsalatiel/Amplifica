/**
 * Leitura mínima do robots.txt: o que o site pede para os visitantes automáticos não acessarem.
 * Vale o grupo que cita o nosso agente ou, na falta, o grupo `*`. Entre as regras que casam,
 * vence a mais específica (a de caminho mais longo); empatando, vence a que permite.
 */
export interface RobotsRule {
  allow: boolean;
  pattern: string;
}

export function parseRobots(text: string, agentToken: string): RobotsRule[] {
  const token = agentToken.toLowerCase();
  const groups: Array<{ agents: string[]; rules: RobotsRule[] }> = [];
  let current: { agents: string[]; rules: RobotsRule[] } | null = null;
  let collectingAgents = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, '').trim();
    const separator = line.indexOf(':');
    if (separator === -1) {
      continue;
    }
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (field === 'user-agent') {
      if (!collectingAgents || !current) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      collectingAgents = true;
    } else if (field === 'allow' || field === 'disallow') {
      collectingAgents = false;
      // "Disallow:" vazio não proíbe nada.
      if (current && value !== '') {
        current.rules.push({ allow: field === 'allow', pattern: value });
      }
    } else {
      collectingAgents = false;
    }
  }

  const specific = groups.filter((group) =>
    group.agents.some((agent) => agent !== '*' && token.includes(agent)),
  );
  const chosen =
    specific.length > 0
      ? specific
      : groups.filter((group) => group.agents.includes('*'));
  return chosen.flatMap((group) => group.rules);
}

function matches(pattern: string, path: string): number {
  // `*` casa qualquer trecho e `$` marca o fim do endereço.
  const anchored = pattern.endsWith('$');
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const source = body
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${source}${anchored ? '$' : ''}`).test(path)
    ? body.length
    : -1;
}

/** `true` se o robots.txt não proíbe este caminho (com a consulta, se houver). */
export function isAllowedByRobots(rules: RobotsRule[], path: string): boolean {
  let best: { allow: boolean; length: number } | null = null;
  for (const rule of rules) {
    const length = matches(rule.pattern, path);
    if (length < 0) {
      continue;
    }
    if (
      !best ||
      length > best.length ||
      (length === best.length && rule.allow)
    ) {
      best = { allow: rule.allow, length };
    }
  }
  return best ? best.allow : true;
}
