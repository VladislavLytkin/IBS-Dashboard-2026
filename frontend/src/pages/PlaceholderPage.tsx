import { EmptyState, PageFooter } from '../components/ui'

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="page">
      <section className="card card--pad">
        <h2 className="card__title">{title}</h2>
        <EmptyState message="Раздел находится в разработке. Данные появятся здесь позже." />
      </section>
      <PageFooter />
    </div>
  )
}
