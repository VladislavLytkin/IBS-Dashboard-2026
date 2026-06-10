import { useState, type FormEvent } from 'react'
import type { Role, SupportTicketStatus } from '../api/types'
import { ROLE_LABELS } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { workflowService } from '../services'
import { useApi } from '../hooks/useApi'
import { Card, EmptyState, PageFooter } from '../components/ui'

const STATUS_LABEL: Record<SupportTicketStatus | 'all', string> = {
  all: 'Все статусы',
  new: 'Новое',
  in_progress: 'В работе',
  resolved: 'Решено',
  rejected: 'Отклонено',
}

export function SupportPage() {
  const { user } = useAuth()
  const [status, setStatus] = useState<SupportTicketStatus | 'all'>('all')
  const [role, setRole] = useState<Role | 'all'>('all')
  const tickets = useApi(() => workflowService.support({ status, role }), [status, role])
  const rows = tickets.data ?? []

  return (
    <div className="page">
      {user?.role !== 'ADMIN' && <SupportForm onCreated={tickets.reload} />}

      <Card title={user?.role === 'ADMIN' ? 'Обработка обращений' : 'Мои обращения в поддержку'} headerRight={
        <div className="flex">
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {user?.role === 'ADMIN' && (
            <select className="select" value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
              <option value="all">Все роли</option>
              {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          )}
        </div>
      }>
        {tickets.loading ? <EmptyState message="Загрузка обращений…" /> : rows.length === 0 ? <EmptyState message="Обращений нет." /> : (
          <div className="table-wrap">
            <table className="tbl tbl--compact tbl--cards">
              <thead><tr><th>Тема</th><th>Категория</th><th>Приоритет</th><th>Роль</th><th>Статус</th><th>Ответ</th></tr></thead>
              <tbody>
                {rows.map((t) => <SupportRow key={t.id} ticket={t} isAdmin={user?.role === 'ADMIN'} onUpdated={tickets.reload} />)}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <PageFooter />
    </div>
  )
}

function SupportForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({ subject: '', category: 'data_error' as const, description: '', priority: 'medium' as const })
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    await workflowService.createSupport(form)
    setForm({ subject: '', category: 'data_error', description: '', priority: 'medium' })
    onCreated()
  }
  return (
    <Card title="Создать обращение в поддержку">
      <form className="form-grid" onSubmit={submit}>
        <label className="setting-field"><span className="field__label">Тема проблемы</span><input className="input" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></label>
        <label className="setting-field"><span className="field__label">Категория</span><select className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as typeof form.category })}>
          <option value="data_error">Ошибка в данных</option><option value="access_problem">Проблема с доступом</option><option value="ui_error">Ошибка интерфейса</option><option value="notifications_problem">Проблема с уведомлениями</option><option value="other">Другое</option>
        </select></label>
        <label className="setting-field"><span className="field__label">Приоритет</span><select className="select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as typeof form.priority })}>
          <option value="low">Низкий</option><option value="medium">Средний</option><option value="high">Высокий</option>
        </select></label>
        <label className="setting-field"><span className="field__label">Описание</span><textarea className="input textarea" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <button className="btn-primary" type="submit">Отправить обращение</button>
      </form>
    </Card>
  )
}

function SupportRow({ ticket, isAdmin, onUpdated }: { ticket: Awaited<ReturnType<typeof workflowService.support>>[number]; isAdmin: boolean; onUpdated: () => void }) {
  const [reply, setReply] = useState(ticket.adminReply ?? '')
  const [status, setStatus] = useState<SupportTicketStatus>(ticket.status)
  const save = async () => {
    await workflowService.updateSupport(ticket.id, status, reply)
    onUpdated()
  }
  return (
    <tr>
      <td data-label="Тема"><strong>{ticket.subject}</strong><div className="text-muted">{ticket.description}</div></td>
      <td data-label="Категория">{categoryLabel(ticket.category)}</td>
      <td data-label="Приоритет">{priorityLabel(ticket.priority)}</td>
      <td data-label="Роль">{ROLE_LABELS[ticket.createdByRole]}</td>
      <td data-label="Статус">{isAdmin ? <select className="select" value={status} onChange={(e) => setStatus(e.target.value as SupportTicketStatus)}>{Object.entries(STATUS_LABEL).filter(([k]) => k !== 'all').map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select> : STATUS_LABEL[ticket.status]}</td>
      <td data-label="Ответ">{isAdmin ? <div className="action-stack"><input className="input" value={reply} onChange={(e) => setReply(e.target.value)} /><button className="btn btn--ghost-blue" onClick={save}>Сохранить</button></div> : (ticket.adminReply || '—')}</td>
    </tr>
  )
}

function categoryLabel(v: string) {
  return ({ data_error: 'Ошибка в данных', access_problem: 'Проблема с доступом', ui_error: 'Ошибка интерфейса', notifications_problem: 'Проблема с уведомлениями', other: 'Другое' } as Record<string, string>)[v] ?? v
}
function priorityLabel(v: string) {
  return ({ low: 'Низкий', medium: 'Средний', high: 'Высокий' } as Record<string, string>)[v] ?? v
}
