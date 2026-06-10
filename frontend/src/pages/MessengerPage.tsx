import { useMemo, useState, type FormEvent } from 'react'
import type { InternalMessage, InternalMessageType } from '../api/types'
import { ROLE_LABELS } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { workflowService } from '../services'
import { useApi } from '../hooks/useApi'
import { Card, EmptyState, PageFooter } from '../components/ui'

const TYPE_LABEL: Record<InternalMessageType | 'all', string> = {
  all: 'Все типы',
  message: 'Обычное сообщение',
  office_call: 'Вызов в кабинет',
  academic_debt: 'Академическая задолженность',
  risk_comment: 'Комментарий по риску',
  absence_comment: 'Комментарий по пропускам',
  system: 'Системное сообщение',
  support: 'Сообщение поддержки',
}

const TYPE_OPTIONS: InternalMessageType[] = ['message', 'office_call', 'academic_debt', 'risk_comment', 'absence_comment', 'system', 'support']

export function MessengerPage() {
  const { user } = useAuth()
  const [type, setType] = useState<InternalMessageType | 'all'>('all')
  const [selected, setSelected] = useState<InternalMessage | null>(null)
  const messages = useApi(() => workflowService.messages(type), [type])
  const recipients = useApi(() => workflowService.recipients(), [])
  const rows = messages.data ?? []

  const unread = useMemo(() => rows.filter((m) => !m.isRead && m.toUserId === user?.id).length, [rows, user?.id])

  const markRead = async (m: InternalMessage) => {
    setSelected(m)
    if (!m.isRead && m.toUserId === user?.id) {
      await workflowService.markMessageRead(m.id)
      messages.reload()
    }
  }

  return (
    <div className="page">
      <div className="grid grid-4">
        <MiniStat label="Сообщений" value={String(rows.length)} color="blue" />
        <MiniStat label="Непрочитано" value={String(unread)} color="orange" />
        <MiniStat label="Получателей" value={String(recipients.data?.length ?? 0)} color="green" />
        <MiniStat label="Роль" value={user ? ROLE_LABELS[user.role] : '—'} color="purple" />
      </div>

      <div className="grid grid-2-wide">
        <Card title="Внутренний мессенджер" headerRight={
          <select className="select" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            {(['all', ...TYPE_OPTIONS] as const).map((x) => <option key={x} value={x}>{TYPE_LABEL[x]}</option>)}
          </select>
        }>
          {messages.loading ? <EmptyState message="Загрузка сообщений…" /> : rows.length === 0 ? <EmptyState message="Сообщений нет." /> : (
            <div className="message-list">
              {rows.map((m) => (
                <button key={m.id} className={`message-item${!m.isRead && m.toUserId === user?.id ? ' is-unread' : ''}`} onClick={() => markRead(m)}>
                  <span className="message-item__type">{TYPE_LABEL[m.type]}</span>
                  <strong>{m.title}</strong>
                  <span>{m.text}</span>
                  <small>{m.fromUserId === user?.id ? 'Исходящее' : 'Входящее'} · {new Date(m.createdAt).toLocaleString('ru-RU')}</small>
                </button>
              ))}
            </div>
          )}
        </Card>

        <ComposeMessage recipients={recipients.data ?? []} onSent={messages.reload} replyTo={selected} />
      </div>

      {selected && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setSelected(null)}>
          <section className="modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal__head">
              <div><h2>{selected.title}</h2><p>{TYPE_LABEL[selected.type]} · {new Date(selected.createdAt).toLocaleString('ru-RU')}</p></div>
              <button className="modal__close" onClick={() => setSelected(null)} aria-label="Закрыть">×</button>
            </div>
            <p>{selected.text}</p>
            {selected.meta && <pre className="formula">{JSON.stringify(selected.meta, null, 2)}</pre>}
          </section>
        </div>
      )}

      <PageFooter />
    </div>
  )
}

function ComposeMessage({ recipients, onSent, replyTo }: { recipients: { id: string; fullName: string; role: string }[]; onSent: () => void; replyTo: InternalMessage | null }) {
  const [toUserId, setToUserId] = useState('')
  const [type, setType] = useState<InternalMessageType>('message')
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [status, setStatus] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    await workflowService.sendMessage({ toUserId, type, title, text, replyToId: replyTo?.id })
    setTitle('')
    setText('')
    setStatus('Сообщение отправлено')
    onSent()
  }

  return (
    <Card title={replyTo ? 'Ответить' : 'Новое сообщение'}>
      <form className="form-grid form-grid--single" onSubmit={submit}>
        <label className="setting-field">
          <span className="field__label">Получатель</span>
          <select className="select" required value={toUserId} onChange={(e) => setToUserId(e.target.value)}>
            <option value="">Выберите получателя</option>
            {recipients.map((r) => <option key={r.id} value={r.id}>{r.fullName} · {ROLE_LABELS[r.role as keyof typeof ROLE_LABELS]}</option>)}
          </select>
        </label>
        <label className="setting-field">
          <span className="field__label">Тип сообщения</span>
          <select className="select" value={type} onChange={(e) => setType(e.target.value as InternalMessageType)}>
            {TYPE_OPTIONS.map((x) => <option key={x} value={x}>{TYPE_LABEL[x]}</option>)}
          </select>
        </label>
        <label className="setting-field"><span className="field__label">Тема</span><input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label className="setting-field"><span className="field__label">Текст</span><textarea className="input textarea" required value={text} onChange={(e) => setText(e.target.value)} /></label>
        <div className="flex" style={{ gap: 12 }}>
          <button className="btn-primary" type="submit">Отправить</button>
          {status && <span className="text-green">{status}</span>}
        </div>
      </form>
    </Card>
  )
}

function MiniStat({ label, value, color }: { label: string; value: string; color: 'blue' | 'green' | 'orange' | 'red' | 'purple' }) {
  return <div className="card card--pad"><div className="stat-box__label">{label}</div><div className={`stat-box__value stat-box__value--${color}`} style={{ marginTop: 8 }}>{value}</div></div>
}
