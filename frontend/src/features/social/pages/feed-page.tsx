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
      <h1 className="font-display text-5xl leading-none font-normal tracking-tight md:text-7xl">Seu feed</h1>
      <p className="mt-4 max-w-xl text-xl">O que as pessoas que você segue avaliaram, favoritaram, descobriram e vão ver ao vivo.</p>

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
        <section className="mt-10 max-w-xl border-t-4 border-accent bg-surface-raised px-6 py-8">
          <h2 className="font-display text-3xl leading-none font-normal italic">Seu feed está vazio</h2>
          <p className="mt-4 text-xl">Siga pessoas para ver aqui o que elas ouvem. Procure alguém pelo nome ou pelo @usuario.</p>
          <p className="mt-6">
            <ButtonLink to="/pessoas">Procurar pessoas</ButtonLink>
          </p>
        </section>
      ) : items.length === 0 ? (
        <p className="mt-10 max-w-xl text-xl">As pessoas que você segue ainda não fizeram nada por aqui. Quando avaliarem um disco ou favoritarem uma banda, aparece aqui.</p>
      ) : (
        <>
          <div className="mt-10 max-w-3xl border-t border-rule">
            {items.map((item) => (
              <FeedItemCard key={item.id} item={item} />
            ))}
          </div>
          {feed.hasNextPage && (
            <p className="mt-8">
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
