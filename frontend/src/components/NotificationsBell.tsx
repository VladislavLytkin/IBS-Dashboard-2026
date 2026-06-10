import { useEffect, useRef, useState } from 'react'
import type { AppNotification, NotificationType } from '../api/types'
import { notificationsService } from '../services'
import { IconBell, IconCheck } from './icons'

const TYPE_DOT: Record<NotificationType, string> = {
  risk: 'var(--red)', rating: 'var(--blue)', report: 'var(--green)',
  attendance: 'var(--orange)', system: 'var(--text-soft)', olympiad: 'var(--purple)', grades: 'var(--blue)',
}

const TYPE_LABEL: Record<NotificationType, string> = {
  risk: 'Риск',
  rating: 'Рейтинг',
  report: 'Отчёт',
  attendance: 'Пропуски',
  system: 'Система',
  olympiad: 'Олимпиада',
  grades: 'Оценки',
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<AppNotification[]>([])
  const [unread, setUnread] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const load = () => {
    notificationsService.list().then((r) => { setItems(r.items); setUnread(r.unread) }).catch(() => {})
  }
  useEffect(load, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const markAll = async () => { await notificationsService.markAllRead(); load() }
  const markOne = async (id: string) => { await notificationsService.markRead(id); load() }

  return (
    <div className="notif" ref={ref}>
      <button className="topbar__bell" onClick={() => setOpen((v) => !v)} aria-label="Уведомления">
        <IconBell />
        {unread > 0 && <span className="topbar__bell-badge">{unread}</span>}
      </button>

      {open && (
        <div className="notif__panel">
          <div className="notif__head">
            <strong>Уведомления</strong>
            <button className="link-blue" onClick={markAll}><IconCheck width={14} height={14} /> Прочитать все</button>
          </div>
          <div className="notif__list">
            {items.length === 0 && <div className="text-muted" style={{ padding: 16 }}>Нет уведомлений</div>}
            {items.map((n) => (
              <div key={n.id} className={`notif__item${n.read ? '' : ' is-unread'}`}>
                <span className="notif__dot" style={{ background: TYPE_DOT[n.type] }} />
                <div>
                  <div className="notif__meta">
                    <span>{TYPE_LABEL[n.type]}</span>
                    {!n.read && <span>не прочитано</span>}
                  </div>
                  <div className="notif__title">{n.title}</div>
                  <div className="notif__msg">{n.message}</div>
                  <div className="notif__foot">
                    <span className="notif__time">{new Date(n.createdAt).toLocaleString('ru-RU')}</span>
                    {!n.read && <button className="link-blue" onClick={() => markOne(n.id)}>Отметить как прочитанное</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
