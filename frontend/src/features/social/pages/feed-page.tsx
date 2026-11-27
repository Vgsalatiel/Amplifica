import { Container } from '../../../components/layout/container'
import { Button } from '../../../components/ui/button'
import { ButtonLink } from '../../../components/ui/button-link'
import { useDocumentTitle } from '../../../hooks/use-document-title'
import { FeedItemCard } from '../components/feed-item-card'
import { useFeed } from '../hooks/use-social'

/** Seu feed, em /feed: o que as pessoas que você segue avaliaram, favoritaram, descobriram e vão ver ao vivo. */
export function FeedPage() {
  useDocumentTitle('Seu feed')
  const feed = useFeed()
  const items = feed.data?.pages.flatMap((page) => page.items) ?? []
  const following = feed.data?.pages[0]?.following ?? 0

  return (
    <Container className="pt-10 md:pt-16">
      <div className="flex max-w-2xl flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="font-display text-5xl leading-none font-normal tracking-tight md:text-7xl">Seu feed</h1>
          <p className="mt-4 max-w-md text-lg text-muted">O que as pessoas que você segue avaliaram, favoritaram, descobriram e vão ver ao vivo.</p>
        </div>
        {/* Sem seguir ninguém, o convite já está no cartão abaixo. */}
        {following > 0 && (
          <ButtonLink to="/pessoas" variant="secondary">
            Procurar pessoas
          </ButtonLink>
        )}
      </div>

      {feed.isPending ? (
        <p className="mt-10 text-muted">Carregando o feed…</p>
      ) : feed.isError ? (
        <div role="alert" className="mt-10">
          <p className="text-danger">Não foi possível carregar o feed.</p>
          <p className="mt-4">
            <Button type="button" variant="secondary" onClick={() => void feed.refetch()}>
              Tentar de novo
            </Button>
          </p>
        </div>
      ) : following === 0 ? (
        <section className="mt-10 max-w-2xl rounded-3xl bg-surface-raised px-6 py-10 text-center ring-1 ring-white/5 md:px-10">
          <span aria-hidden="true" className="mx-auto flex size-14 items-center justify-center rounded-full bg-accent text-on-accent">
            <svg viewBox="0 0 24 24" className="size-7" fill="currentColor">
              <path d="m12 2.8 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.6l-5.8 3.1 1.1-6.5L2.6 9.6l6.5-.9z" />
            </svg>
          </span>
          <h2 className="mt-5 font-display text-3xl leading-none font-normal">Seu feed está vazio</h2>
          <p className="mx-auto mt-4 max-w-md text-lg text-muted">Siga pessoas para ver aqui o que elas ouvem. Procure alguém pelo nome ou pelo @usuario.</p>
          <p className="mt-6">
            <ButtonLink to="/pessoas">Procurar pessoas</ButtonLink>
          </p>
        </section>
      ) : items.length === 0 ? (
        <p className="mt-10 max-w-2xl rounded-3xl bg-surface-raised px-6 py-8 text-lg text-muted ring-1 ring-white/5">
          As pessoas que você segue ainda não fizeram nada por aqui. Quando avaliarem um disco ou favoritarem uma banda, aparece aqui.
        </p>
      ) : (
        <>
          <div className="mt-10 flex max-w-2xl flex-col gap-4">
            {items.map((item) => (
              <FeedItemCard key={item.id} item={item} />
            ))}
          </div>
          {feed.hasNextPage && (
            <p className="mt-8 max-w-2xl text-center">
              <Button type="button" variant="secondary" disabled={feed.isFetchingNextPage} onClick={() => void feed.fetchNextPage()}>
                {feed.isFetchingNextPage ? 'Carregando…' : 'Ver mais'}
              </Button>
            </p>
          )}
        </>
      )}
    </Container>
  )
}
