import type { PublicUser } from '../api/types'
import { ROLE_LABELS } from '../api/types'

export function ProfileModal({ user, onClose }: { user: PublicUser; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal" role="dialog" aria-modal="true" aria-label="Профиль пользователя" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <div>
            <h2>Профиль</h2>
            <p>{ROLE_LABELS[user.role]}</p>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Закрыть">×</button>
        </div>
        <div className="profile-card">
          <div className="profile-card__avatar">{user.fullName.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()}</div>
          <div>
            <h3>{user.fullName}</h3>
            <p>{user.email}</p>
          </div>
        </div>
        <dl className="profile-list">
          <div><dt>Роль</dt><dd>{ROLE_LABELS[user.role]}</dd></div>
          <div><dt>Доступные классы</dt><dd>{user.classIds?.map((x) => x.replace(/^\d+-/, '')).join(', ') || 'Все доступные по роли'}</dd></div>
          <div><dt>Создан</dt><dd>{new Date(user.createdAt).toLocaleDateString('ru-RU')}</dd></div>
        </dl>
      </section>
    </div>
  )
}
