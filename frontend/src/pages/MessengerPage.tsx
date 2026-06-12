import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { InternalMessage, InternalMessageType, MessageStatus, PublicUser, Role } from '../api/types'
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

const REACTIONS = ['👍', '❤️', '😂', '😮', '✅', '🙏']

interface Dialog {
  peerId: string
  peerName: string
  peerRole: Role
  messages: InternalMessage[]
  lastMessage: InternalMessage | null
  unread: number
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}

function timeShort(isoDate: string): string {
  const d = new Date(isoDate)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
}

function timeFull(isoDate: string): string {
  return new Date(isoDate).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function pluralMinutes(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'минуту'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'минуты'
  return 'минут'
}

/** «В сети» / «Был(а) в сети …» по lastSeenAt. */
function presenceLabel(peer?: PublicUser): string | null {
  if (!peer?.lastSeenAt) return null
  const t = Date.parse(peer.lastSeenAt)
  const diffMin = Math.floor((Date.now() - t) / 60000)
  if (peer.isOnline || diffMin < 2) return 'В сети'
  const d = new Date(t)
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  const now = new Date()
  if (diffMin < 60) return `Был(а) в сети ${diffMin} ${pluralMinutes(diffMin)} назад`
  if (d.toDateString() === now.toDateString()) return `Был(а) в сети сегодня в ${time}`
  const yesterday = new Date(now.getTime() - 86400000)
  if (d.toDateString() === yesterday.toDateString()) return `Был(а) в сети вчера в ${time}`
  return `Был(а) в сети ${d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })} в ${time}`
}

function statusOf(m: InternalMessage): MessageStatus {
  if (m.id.startsWith('temp-')) return 'sending'
  return m.isRead ? 'read' : 'sent'
}

function StatusTicks({ status }: { status: MessageStatus }) {
  if (status === 'sending') return <span className="bubble__ticks" title="Отправляется">…</span>
  if (status === 'read') return <span className="bubble__ticks bubble__ticks--read" title="Просмотрено">✓✓</span>
  return <span className="bubble__ticks" title="Отправлено">✓</span>
}

export function MessengerPage() {
  const { user } = useAuth()
  const [type, setType] = useState<InternalMessageType | 'all'>('all')
  const [peerId, setPeerId] = useState<string | null>(null)
  const [items, setItems] = useState<InternalMessage[]>([])
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null)
  const [editing, setEditing] = useState<InternalMessage | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const messages = useApi(() => workflowService.messages(type), [type])
  const recipients = useApi(() => workflowService.recipients(), [])
  const threadRef = useRef<HTMLDivElement>(null)
  const messageRefs = useRef(new Map<string, HTMLDivElement>())
  const markingRef = useRef(new Set<string>())

  // Локальный стейт сообщений: отправка делает optimistic insert + замену на серверный
  // ответ (НЕ refetch), поэтому сообщение не может появиться дважды.
  useEffect(() => {
    if (messages.data) setItems(messages.data)
  }, [messages.data])

  const replaceItem = (m: InternalMessage) => setItems((prev) => prev.map((x) => (x.id === m.id ? m : x)))

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    const close = () => setMenu(null)
    document.addEventListener('click', close)
    document.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('click', close)
      document.removeEventListener('scroll', close, true)
    }
  }, [])

  const recipientById = useMemo(() => {
    const map = new Map<string, PublicUser>()
    for (const r of recipients.data ?? []) map.set(r.id, r)
    return map
  }, [recipients.data])

  const visible = useMemo(
    () => items.filter((m) => !(m.hiddenForUserIds ?? []).includes(user?.id ?? '')),
    [items, user?.id],
  )

  const dialogs = useMemo<Dialog[]>(() => {
    if (!user) return []
    const byPeer = new Map<string, InternalMessage[]>()
    for (const m of visible) {
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
    return result.sort((a, b) => (b.lastMessage?.createdAt ?? '').localeCompare(a.lastMessage?.createdAt ?? ''))
  }, [visible, user, recipientById])

  const selected = useMemo<Dialog | null>(() => {
    if (!peerId) return null
    const existing = dialogs.find((d) => d.peerId === peerId)
    if (existing) return existing
    const known = recipientById.get(peerId)
    if (!known) return null
    return { peerId, peerName: known.fullName, peerRole: known.role, messages: [], lastMessage: null, unread: 0 }
  }, [peerId, dialogs, recipientById])

  const peerUser = selected ? recipientById.get(selected.peerId) : undefined
  const presence = presenceLabel(peerUser)

  // Открытый диалог: помечаем входящие непрочитанные (собеседник увидит ✓✓).
  useEffect(() => {
    if (!selected || !user) return
    const unreadIncoming = selected.messages.filter(
      (m) => !m.isRead && m.toUserId === user.id && !markingRef.current.has(m.id),
    )
    for (const m of unreadIncoming) {
      markingRef.current.add(m.id)
      workflowService.markMessageRead(m.id).then(replaceItem).catch(() => markingRef.current.delete(m.id))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.peerId, selected?.messages.length])

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight })
  }, [selected?.peerId, selected?.messages.length])

  const canReply = selected ? recipientById.has(selected.peerId) : false
  const pinnedMessages = (selected?.messages ?? []).filter((m) => m.pinnedAt && !m.deletedForEveryone)

  // ===== Отправка: optimistic insert -> замена серверным сообщением =====
  const sendText = async (text: string) => {
    if (!user || !selected) return
    const tempId = `temp-${Date.now()}`
    const temp: InternalMessage = {
      id: tempId,
      fromUserId: user.id,
      toUserId: selected.peerId,
      fromRole: user.role,
      toRole: selected.peerRole,
      type: 'message',
      title: text.length > 60 ? `${text.slice(0, 57)}…` : text,
      text,
      createdAt: new Date().toISOString(),
      isRead: false,
    }
    setItems((prev) => [...prev, temp])
    try {
      const saved = await workflowService.sendMessage({
        toUserId: selected.peerId,
        type: 'message',
        title: temp.title,
        text,
      })
      setItems((prev) => prev.map((x) => (x.id === tempId ? saved : x)))
    } catch (e) {
      setItems((prev) => prev.filter((x) => x.id !== tempId))
      setToast(e instanceof Error ? e.message : 'Не удалось отправить сообщение')
    }
  }

  const saveEdit = async (text: string) => {
    if (!editing) return
    try {
      replaceItem(await workflowService.editMessage(editing.id, text))
      setEditing(null)
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Не удалось сохранить')
    }
  }

  // ===== Действия контекстного меню =====
  const act = async (fn: () => Promise<InternalMessage>, errText: string) => {
    setMenu(null)
    try {
      replaceItem(await fn())
    } catch (e) {
      setToast(e instanceof Error ? e.message : errText)
    }
  }

  const copyMessage = async (m: InternalMessage) => {
    setMenu(null)
    try {
      await navigator.clipboard.writeText(m.text)
      setToast('Сообщение скопировано')
    } catch {
      setToast('Не удалось скопировать')
    }
  }

  const scrollToMessage = (id: string) => {
    const el = messageRefs.current.get(id)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setHighlightId(id)
    setTimeout(() => setHighlightId(null), 1600)
  }

  const openMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    const x = Math.min(e.clientX, window.innerWidth - 240)
    const y = Math.min(e.clientY, window.innerHeight - 320)
    setMenu({ id, x, y })
  }

  const menuMessage = menu ? visible.find((m) => m.id === menu.id) : null

  return (
    <div className="page">
      <div className="chat card">
        <aside className="chat__side">
          <div className="chat__side-head">
            <button className="btn-primary" style={{ width: '100%' }} onClick={() => setSearchOpen(true)}>+ Новый диалог</button>
            <select className="select" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              {(Object.keys(TYPE_LABEL) as (InternalMessageType | 'all')[]).map((x) => (
                <option key={x} value={x}>{TYPE_LABEL[x]}</option>
              ))}
            </select>
          </div>
          <div className="chat__dialogs">
            {messages.loading && items.length === 0 ? (
              <div className="chat__hint">Загрузка диалогов…</div>
            ) : dialogs.length === 0 ? (
              <div className="chat__hint">Диалогов пока нет. Нажмите «+ Новый диалог», чтобы найти собеседника.</div>
            ) : (
              dialogs.map((d) => (
                <button
                  key={d.peerId}
                  className={`chat-item${selected?.peerId === d.peerId ? ' is-active' : ''}${d.unread ? ' is-unread' : ''}`}
                  onClick={() => { setPeerId(d.peerId); setEditing(null) }}
                >
                  <span className="chat-item__avatar">
                    {initials(d.peerName)}
                    {recipientById.get(d.peerId)?.isOnline && <span className="online-dot" />}
                  </span>
                  <span className="chat-item__body">
                    <span className="chat-item__top">
                      <span className="chat-item__name">{d.peerName}</span>
                      {d.lastMessage && <span className="chat-item__time">{timeShort(d.lastMessage.createdAt)}</span>}
                    </span>
                    <span className="chat-item__preview">
                      {d.lastMessage?.fromUserId === user?.id && <span className="chat-item__dir">Вы: </span>}
                      {d.lastMessage?.deletedForEveryone ? 'Сообщение удалено' : d.lastMessage?.text}
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
                <span className="chat-item__avatar">
                  {initials(selected.peerName)}
                  {peerUser?.isOnline && <span className="online-dot" />}
                </span>
                <div>
                  <div className="chat__peer-name">{selected.peerName}</div>
                  <div className={`chat__peer-status${presence === 'В сети' ? ' is-online' : ''}`}>
                    {presence ?? ROLE_LABELS[selected.peerRole]}
                  </div>
                </div>
              </header>

              {pinnedMessages.length > 0 && (
                <div className="chat__pins">
                  {pinnedMessages.map((m) => (
                    <button key={m.id} className="chat__pin" onClick={() => scrollToMessage(m.id)} title="Перейти к сообщению">
                      <span className="chat__pin-icon">📌</span>
                      <span className="chat__pin-text">{m.text}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="chat__thread" ref={threadRef}>
                {selected.messages.length === 0 ? (
                  <div className="chat__hint" style={{ margin: 'auto' }}>Сообщений пока нет — напишите первое.</div>
                ) : (
                  selected.messages.map((m) => {
                    const out = m.fromUserId === user?.id
                    const deleted = m.deletedForEveryone
                    const reactionGroups = Object.entries(
                      (m.reactions ?? []).reduce<Record<string, number>>((acc, r) => {
                        acc[r.emoji] = (acc[r.emoji] ?? 0) + 1
                        return acc
                      }, {}),
                    )
                    const myReaction = (m.reactions ?? []).find((r) => r.userId === user?.id)?.emoji
                    return (
                      <div
                        key={m.id}
                        ref={(el) => { if (el) messageRefs.current.set(m.id, el); else messageRefs.current.delete(m.id) }}
                        className={`bubble-row${out ? ' bubble-row--out' : ''}${highlightId === m.id ? ' is-highlight' : ''}`}
                        onContextMenu={(e) => !deleted && openMenu(e, m.id)}
                      >
                        {!out && <span className="msg-avatar" title={selected.peerName}>{initials(selected.peerName)}</span>}
                        <div className={`bubble${out ? ' bubble--out' : ' bubble--in'}${deleted ? ' bubble--deleted' : ''}`}>
                          <div className="bubble__author">
                            {out ? 'Вы' : selected.peerName}
                            {m.pinnedAt && !deleted && <span className="bubble__pin" title="Закреплено">📌</span>}
                          </div>
                          {!deleted && m.type !== 'message' && <span className="bubble__chip">{TYPE_LABEL[m.type]}</span>}
                          {!deleted && m.type !== 'message' && m.title && <div className="bubble__title">{m.title}</div>}
                          {deleted ? (
                            <div className="bubble__text bubble__text--deleted">Сообщение удалено</div>
                          ) : (
                            <div className="bubble__text">{m.text}</div>
                          )}
                          {!deleted && reactionGroups.length > 0 && (
                            <div className="bubble__reactions">
                              {reactionGroups.map(([emoji, count]) => (
                                <button
                                  key={emoji}
                                  className={`reaction-badge${myReaction === emoji ? ' is-own' : ''}`}
                                  onClick={() => act(() => workflowService.reactMessage(m.id, emoji), 'Не удалось поставить реакцию')}
                                  title={myReaction === emoji ? 'Убрать реакцию' : 'Поставить реакцию'}
                                >
                                  {emoji} {count}
                                </button>
                              ))}
                            </div>
                          )}
                          <div className="bubble__time">
                            {m.editedAt && !deleted && <span className="bubble__edited">изменено</span>}
                            {timeFull(m.createdAt)}
                            {out && !deleted && <StatusTicks status={statusOf(m)} />}
                          </div>
                        </div>
                        {!deleted && (
                          <button className="bubble__more" aria-label="Действия с сообщением" onClick={(e) => openMenu(e, m.id)}>⋯</button>
                        )}
                        {out && <span className="msg-avatar" title="Вы">{initials(user?.fullName ?? '')}</span>}
                      </div>
                    )
                  })
                )}
              </div>

              <Composer
                key={selected.peerId + (editing?.id ?? '')}
                disabled={!canReply}
                editing={editing}
                onCancelEdit={() => setEditing(null)}
                onSend={editing ? saveEdit : sendText}
              />
            </>
          )}
        </section>
      </div>

      {menu && menuMessage && user && (
        <div className="msg-menu" style={{ left: menu.x, top: menu.y }} onClick={(e) => e.stopPropagation()}>
          <div className="msg-menu__reactions">
            {REACTIONS.map((emoji) => (
              <button key={emoji} onClick={() => act(() => workflowService.reactMessage(menuMessage.id, emoji), 'Не удалось поставить реакцию')}>
                {emoji}
              </button>
            ))}
          </div>
          <button className="msg-menu__item" onClick={() => act(() => workflowService.pinMessage(menuMessage.id, !menuMessage.pinnedAt), 'Не удалось закрепить')}>
            {menuMessage.pinnedAt ? 'Открепить' : 'Закрепить'}
          </button>
          {menuMessage.fromUserId === user.id && (
            <button className="msg-menu__item" onClick={() => { setEditing(menuMessage); setMenu(null) }}>Редактировать</button>
          )}
          <button className="msg-menu__item" onClick={() => copyMessage(menuMessage)}>Скопировать</button>
          <button className="msg-menu__item" onClick={() => act(() => workflowService.hideMessage(menuMessage.id), 'Не удалось удалить')}>Удалить у меня</button>
          {(menuMessage.fromUserId === user.id || user.role === 'ADMIN' || user.role === 'HEAD_TEACHER') && (
            <button className="msg-menu__item msg-menu__item--danger" onClick={() => act(() => workflowService.deleteMessage(menuMessage.id), 'Не удалось удалить')}>
              Удалить у всех
            </button>
          )}
        </div>
      )}

      {searchOpen && (
        <NewDialogModal
          recipients={recipients.data ?? []}
          onClose={() => setSearchOpen(false)}
          onPick={(id) => { setPeerId(id); setSearchOpen(false); setEditing(null) }}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
      <PageFooter />
    </div>
  )
}

function Composer({ onSend, disabled, editing, onCancelEdit }: {
  onSend: (text: string) => Promise<void>
  disabled: boolean
  editing: InternalMessage | null
  onCancelEdit: () => void
}) {
  const [text, setText] = useState(editing?.text ?? '')
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
    <div className="chat__composer-wrap">
      {editing && (
        <div className="chat__editing">
          <span>Редактирование: <em>{editing.text.slice(0, 80)}</em></span>
          <button className="modal__close" style={{ width: 26, height: 26, fontSize: 18 }} onClick={onCancelEdit} aria-label="Отменить редактирование">×</button>
        </div>
      )}
      <form className="chat__composer" onSubmit={submit}>
        <input
          className="input"
          placeholder={editing ? 'Новый текст сообщения…' : 'Напишите сообщение…'}
          value={text}
          autoFocus={!!editing}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn-primary" type="submit" disabled={!text.trim() || sending}>
          {editing ? 'Сохранить' : 'Отправить'}
        </button>
      </form>
    </div>
  )
}

function NewDialogModal({ recipients, onPick, onClose }: {
  recipients: PublicUser[]
  onPick: (id: string) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  // Поиск по имени, роли, классам и предметам — среди доступных по правам собеседников.
  const matches = recipients.filter((r) => {
    if (!q) return true
    const haystack = [
      r.fullName,
      ROLE_LABELS[r.role],
      ...(r.classIds ?? []).map((id) => id.replace(/^\d+-/, '')),
      ...(r.subjects ?? []),
    ].join(' ').toLowerCase()
    return haystack.includes(q)
  })
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal" role="dialog" aria-modal="true" aria-label="Новый диалог" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <div>
            <h2>Новый диалог</h2>
            <p>Введите имя учителя, ученика или администратора</p>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Закрыть">×</button>
        </div>
        <input
          className="input"
          autoFocus
          placeholder="Поиск по имени, роли, классу, предмету…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="user-search">
          {matches.length === 0 ? (
            <div className="chat__hint">Никого не найдено.</div>
          ) : (
            matches.map((r) => (
              <button key={r.id} className="user-search__item" onClick={() => onPick(r.id)}>
                <span className="chat-item__avatar">
                  {initials(r.fullName)}
                  {r.isOnline && <span className="online-dot" />}
                </span>
                <span className="user-search__meta">
                  <span className="user-search__name">{r.fullName}</span>
                  <span className="user-search__sub">
                    {ROLE_LABELS[r.role]}
                    {r.subjects?.length ? ` · ${r.subjects.join(', ')}` : ''}
                    {r.classIds?.length ? ` · ${r.classIds.map((id) => id.replace(/^\d+-/, '')).join(', ')}` : ''}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
