import { useState } from 'react'
import type { ReportType } from '../api/types'
import { reportsService, downloadBlob } from '../services'
import { ApiError } from '../api/client'
import { YEARS } from '../context/FiltersContext'
import { GRADE_LEVELS } from '../types'
import { useApi } from '../hooks/useApi'
import { IconDownload } from '../components/icons'
import { Card, EmptyState, PageFooter } from '../components/ui'

const TYPES: { value: ReportType; label: string }[] = [
  { value: 'final-rating', label: 'Итоговый рейтинг' },
  { value: 'exams', label: 'ЕГЭ / экзамены' },
  { value: 'olympiads', label: 'Олимпиады' },
  { value: 'attendance', label: 'Посещаемость' },
  { value: 'risks', label: 'Риски' },
  { value: 'full', label: 'Полный отчёт' },
]

export function ReportsPage() {
  const history = useApi(() => reportsService.history(), [])
  const [type, setType] = useState<ReportType>('full')
  const [year, setYear] = useState(2026)
  const [grade, setGrade] = useState<string>('all')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = async () => {
    setBusy(true)
    setError(null)
    try {
      const blob = await reportsService.export({ type, year, grade: grade === 'all' ? null : Number(grade) })
      downloadBlob(blob, `${type}-${year}${grade !== 'all' ? `-${grade}` : ''}.xlsx`)
      history.reload()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Ошибка генерации отчёта')
    } finally {
      setBusy(false)
    }
  }

  const download = async (id: string, fileName: string) => {
    try {
      const blob = await reportsService.download(id)
      downloadBlob(blob, fileName)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Ошибка скачивания')
    }
  }

  const rows = history.data ?? []

  return (
    <div className="page">
      <Card title="Сформировать отчёт (Excel .xlsx)">
        <div className="toolbar">
          <div className="field">
            <span className="field__label">Тип:</span>
            <select className="select" value={type} onChange={(e) => setType(e.target.value as ReportType)}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="field">
            <span className="field__label">Год:</span>
            <select className="select" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="field">
            <span className="field__label">Параллель:</span>
            <select className="select" value={grade} onChange={(e) => setGrade(e.target.value)}>
              <option value="all">Все</option>
              {GRADE_LEVELS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <button className="btn-primary toolbar__spacer" onClick={generate} disabled={busy}>
            <IconDownload width={16} height={16} /> {busy ? 'Готовим…' : 'Сформировать и скачать'}
          </button>
        </div>
        {error && <div className="login__error" style={{ marginTop: 12 }}>{error}</div>}
      </Card>

      <Card title="История отчётов">
        {history.loading ? <EmptyState message="Загрузка…" /> : history.error ? <EmptyState message={history.error} /> : rows.length === 0 ? (
          <EmptyState message="Отчёты ещё не формировались." />
        ) : (
          <div className="table-wrap">
            <table className="tbl tbl--compact">
              <thead>
                <tr><th>Тип</th><th>Год</th><th>Параллель</th><th>Статус</th><th>Создан</th><th>Кем</th><th>Файл</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="td-strong">{r.typeLabel ?? r.type}</td>
                    <td>{r.year}</td>
                    <td>{r.grade ?? 'Все'}</td>
                    <td><span className="badge badge--school">{r.status === 'done' ? 'готов' : r.status}</span></td>
                    <td className="text-muted">{new Date(r.createdAt).toLocaleString('ru-RU')}</td>
                    <td className="text-muted">{r.createdBy}</td>
                    <td>
                      <button className="btn btn--ghost-blue" onClick={() => download(r.id, r.fileName)}>
                        <IconDownload width={15} height={15} /> Скачать
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <PageFooter />
    </div>
  )
}
