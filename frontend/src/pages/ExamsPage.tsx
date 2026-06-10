import { useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis, LabelList,
} from 'recharts'
import {
  EXAM_BELOW_THRESHOLD, EXAM_BELOW_THRESHOLD_TOTAL, EXAM_COMPARE, EXAM_CRITERIA,
  EXAM_DYNAMICS, EXAM_GRADE_GROUPS, EXAM_PERIODS, EXAM_STATS, EXAM_SUBJECTS, EXAM_TYPES,
} from '../data/exams'
import { IconInfo, IconReset, IconTrendUp } from '../components/icons'
import { Card, PageFooter } from '../components/ui'

const fmt = (n: number) => n.toFixed(1).replace('.', ',')

export function ExamsPage() {
  const [type, setType] = useState('ОГЭ')
  const [subject, setSubject] = useState('Математика')
  const [grade, setGrade] = useState('9 классы')
  const [period, setPeriod] = useState('Основной период 2024')

  const reset = () => {
    setType('ОГЭ'); setSubject('Математика'); setGrade('9 классы'); setPeriod('Основной период 2024')
  }

  return (
    <div className="page">
      <div className="toolbar">
        <FilterField label="Тип экзамена:" value={type} onChange={setType} options={EXAM_TYPES} />
        <FilterField label="Предмет:" value={subject} onChange={setSubject} options={EXAM_SUBJECTS} />
        <FilterField label="Класс:" value={grade} onChange={setGrade} options={EXAM_GRADE_GROUPS} />
        <FilterField label="Период:" value={period} onChange={setPeriod} options={EXAM_PERIODS} />
        <button className="btn toolbar__spacer" onClick={reset}><IconReset /> Сбросить фильтры</button>
      </div>

      <div className="grid grid-2-wide">
        <Card title="Средний балл по школе vs город / регион">
          <div className="legend-row">
            <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--blue)' }} /> Школа №123</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--green)' }} /> Город</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--orange)' }} /> Регион</span>
          </div>
          <div className="chart-box" style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={EXAM_COMPARE} margin={{ top: 24, right: 10, left: -16, bottom: 4 }} barGap={6}>
                <CartesianGrid vertical={false} stroke="#eef1f5" />
                <XAxis dataKey="period" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} tickLine={false} axisLine={false} />
                <Bar dataKey="school" fill="var(--blue)" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  <LabelList dataKey="school" position="top" fontSize={11} formatter={fmt} />
                </Bar>
                <Bar dataKey="city" fill="var(--green)" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  <LabelList dataKey="city" position="top" fontSize={11} formatter={fmt} />
                </Bar>
                <Bar dataKey="region" fill="var(--orange)" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  <LabelList dataKey="region" position="top" fontSize={11} formatter={fmt} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="note note--green" style={{ marginTop: 12 }}>
            <IconTrendUp width={16} height={16} />
            Динамика среднего балла школы к прошлому году: +{fmt(EXAM_STATS.yoyDelta)} балла
          </div>
        </Card>

        <Card title="Общая информация">
          <div className="stat-row">
            <StatBox label="Средний балл школы" value={fmt(EXAM_STATS.school)} color="blue" sub={`из ${EXAM_STATS.maxScore} макс. баллов`} />
            <StatBox label="Средний балл города" value={fmt(EXAM_STATS.city)} color="green" sub={`из ${EXAM_STATS.maxScore} макс. баллов`} />
            <StatBox label="Средний балл региона" value={fmt(EXAM_STATS.region)} color="orange" sub={`из ${EXAM_STATS.maxScore} макс. баллов`} />
            <StatBox label="Участников от школы" value={String(EXAM_STATS.participants)} color="purple" sub={`из ${EXAM_STATS.maxParticipants}`} />
          </div>
          <div className="info-banner" style={{ marginTop: 16 }}>
            <IconInfo width={18} height={18} />
            Минимальный порог (для получения аттестата): {EXAM_STATS.threshold} баллов
          </div>
        </Card>
      </div>

      <div className="grid grid-2-wide">
        <Card title="Результаты по критериям (в % от максимального балла)">
          <div className="table-wrap">
            <table className="tbl tbl--compact">
              <thead>
                <tr><th>Критерий</th><th>Школа №123</th><th>Город</th><th>Регион</th></tr>
              </thead>
              <tbody>
                {EXAM_CRITERIA.map((c) => (
                  <tr key={c.name}>
                    <td className="td-strong">{c.name}</td>
                    <td><MiniBar value={c.school} color="var(--blue)" /></td>
                    <td><MiniBar value={c.city} color="var(--green)" /></td>
                    <td><MiniBar value={c.region} color="var(--orange)" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="note" style={{ marginTop: 14 }}>
            <IconInfo width={16} height={16} /> Данные представлены в % от максимального первичного балла.
          </div>
        </Card>

        <Card title="Ученики с результатом ниже порога (< 8 баллов)">
          <div className="table-wrap">
            <table className="tbl tbl--compact">
              <thead>
                <tr><th>№</th><th>ФИО</th><th>Класс</th><th className="td-num">Первичный балл</th><th className="td-num">Тестовый балл</th></tr>
              </thead>
              <tbody>
                {EXAM_BELOW_THRESHOLD.map((s, i) => (
                  <tr key={s.fullName}>
                    <td className="text-muted">{i + 1}</td>
                    <td className="td-strong">{s.fullName}</td>
                    <td>{s.className}</td>
                    <td className="td-num">{s.primaryScore}</td>
                    <td className="td-num text-red">{s.testScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <a className="link-blue" style={{ display: 'inline-block', marginTop: 14 }} href="#">
            Показать всех ({EXAM_BELOW_THRESHOLD_TOTAL})
          </a>
        </Card>
      </div>

      <Card title="Динамика среднего балла школы (текущий год vs прошлый год)">
        <div className="legend-row">
          <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--blue)' }} /> 2024 год</span>
          <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--text-soft)' }} /> 2023 год</span>
        </div>
        <div className="chart-box" style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={EXAM_DYNAMICS} margin={{ top: 24, right: 24, left: -10, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke="#eef1f5" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} tickLine={false} axisLine={false} />
              <Tooltip />
              <Legend wrapperStyle={{ display: 'none' }} />
              <Line type="monotone" dataKey="previous" stroke="var(--text-soft)" strokeWidth={2} strokeDasharray="6 5" dot={{ r: 3 }} name="2023 год" />
              <Line type="monotone" dataKey="current" stroke="var(--blue)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--blue)' }} name="2024 год">
                <LabelList dataKey="current" position="top" fontSize={12} formatter={fmt} />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <PageFooter />
    </div>
  )
}

function FilterField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]
}) {
  return (
    <div className="field">
      <span className="field__label">{label}</span>
      <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function StatBox({ label, value, sub, color }: {
  label: string; value: string; sub: string; color: 'blue' | 'green' | 'orange' | 'purple'
}) {
  return (
    <div className="stat-box">
      <div className="stat-box__label">{label}</div>
      <div className={`stat-box__value stat-box__value--${color}`}>{value}</div>
      <div className="stat-box__sub">{sub}</div>
    </div>
  )
}

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="mini">
      <span className="mini__val">{value}%</span>
      <span className="mini__track"><span className="mini__fill" style={{ width: `${value}%`, background: color }} /></span>
    </div>
  )
}
