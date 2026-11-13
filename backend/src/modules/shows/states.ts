/** Siglas dos 26 estados e do Distrito Federal. */
export const BRAZILIAN_STATES = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const;

export type BrazilianState = (typeof BRAZILIAN_STATES)[number];

/** Nome → sigla, para ler "São Paulo" ou "Sao Paulo" em páginas que não usam a sigla. */
const STATE_NAMES: Record<string, BrazilianState> = {
  acre: 'AC',
  alagoas: 'AL',
  amapa: 'AP',
  amazonas: 'AM',
  bahia: 'BA',
  ceara: 'CE',
  'distrito federal': 'DF',
  'espirito santo': 'ES',
  goias: 'GO',
  maranhao: 'MA',
  'mato grosso': 'MT',
  'mato grosso do sul': 'MS',
  'minas gerais': 'MG',
  para: 'PA',
  paraiba: 'PB',
  parana: 'PR',
  pernambuco: 'PE',
  piaui: 'PI',
  'rio de janeiro': 'RJ',
  'rio grande do norte': 'RN',
  'rio grande do sul': 'RS',
  rondonia: 'RO',
  roraima: 'RR',
  'santa catarina': 'SC',
  'sao paulo': 'SP',
  sergipe: 'SE',
  tocantins: 'TO',
};

/** "SP", "sp", "São Paulo" ou "Sao Paulo" → "SP"; `null` se não for um estado brasileiro. */
export function toStateCode(text: string): BrazilianState | null {
  const upper = text.trim().toUpperCase();
  if ((BRAZILIAN_STATES as readonly string[]).includes(upper)) {
    return upper as BrazilianState;
  }
  const plain = text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  return STATE_NAMES[plain] ?? null;
}
