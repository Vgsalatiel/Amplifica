import type { ImageCredit } from '../../../types/api'

/** Só links https viram link: defesa em profundidade, porque a API já valida. */
const isSafeLink = (url: string) => /^https:\/\//i.test(url)

/**
 * Crédito de uma foto com licença livre: "Foto: autor, licença, via Wikimedia Commons". A licença
 * (Creative Commons) exige citar o autor; os links levam à licença e ao arquivo original.
 */
export function PhotoCredit({ credit }: { credit: ImageCredit }) {
  const link = 'underline underline-offset-4 hover:text-accent'
  return (
    <p className="mt-2 text-xs text-muted">
      Foto: {credit.author},{' '}
      {isSafeLink(credit.licenseUrl) ? (
        <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer" className={link}>
          {credit.license}
          <span className="sr-only"> (abre em outra aba)</span>
        </a>
      ) : (
        credit.license
      )}
      ,{' '}
      {isSafeLink(credit.sourceUrl) ? (
        <a href={credit.sourceUrl} target="_blank" rel="noopener noreferrer" className={link}>
          via Wikimedia Commons
          <span className="sr-only"> (abre em outra aba)</span>
        </a>
      ) : (
        'via Wikimedia Commons'
      )}
      .
    </p>
  )
}
