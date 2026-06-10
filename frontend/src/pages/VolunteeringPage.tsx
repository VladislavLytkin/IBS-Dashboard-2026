import { useState } from 'react'
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis, LabelList,
} from 'recharts'
import {
  VOLUNTEER_EVENTS, VOLUNTEER_HOURS, VOLUNTEER_SCHOOL_DYNAMICS, VOLUNTEER_TOTAL_MONTH,
} from '../data/volunteering'
import { IconClock, IconDownload } from '../components/icons'
import { Card, MonthSelect, PageFooter } from '../components/ui'

export function VolunteeringPage() {
  const [scope, setScope] = useState<'month' | 'year'>('month')

  const totalEvents = VOLUNTEER_EVENTS.length
  const totalHours = VOLUNTEER_EVENTS.reduce((s, e) => s + e.hours, 0)
  const avgMonth = VOLUNTEER_HOURS.reduce((s, h) => s + h.month, 0) / VOLUNTEER_HOURS.length
  const avgYear = VOLUNTEER_HOURS.reduce((s, h) => s + h.year, 0) / VOLUNTEER_HOURS.length

  return (
    <div className="page">
      <div className="toolbar">
        <MonthSelect label="Период:" />
        <div className="toolbar__spacer flex" style={{ gap: 12 }}>
          <select className="select" defaultValue="Все классы">
            <option>Все классы</option>
            <option>7Б</option>
          </select>
          <button className="btn btn--ghost-blue"><IconDownload /> Экспорт в Excel</button>
        </div>
      </div>

      <div className="grid grid-2-wide">
        <Card title="Мероприятия">
          <div className="table-wrap">
            <table className="tbl tbl--compact">
              <thead>
                <tr><th>Название мероприятия</th><th className="td-num">Дата</th><th className="td-num">Часы</th></tr>
              </thead>
              <tbody>
                {VOLUNTEER_EVENTS.map((e) => (
                  <tr key={e.title}>
                    <td>{e.title}</td>
                    <td className="td-num text-muted">{e.date}</td>
                    <td className="td-num td-strong">{e.hours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex-between" style={{ marginTop: 14, fontWeight: 600 }}>
            <span>Всего мероприятий: {totalEvents}</span>
            <span>Всего часов: {totalHours}</span>
          </div>
        </Card>

        <Card title="Сумма часов по ученикам" headerRight={
          <div className="segment">
            <button className={scope === 'month' ? 'is-active' : ''} onClick={() => setScope('month')}>За месяц</button>
            <button className={scope === 'year' ? 'is-active' : ''} onClick={() => setScope('year')}>За год</button>
          </div>
        }>
          <div className="table-wrap">
            <table className="tbl tbl--compact">
              <thead>
                <tr>
                  <th>№</th><th>Ученик</th><th>Класс</th>
                  <th className="td-num">За месяц</th><th className="td-num">За год</th>
                </tr>
              </thead>
              <tbody>
                {VOLUNTEER_HOURS.map((h, i) => (
                  <tr key={h.student}>
                    <td className="text-muted">{i + 1}</td>
                    <td className="td-strong">{h.student}</td>
                    <td>{h.className}</td>
                    <td className={'td-num' + (scope === 'month' ? ' td-strong' : ' text-muted')}>{h.month}</td>
                    <td className={'td-num' + (scope === 'year' ? ' td-strong' : ' text-muted')}>{h.year}</td>
                  </tr>
                ))}
                <tr className="tbl__total">
                  <td colSpan={3}>Среднее значение</td>
                  <td className="td-num text-blue">{avgMonth.toFixed(1)}</td>
                  <td className="td-num text-blue">{avgYear.toFixed(1)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="grid grid-2-wide">
        <Card title="Динамика часов по школе">
          <div className="chart-box" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={VOLUNTEER_SCHOOL_DYNAMICS} margin={{ top: 24, right: 20, left: -10, bottom: 4 }}>
                <CartesianGrid vertical={false} stroke="#eef1f5" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} domain={[0, 250]} ticks={[0, 50, 150, 250]} />
                <Line type="monotone" dataKey="value" stroke="var(--blue)" strokeWidth={2.5}
                  dot={{ r: 4, fill: 'var(--blue)' }} activeDot={{ r: 6 }}>
                  <LabelList dataKey="value" position="top" fontSize={12} fill="#334155" />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="flex" style={{ gap: 18, height: '100%' }}>
            <span style={{ color: 'var(--blue)' }}><IconClock width={56} height={56} /></span>
            <div>
              <div className="text-muted">Всего часов за май 2024</div>
              <div style={{ fontSize: 44, fontWeight: 700, color: 'var(--blue)', lineHeight: 1.1 }}>
                {VOLUNTEER_TOTAL_MONTH}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <PageFooter />
    </div>
  )
}
