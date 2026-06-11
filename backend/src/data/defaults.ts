import type { OlympiadCatalogItem, SpdEvent } from '../types'

// Стартовые справочники прототипа. Используются и в seed, и как fallback
// для уже существующей базы (store.load подставляет их при отсутствии коллекций).

const Y = new Date().getFullYear()

export const DEFAULT_OLYMPIAD_CATALOG: OlympiadCatalogItem[] = [
  { id: 'oc-1', name: 'Всероссийская олимпиада школьников', subject: 'Математика', officialWebsiteUrl: 'https://vserosolimp.edsoo.ru', createdAt: new Date(`${Y - 1}-09-01`).toISOString() },
  { id: 'oc-2', name: 'Высшая проба', subject: 'Математика', officialWebsiteUrl: 'https://olymp.hse.ru', createdAt: new Date(`${Y - 1}-09-01`).toISOString() },
  { id: 'oc-3', name: 'Физтех', subject: 'Физика', officialWebsiteUrl: 'https://olymp.mipt.ru', createdAt: new Date(`${Y - 1}-09-01`).toISOString() },
  { id: 'oc-4', name: 'Турнир Ломоносова', subject: 'Математика', officialWebsiteUrl: 'https://turlom.olimpiada.ru', createdAt: new Date(`${Y - 1}-09-01`).toISOString() },
  { id: 'oc-5', name: 'Курчатов', subject: 'Физика', officialWebsiteUrl: 'https://olimpiadakurchatov.ru', createdAt: new Date(`${Y - 1}-09-01`).toISOString() },
  { id: 'oc-6', name: 'Московская олимпиада школьников', subject: 'Информатика', officialWebsiteUrl: 'https://mos.olimpiada.ru', createdAt: new Date(`${Y - 1}-09-01`).toISOString() },
  { id: 'oc-7', name: 'Ломоносов', subject: 'Обществознание', officialWebsiteUrl: 'https://olymp.msu.ru', createdAt: new Date(`${Y - 1}-09-01`).toISOString() },
]

export const DEFAULT_SPD_EVENTS: SpdEvent[] = [
  {
    id: 'spd_1',
    title: 'Волонтёрская помощь на школьной конференции',
    type: 'Волонтёрство',
    date: `${Y - 1}-09-18`,
    hours: 4,
    organizer: 'Совет старшеклассников',
    classIds: [`${Y}-10А`, `${Y}-10Б`, `${Y}-11А`],
    status: 'approved',
  },
  {
    id: 'spd_2',
    title: 'Помощь в организации Дня открытых дверей',
    type: 'Волонтёрство',
    date: `${Y - 1}-10-05`,
    hours: 5,
    organizer: 'Администрация школы',
    classIds: [`${Y}-9А`, `${Y}-10А`, `${Y}-11Б`],
    status: 'approved',
  },
  {
    id: 'spd_3',
    title: 'Экологическая акция по сбору макулатуры',
    type: 'Социальный проект',
    date: `${Y - 1}-10-22`,
    hours: 3,
    organizer: 'Куратор СПД',
    classIds: [`${Y}-7А`, `${Y}-8Б`, `${Y}-9А`],
    status: 'approved',
  },
  {
    id: 'spd_4',
    title: 'Наставничество для младших классов',
    type: 'Наставничество',
    date: `${Y - 1}-11-12`,
    hours: 6,
    organizer: 'Учебная часть',
    classIds: [`${Y}-10А`, `${Y}-10Б`, `${Y}-11А`],
    status: 'approved',
  },
  {
    id: 'spd_5',
    title: 'Акция «Коробка храбрости» для детской больницы',
    type: 'Волонтёрство',
    date: `${Y - 1}-11-28`,
    hours: 2,
    organizer: 'Совет старшеклассников',
    classIds: [`${Y}-8А`, `${Y}-9Б`, `${Y}-11Б`],
    status: 'approved',
  },
  {
    id: 'spd_6',
    title: 'Новогодний концерт для подшефного детского сада',
    type: 'Школьное мероприятие',
    date: `${Y - 1}-12-19`,
    hours: 3,
    organizer: 'Администрация школы',
    classIds: [`${Y}-9А`, `${Y}-10А`, `${Y}-11А`, `${Y}-11Б`],
    status: 'approved',
  },
  {
    id: 'spd_7',
    title: 'Помощь приюту для животных «Тёплый дом»',
    type: 'Волонтёрство',
    date: `${Y}-02-14`,
    hours: 4,
    organizer: 'Куратор СПД',
    classIds: [`${Y}-10Б`, `${Y}-11А`, `${Y}-11Б`],
    status: 'approved',
  },
  {
    id: 'spd_8',
    title: 'Субботник и благоустройство школьного двора',
    type: 'Социальный проект',
    date: `${Y}-04-18`,
    hours: 3,
    organizer: 'Администрация школы',
    classIds: [`${Y}-7А`, `${Y}-8А`, `${Y}-9А`, `${Y}-10А`, `${Y}-11А`],
    status: 'approved',
  },
  {
    id: 'spd_9',
    title: 'Волонтёры акции «Георгиевская ленточка»',
    type: 'Волонтёрство',
    date: `${Y}-05-08`,
    hours: 5,
    organizer: 'Совет старшеклассников',
    classIds: [`${Y}-10А`, `${Y}-10Б`, `${Y}-11А`, `${Y}-11Б`],
    status: 'approved',
  },
]
