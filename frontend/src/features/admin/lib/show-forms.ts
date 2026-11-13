import type { FieldErrors } from '../../../lib/form-errors'
import { todayInBrazil } from '../../../lib/format-date'
import type { Show, ShowImportPreview, ShowStatus } from '../../../types/api'
import type { ShowInput } from '../../shows/api/shows-api'
import type { Built } from './forms'

export interface ActValues {
  /** Identifica a linha na tela enquanto a pessoa edita; não vai para a API. */
  key: string
  name: string
  /** Preenchido quando a banda foi escolhida no catálogo. */
  artistId: string | null
}

export interface ShowFormValues {
  name: string
  slug: string
  date: string
  startTime: string
  venue: string
  city: string
  state: string
  ticketUrl: string
  status: ShowStatus
  verifiedAt: string
  acts: ActValues[]
  genreIds: string[]
}

let actCounter = 0
export function newActKey(): string {
  actCounter += 1
  return `act-${actCounter}`
}

export function newAct(name: string, artistId: string | null = null): ActValues {
  return { key: newActKey(), name, artistId }
}

export function showToValues(show?: Show): ShowFormValues {
  return {
    name: show?.name ?? '',
    slug: show?.slug ?? '',
    date: show?.date ?? '',
    startTime: show?.startTime ?? '',
    venue: show?.venue ?? '',
    city: show?.city ?? '',
    state: show?.state ?? '',
    ticketUrl: show?.ticketUrl ?? '',
    status: show?.status ?? 'CONFIRMED',
    // Show novo: a pessoa está olhando a fonte agora, então a conferência é de hoje.
    verifiedAt: show ? show.verifiedAt.slice(0, 10) : todayInBrazil(),
    acts: show?.acts.map((act) => newAct(act.name, act.artist?.id ?? null)) ?? [],
    genreIds: show?.genres.map((genre) => genre.id) ?? [],
  }
}

/**
 * Converte o que está nos campos no que a API espera. Só aponta o que a API não conseguiria
 * ligar a um campo (banda sem nome, escalação vazia); as demais regras ficam com a API.
 */
export function buildShowPayload(values: ShowFormValues): Built<ShowInput> {
  const errors: FieldErrors = {}

  if (values.acts.length === 0) {
    errors.acts = 'Informe ao menos uma banda.'
  }
  values.acts.forEach((act, index) => {
    if (act.name.trim() === '') {
      errors[`acts.${index}.name`] = 'Digite o nome da banda.'
    }
  })
  if (Object.keys(errors).length > 0) {
    return { errors }
  }

  const slug = values.slug.trim()
  return {
    payload: {
      name: values.name.trim(),
      ...(slug && { slug }),
      date: values.date,
      startTime: values.startTime,
      venue: values.venue.trim(),
      city: values.city.trim(),
      state: values.state,
      ticketUrl: values.ticketUrl.trim(),
      status: values.status,
      verifiedAt: values.verifiedAt,
      acts: values.acts.map((act) => ({
        name: act.name.trim(),
        artistId: act.artistId,
      })),
      genreIds: values.genreIds,
    },
  }
}

/** Move uma banda uma posição para cima (`-1`) ou para baixo (`1`) na escalação. */
export function moveAct(acts: ActValues[], index: number, direction: -1 | 1): ActValues[] {
  const target = index + direction
  if (target < 0 || target >= acts.length) {
    return acts
  }
  const next = [...acts]
  const [moved] = next.splice(index, 1)
  next.splice(target, 0, moved!)
  return next
}

/**
 * Aplica a sugestão lida de uma página ao formulário. O que a página não informou (`null`) fica
 * como a pessoa já tinha digitado; o que informou substitui. Gêneros e endereço nunca mudam.
 * A conferência passa a ser de hoje: a pessoa está olhando a página agora.
 */
export function applyImportPreview(values: ShowFormValues, preview: ShowImportPreview): ShowFormValues {
  return {
    ...values,
    name: preview.name ?? values.name,
    date: preview.date ?? values.date,
    startTime: preview.startTime ?? values.startTime,
    venue: preview.venue ?? values.venue,
    city: preview.city ?? values.city,
    state: preview.state ?? values.state,
    ticketUrl: preview.ticketUrl ?? values.ticketUrl,
    status: preview.status,
    verifiedAt: todayInBrazil(),
    acts: preview.acts.length > 0 ? preview.acts.map((act) => newAct(act.name, act.artistId)) : values.acts,
  }
}
