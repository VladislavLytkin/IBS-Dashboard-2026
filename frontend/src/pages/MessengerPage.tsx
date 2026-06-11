import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { InternalMessage, InternalMessageType, Role } from '../api/types'
import { ROLE_LABELS } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { workflowService } from '../services'
import { useApi } from '../hooks/useApi'
import { EmptyState, PageFooter } from '../components/ui'

const TYPE_LABEL: Record<InternalMessageType | 'all', string> = {
  all: 'Все типы',
  message: 'Сообщение',
  office_call: 'Вызов в кабинет',
  academic_debt: 'Академическая задолженность',
  risk_comment: 'Комментарий по риску',
  absence_comment: 'Комментарий по пропускам',
  system: 'Системное сообщение',
  support: 'Сообщение поддержки',
}

interface Dialog {
  peerId: string
  peerName: string
  peerRole: Role
  messages: InternalMessage[]
  lastMessage: InternalMessage
  unread: number
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}

function timeShort(isoDate: string): string {
  const d = new Date(isoDate)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
}

function timeFull(isoDate: string): string {
  return new Date(isoDate).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function MessengerPage() {
  const { user } = useAuth()
  const [type, setType] = useState<InternalMessageType | 'all'>('all')
  const [peerId, setPeerId] = useState<string | null>(null)
  const messages = useApi(() => workflowService.messages(type), [type])
  const recipients = useApi(() => workflowService.recipients(), [])
  const rows = useMemo(() => messages.data ?? [], [messages.data])
  const threadRef = useRef<HTMLDivElement>(null)

  const recipientById = useMemo(() => {
    const map = new Map<string, { fullName: string; role: Role }>()
    for (const r of recipients.data ?? []) map.set(r.id, { fullName: r.fullName, role: r.role as Role })
    return map
  }, [recipients.data])

  // Группируем переписку по собеседнику: имя из списка получателей,
  // для недоступных ролей — подпись роли (ученик видит «Администратор»).
  const dialogs = useMemo<Dialog[]>(() => {
    if (!user) return []
    const byPeer = new Map<string, InternalMessage[]>()
    for (const m of rows) {
      const peer = m.fromUserId === user.id ? m.toUserId : m.fromUserId
      const list = byPeer.get(peer) ?? []
      list.push(m)
      byPeer.set(peer, list)
    }
    const result: Dialog[] = []
    for (const [peer, list] of byPeer) {
      list.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      const last = list[list.length - 1]
      const peerRole = last.fromUserId === user.id ? last.toRole : last.fromRole
      const known = recipientById.get(peer)
      result.push({
        peerId: peer,
        peerName: known?.fullName ?? ROLE_LABELS[peerRole],
        peerRole: known?.role ?? peerRole,
        messages: list,
        lastMessage: last,
        unread: list.filter((m) => !m.isRead && m.toUserId === user.id).length,
      })
    }
    return result.sort((a, b) => b.lastMessage.createdAt.localeCompare(a.lastMessage.createdAt))
  }, [rows, user, recipientById])

  const selected = useMemo(() => {
    if (!peerId) return null
    const existing = dialogs.find((d) => d.peerId === peerId)
    if (existing) return existing
    const known = recipientById.get(peerId)
    if (!known) return null
    // Новый диалог без истории.
    return { peerId, peerName: known.fullName, peerRole: known.role, messages: [], lastMessage: undefined as unknown as InternalMessage, unread: 0 }
  }, [peerId, dialogs, recipientById])

  // Открытый диалог: помечаем входящие непрочитанные.
  useEffect(() => {
    if (!selected || !user) return
    const unreadIncoming = selected.messages.filter((m) => !m.isRead && m.toUserId === user.id)
    if (unreadIncoming.length === 0) return
    Promise.all(unreadIncoming.map((m) => workflowService.markMessageRead(m.id))).then(() => messages.reload())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.peerId, selected?.messages.length])

  // Автопрокрутка истории вниз при выборе диалога и новых сообщениях.
  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight })
  }, [selected?.peerId, selected?.messages.length])

  const canReply = selected ? recipientById.has(selected.peerId) : false

  return (
    <div className="page">
      <div className="chat card">
        <aside className="chat__side">
          <div className="chat__side-head">
            <select className="select" value={peerId ?? ''} onChange={(e) => setPeerId(e.target.value || null)}>
              <option value="">Новый диалог…</option>
              {(recipients.data ?? []).map((r) => (
                <option key={r.id} value={r.id}>{r.fullName} · {ROLE_LABELS[r.role as Role]}</option>
              ))}
            </select>
            <select className="select" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              {(Object.keys(TYPE_LABEL) as (InternalMessageType | 'all')[]).map((x) => (
                <option key={x} value={x}>{TYPE_LABEL[x]}</option>
              ))}
            </select>
          </div>
          <div className="chat__dialogs">
            {messages.loading ? (
              <div className="chat__hint">Загрузка диалогов…</div>
            ) : dialogs.length === 0 ? (
              <div className="chat__hint">Диалогов пока нет. Выберите получателя выше, чтобы начать переписку.</div>
            ) : (
              dialogs.map((d) => (
                <button
                  key={d.peerId}
                  className={`chat-item${selected?.peerId === d.peerId ? ' is-active' : ''}${d.unread ? ' is-unread' : ''}`}
                  onClick={() => setPeerId(d.peerId)}
                >
                  <span className="chat-item__avatar">{initials(d.peerName)}</span>
                  <span className="chat-item__body">
                    <span className="chat-item__top">
                      <span className="chat-item__name">{d.peerName}</span>
                      <span className="chat-item__time">{timeShort(d.lastMessage.createdAt)}</span>
                    </span>
                    <span className="chat-item__preview">
                      {d.lastMessage.fromUserId === user?.id && <span className="chat-item__dir">Вы: </span>}
                      {d.lastMessage.text}
                    </span>
                  </span>
                  {d.unread > 0 && <span className="chat-item__badge">{d.unread}</span>}
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="chat__main">
          {!selected ? (
            <EmptyState message="Выберите диалог слева или начните новый." />
          ) : (
            <>
              <header className="chat__head">
                <span className="chat-item__avatar">{initials(selected.peerName)}</span>
                <div>
                  <div className="chat__peer-name">{selected.peerName}</div>
                  <div className="chat__peer-role">{ROLE_LABELS[selected.peerRole]}</div>
                </div>
              </header>
              <div className="chat__thread" ref={threadRef}>
                {selected.messages.length === 0 ? (
                  <div className="chat__hint" style={{ margin: 'auto' }}>Сообщений пока нет — напишите первое.</div>
                ) : (
                  selected.messages.map((m) => {
                    const out = m.fromUserId === user?.id
                    return (
                      <div key={m.id} className={`bubble-row${out ? ' bubble-row--out' : ''}`}>
                        <div className={`bubble${out ? ' bubble--out' : ' bubble--in'}`}>
                          {m.type !== 'message' && <span className="bubble__chip">{TYPE_LABEL[m.type]}</span>}
                          {m.title && <div className="bubble__title">{m.title}</div>}
                          <div className="bubble__text">{m.text}</div>
                          <div className="bubble__time">{timeFull(m.createdAt)}</div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
              <Composer
                key={selected.peerId}
                disabled={!canReply}
                onSend={async (text) => {
                  await workflowService.sendMessage({
                    toUserId: selected.peerId,
                    type: 'message',
                    title: text.length > 60 ? `${text.slice(0, 57)}…` : text,
                    text,
                  })
                  messages.reload()
                }}
              />
            </>
          )}
        </section>
      </div>
      <PageFooter />
    </div>
  )
}

function Composer({ onSend, disabled }: { onSend: (text: string) => Promise<void>; disabled: boolean }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const value = text.trim()
    if (!value || sending) return
    setSending(true)
    try {
      await onSend(value)
      setText('')
    } finally {
      setSending(false)
    }
  }
  if (disabled) {
    return <div className="chat__composer chat__composer--disabled">Ответ этому собеседнику недоступен для вашей роли.</div>
  }
  return (
    <form className="chat__composer" onSubmit={submit}>
      <input
        className="input"
        placeholder="Напишите сообщение…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button className="btn-primary" type="submit" disabled={!text.trim() || sending}>Отправить</button>
    </form>
  )
}
