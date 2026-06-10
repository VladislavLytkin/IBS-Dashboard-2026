import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ApiError } from '../api/client'
import { IconSchool } from '../components/icons'

const DEMO = [
  { role: 'Администратор', email: 'admin@school123.local', password: 'Admin_2026_Dashboard!' },
  { role: 'Директор', email: 'director@school123.local', password: 'Director_2026_IBS!' },
  { role: 'Завуч', email: 'headteacher@school123.local', password: 'Zavuch_2026_School!' },
  { role: 'Аналитик', email: 'analyst@school123.local', password: 'Analyst_2026_Data!' },
  { role: 'Учитель', email: 'teacher@school123.local', password: 'Teacher_2026_Class!' },
  { role: 'Ученик', email: 'student@school123.local', password: 'Student_2026_Profile!' },
]

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('director@school123.local')
  const [password, setPassword] = useState('Director_2026_IBS!')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось войти')
    } finally {
      setLoading(false)
    }
  }

  const useDemo = (d: (typeof DEMO)[number]) => {
    setEmail(d.email)
    setPassword(d.password)
    setError(null)
  }

  return (
    <div className="login">
      <form className="login__card" onSubmit={submit}>
        <div className="login__brand">
          <span className="sidebar__logo"><IconSchool width={26} height={26} /></span>
          <div>
            <div className="login__title">Школа №123</div>
            <div className="text-muted">Мониторинг школы — вход</div>
          </div>
        </div>

        <label className="login__field">
          <span>Email</span>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            autoComplete="username" placeholder="user@school123.local" />
        </label>

        <label className="login__field">
          <span>Пароль</span>
          <div className="login__pwd">
            <input className="input" type={show ? 'text' : 'password'} value={password}
              onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            <button type="button" className="login__toggle" onClick={() => setShow((v) => !v)}>
              {show ? 'Скрыть' : 'Показать'}
            </button>
          </div>
        </label>

        {error && <div className="login__error">{error}</div>}

        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? 'Вход…' : 'Войти'}
        </button>

        <div className="login__demo">
          <div className="text-muted" style={{ marginBottom: 8 }}>Демо-доступы (прототип):</div>
          <div className="login__demo-grid">
            {DEMO.map((d) => (
              <button type="button" key={d.email} className="login__demo-btn" onClick={() => useDemo(d)}>
                {d.role}
              </button>
            ))}
          </div>
        </div>
      </form>
    </div>
  )
}
