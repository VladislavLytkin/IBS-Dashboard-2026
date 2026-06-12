import { useState } from 'react'
import type { PublicUser, Role } from '../api/types'
import { ROLES, ROLE_LABELS } from '../api/types'
import { usersService, type UserInput } from '../services'
import { ApiError } from '../api/client'
import { useApi } from '../hooks/useApi'
import { Card, EmptyState } from '../components/ui'

export function UsersPage() {
  const { data, loading, error, reload } = useApi(() => usersService.list(), [])
  const users = data ?? []
  const [form, setForm] = useState<UserInput>({ email: '', fullName: '', role: 'TEACHER', password: '' })
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const create = async () => {
    setMsg(null); setErr(null)
    try {
      await usersService.create(form)
      setForm({ email: '', fullName: '', role: 'TEACHER', password: '', classIds: [], subjects: [] })
      setMsg('Пользователь создан')
      reload()
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Ошибка создания')
    }
  }

  const changeRole = async (u: PublicUser, role: Role) => {
    try { await usersService.update(u.id, { role }); reload() } catch (e) { setErr(e instanceof ApiError ? e.message : 'Ошибка') }
  }

  const updateProfile = async (u: PublicUser, patch: Partial<UserInput>) => {
    try { await usersService.update(u.id, patch); reload() } catch (e) { setErr(e instanceof ApiError ? e.message : 'Ошибка') }
  }

  const remove = async (u: PublicUser) => {
    if (!confirm(`Удалить пользователя ${u.email}?`)) return
    try { await usersService.remove(u.id); reload() } catch (e) { setErr(e instanceof ApiError ? e.message : 'Ошибка') }
  }

  return (
    <div className="page">
      <Card title="Создать пользователя">
        <div className="form-grid">
          <label className="setting-field"><span className="field__label">Email</span>
            <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="user@school123.local" /></label>
          <label className="setting-field"><span className="field__label">ФИО</span>
            <input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></label>
          <label className="setting-field"><span className="field__label">Роль</span>
            <select className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select></label>
          <label className="setting-field"><span className="field__label">Пароль (мин. 6)</span>
            <input className="input" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
          <label className="setting-field"><span className="field__label">Классы</span>
            <input className="input" placeholder="2026-7А, 2026-8Б" value={form.classIds?.join(', ') ?? ''} onChange={(e) => setForm({ ...form, classIds: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} /></label>
          <label className="setting-field"><span className="field__label">Предметы</span>
            <input className="input" placeholder="Математика" value={form.subjects?.join(', ') ?? ''} onChange={(e) => setForm({ ...form, subjects: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} /></label>
        </div>
        <div className="flex" style={{ gap: 12, marginTop: 14 }}>
          <button className="btn-primary" onClick={create}>Создать</button>
          {msg && <span className="text-green">{msg}</span>}
          {err && <span className="text-red">{err}</span>}
        </div>
      </Card>

      <Card title="Пользователи">
        {loading ? <EmptyState message="Загрузка…" /> : error ? <EmptyState message={error} /> : users.length === 0 ? (
          <EmptyState message="Нет пользователей." />
        ) : (
          <div className="table-wrap">
            <table className="tbl tbl--compact">
              <thead><tr><th>ФИО</th><th>Email</th><th>Роль</th><th>Классы</th><th>Предметы</th><th></th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="td-strong">{u.fullName}</td>
                    <td className="text-muted">{u.email}</td>
                    <td>
                      <select className="select" value={u.role} onChange={(e) => changeRole(u, e.target.value as Role)} style={{ minWidth: 150 }}>
                        {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                    </td>
                    <td><input className="input" defaultValue={u.classIds?.join(', ') ?? ''} onBlur={(e) => updateProfile(u, { classIds: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} /></td>
                    <td><input className="input" defaultValue={u.subjects?.join(', ') ?? ''} onBlur={(e) => updateProfile(u, { subjects: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} /></td>
                    <td><button className="btn" onClick={() => remove(u)}>Удалить</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
