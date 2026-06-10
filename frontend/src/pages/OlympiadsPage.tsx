import { useState } from 'react'
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis, LabelList,
} from 'recharts'
import type { OlympiadLevel, ParallelFilterValue } from '../types'
import { OLYMPIADS, OLYMPIADS_TOTAL, OLYMPIAD_LEVELS } from '../data/olympiads'
import {
  OLYMPIAD_DYNAMICS, OLYMPIAD_SUBJECT_RESULTS, getOlympiadRanking, getOlympiadSummary,
} from '../data/olympiadResults'
import { IconDownload, IconReset } from '../components/icons'
import {
  Card, ComparisonTable, EmptyState, Medal, PageFooter, Pagination, ParallelFilter, scoreClass,
} from '../components/ui'

const LEVEL_BADGE: Record<OlympiadLevel, string> = {
  'Всероссийская': 'badge badge--vseros',
  'Городская': 'badge badge--gorod',
  'Школьная': 'badge badge--school',
}
const AWARD_CLASS = { gold: 'award-gold', silver: 'award-silver', bronze: 'award-bronze' } as const

export function OlympiadsPage() {
  const [parallel, setParallel] = useState<ParallelFilterValue>('all')
  const [level, setLevel] = useState('Все уровни')

  const summary = getOlympiadSummary(parallel)
  const ranking = getOlympiadRanking(parallel)

  const records = OLYMPIADS.filter(
    (o) =>
      (parallel === 'all' || o.className.startsWith(String(parallel))) &&
      (level === 'Все уровни' || o.level === level),
  )

  return (
    <div className="page">
      <div className="toolbar">
        <ParallelFilter value={parallel} onChange={setParallel} />
      </div>

      <div className="grid grid-4">
        <MiniStat label="Всего участников" value={String(summary.participants)} color="blue" />
        <MiniStat label="Призёров и победителей" value={String(summary.awards)} color="green" />
        <MiniStat label="Средний олимпиадный индекс" value={`${summary.avgIndex}%`} color="purple" />
        <MiniStat
          label="Динамика за период"
          value={`${summary.deltaPct > 0 ? '+' : ''}${summary.deltaPct}%`}
          color={summary.deltaPct >= 0 ? 'green' : 'orange'}
        />
      </div>

      <div className="grid grid-2-wide">
        <Card title="Сравнение с городом и регионом (олимпиадный индекс)">
          <ComparisonTable subjectHeader="Предмет / направление" rows={OLYMPIAD_SUBJECT_RESULTS} />
          <div className="note" style={{ marginTop: 14 }}>
            Олимпиадный индекс — сводный показатель по направлению. Используются синтетические данные для прототипа.
          </div>
        </Card>

        <Card title="Рейтинг классов по олимпиадному индексу">
          {ranking.length === 0 ? (
            <EmptyState message="Для выбранной параллели нет данных." />
          ) : (
            <div className="table-wrap">
              <table className="tbl tbl--compact">
                <thead>
                  <tr>
                    <th className="td-num">Место</th>
                    <th>Класс</th>
                    <th className="td-num">Участие</th>
                    <th className="td-num">Призёры</th>
                    <th className="td-num">Индекс</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((r, i) => (
                    <tr key={r.classId}>
                      <td className="td-num"><Medal place={i + 1} /></td>
                      <td className="td-strong">{r.classId}</td>
                      <td className="td-num text-muted">{r.participationPct}%</td>
                      <td className="td-num text-muted">{r.awardPct}%</td>
                      <td className={'td-num ' + scoreClass(r.index)}>{r.index}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Card title="Динамика олимпиадного индекса школы">
        <div className="chart-box" style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={OLYMPIAD_DYNAMICS} margin={{ top: 24, right: 24, left: -10, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke="#eef1f5" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} tickLine={false} axisLine={false} />
              <Line type="monotone" dataKey="value" stroke="var(--green)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--green)' }}>
                <LabelList dataKey="value" position="top" fontSize={12} />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card
        title="Призовые места и дипломы"
        headerRight={
          <div className="flex" style={{ gap: 12 }}>
            <div className="field">
              <span className="field__label">Уровень:</span>
              <select className="select" value={level} onChange={(e) => setLevel(e.target.value)}>
                <option>Все уровни</option>
                {OLYMPIAD_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <button className="btn" onClick={() => { setParallel('all'); setLevel('Все уровни') }}>
              <IconReset /> Сбросить
            </button>
          </div>
        }
      >
        {records.length === 0 ? (
          <EmptyState message="Нет записей по выбранным фильтрам." />
        ) : (
          <>
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>№</th><th>Ученик</th><th>Класс</th><th>Уровень</th>
                    <th>Название</th><th>Предмет</th><th>Место / Диплом</th><th>Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((o) => (
                    <tr key={o.id}>
                      <td className="text-muted">{o.id}</td>
                      <td className="td-strong">{o.student}</td>
                      <td>{o.className}</td>
                      <td><span className={LEVEL_BADGE[o.level]}>{o.level}</span></td>
                      <td>{o.title}</td>
                      <td>{o.subject}</td>
                      <td className={AWARD_CLASS[o.awardKind]}>{o.award}</td>
                      <td className="text-muted">{o.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex-between" style={{ marginTop: 18 }}>
              <span className="text-muted">Показано 1–{records.length} из {OLYMPIADS_TOTAL} записей</span>
              <Pagination total={OLYMPIADS_TOTAL} />
            </div>
          </>
        )}
        <div className="flex-between" style={{ marginTop: 14 }}>
          <span />
          <button className="btn btn--ghost-blue"><IconDownload /> Скачать в Excel</button>
        </div>
      </Card>

      <PageFooter />
    </div>
  )
}

function MiniStat({ label, value, color }: {
  label: string; value: string; color: 'blue' | 'green' | 'orange' | 'purple'
}) {
  return (
    <div className="card card--pad">
      <div className="stat-box__label">{label}</div>
      <div className={`stat-box__value stat-box__value--${color}`} style={{ marginTop: 8 }}>{value}</div>
    </div>
  )
}
