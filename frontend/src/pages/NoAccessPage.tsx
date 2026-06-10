import { Link } from 'react-router-dom'
import { IconRisk } from '../components/icons'

export function NoAccessPage() {
  return (
    <div className="page">
      <section className="card card--pad">
        <div className="empty">
          <IconRisk width={48} height={48} />
          <h2 style={{ margin: 0 }}>Нет доступа</h2>
          <p className="text-muted">У вашей роли нет прав для просмотра этого раздела.</p>
          <Link className="btn btn--ghost-blue" to="/">На главную</Link>
        </div>
      </section>
    </div>
  )
}
