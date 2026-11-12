/**
 * Cliente mínimo da API do MusicBrainz. Respeita o limite documentado de uma requisição por
 * segundo e tenta de novo, com espera crescente, quando o servidor responde 503.
 */
const API = 'https://musicbrainz.org/ws/2';
const MIN_INTERVAL_MS = 1100;
const MAX_ATTEMPTS = 4;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export class MusicBrainzClient {
  private lastRequest = 0;

  /** O MusicBrainz exige um User-Agent que identifique a aplicação. */
  constructor(private readonly userAgent: string) {}

  async get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = `${API}${path}?${new URLSearchParams({ ...params, fmt: 'json' })}`;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const wait = this.lastRequest + MIN_INTERVAL_MS - Date.now();
      if (wait > 0) {
        await sleep(wait);
      }
      this.lastRequest = Date.now();

      const response = await fetch(url, {
        headers: { 'User-Agent': this.userAgent, Accept: 'application/json' },
      });
      if (response.ok) {
        return (await response.json()) as T;
      }
      if (response.status === 503 && attempt < MAX_ATTEMPTS) {
        await sleep(attempt * 3000);
        continue;
      }
      throw new Error(`MusicBrainz respondeu ${response.status} para ${path}`);
    }
    throw new Error(`MusicBrainz não respondeu para ${path}`);
  }
}
