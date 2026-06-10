import { Card, EmptyState, PageFooter } from '../components/ui'
import { workflowService } from '../services'
import { useApi } from '../hooks/useApi'
import { ROLE_LABELS } from '../api/types'

export function ActionLogPage() {
  const { data, loading, error } = useApi(() => workflowService.actionLog(), [])
  const rows = data ?? []
  return (
    <div className="page">
      <Card title="Журнал действий">
        {loading ? <EmptyState message="Загрузка журнала…" /> : error ? <EmptyState message={error} /> : rows.length === 0 ? <EmptyState message="В журнале пока нет записей." /> : (
          <div className="table-wrap">
            <table className="tbl tbl--compact tbl--cards">
              <thead><tr><th>Дата</th><th>Роль</th><th>Тип действия</th><th>Объект</th><th>Описание</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td data-label="Дата">{new Date(r.createdAt).toLocaleString('ru-RU')}</td>
                    <td data-label="Роль">{ROLE_LABELS[r.role]}</td>
                    <td data-label="Тип">{actionLabel(r.actionType)}</td>
                    <td data-label="Объект">{r.target}</td>
                    <td data-label="Описание">{r.description}</td>
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

function actionLabel(type: string) {
  return ({
    olympiad_application_created: 'Создание олимпиады',
    olympiad_approved: 'Подтверждение олимпиады',
    olympiad_rejected: 'Отклонение олимпиады',
    academic_debt: 'Академическая задолженность',
    absence_record: 'Проставление пропуска',
    student_call: 'Вызов ученика',
    expulsion_initiated: 'Инициирование отчисления',
    support_ticket: 'Обращение в поддержку',
    role_changed: 'Изменение роли',
    user_created: 'Создание пользователя',
  } as Record<string, string>)[type] ?? type
}
