import { useState } from 'react'
import type { ParallelFilterValue, RiskLevel } from '../types'
import { classesService, studentsService } from '../services'
import { useFilters } from '../context/FiltersContext'
import { useApi } from '../hooks/useApi'
import { Card, EmptyState, ParallelFilter } from '../components/ui'

const RISK_BADGE: Record<RiskLevel, string> = {
  'высокий': 'badge badge--risk-high', 'средний': 'badge badge--risk-mid', 'низкий': 'badge badge--risk-low',
}

export function StudentsPage() {
  const { year } = useFilters()
  const [parallel, setParallel] = useState<ParallelFilterValue>(11)
  const [classId, setClassId] = useState<string>('')
  const grade = parallel === 'all' ? 'all' : parallel

  const classes = useApi(() => classesService.list({ year, grade }), [year, grade])
  const students = useApi(
    () => studentsService.list({ year, grade, classId: classId || undefined }),
    [year, grade, classId],
  )
  const rows = students.data ?? []

  return (
    <div className="page">
      <div className="toolbar">
        <ParallelFilter value={parallel} onChange={(v) => { setParallel(v); setClassId('') }} />
        <div className="field">
          <span className="field__label">Класс:</span>
          <select className="select" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Все классы</option>
            {(classes.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <Card title={`Ученики · ${year}`}>
        {students.loading ? <EmptyState message="Загрузка…" /> : students.error ? <EmptyState message={students.error} /> : rows.length === 0 ? (
          <EmptyState message="Нет учеников по выбранным фильтрам." />
        ) : (
          <div className="table-wrap">
            <table className="tbl tbl--compact">
              <thead>
                <tr>
                  <th>ФИО</th><th>Класс</th><th>Пол</th><th className="td-num">Ср. оценка</th>
                  <th className="td-num">Посещ. %</th><th className="td-num">Олимп.</th>
                  <th className="td-num">Активность</th><th>Риск</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id}>
                    <td className="td-strong">{s.fullName}</td>
                    <td>{s.classId.replace(/^\d+-/, '')}</td>
                    <td>{s.gender}</td>
                    <td className="td-num">{s.averageGrade.toFixed(1)}</td>
                    <td className="td-num">{s.attendanceRate.toFixed(1)}</td>
                    <td className="td-num">{s.olympiadParticipation ? `да (${s.olympiadAwards})` : '—'}</td>
                    <td className="td-num">{s.activityScore.toFixed(0)}</td>
                    <td><span className={RISK_BADGE[s.riskLevel]}>{s.riskLevel} · {s.riskScore}</span></td>
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
