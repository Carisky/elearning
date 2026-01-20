import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient, UserRole } from './generated/client'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is required to seed the database')
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
})

const ADMIN_EMAIL = 'admin@example.com'
const USER_EMAIL = 'user@example.com'

const upsertCategory = async (prisma: PrismaClient, input: { slug: string; title: string; sortOrder?: number }) => {
  return prisma.category.upsert({
    where: { slug: input.slug },
    update: { title: input.title, sortOrder: input.sortOrder ?? 0 },
    create: { slug: input.slug, title: input.title, sortOrder: input.sortOrder ?? 0 },
    select: { id: true, slug: true, title: true },
  })
}

const seedCourse = async (prisma: PrismaClient, input: {
  categoryId: number
  createdById: number
  slug: string
  title: string
  priceCents: number
  currency: string
  items: Array<
    | { type: 'CHAPTER'; title: string; position: number; isRequired?: boolean; chapterContent: string }
    | {
        type: 'QUIZ' | 'EXAM'
        title: string
        position: number
        isRequired?: boolean
        minPassScore: number
        attemptsLimit?: number | null
        timeLimitSec?: number | null
        questions: Array<{
          type: 'SINGLE' | 'MULTI' | 'TEXT'
          text: string
          points: number
          position: number
          answers?: Array<{ text: string; isCorrect?: boolean; position: number }>
        }>
      }
  >
}) => {
  const course = await prisma.course.upsert({
    where: { slug: input.slug },
    update: {
      title: input.title,
      categoryId: input.categoryId,
      priceCents: input.priceCents,
      currency: input.currency,
      status: 'PUBLISHED',
      createdById: input.createdById,
    },
    create: {
      title: input.title,
      slug: input.slug,
      categoryId: input.categoryId,
      priceCents: input.priceCents,
      currency: input.currency,
      status: 'PUBLISHED',
      createdById: input.createdById,
    },
    select: { id: true, slug: true },
  })

  await prisma.courseItem.deleteMany({ where: { courseId: course.id } })

  for (const item of input.items) {
    if (item.type === 'CHAPTER') {
      await prisma.courseItem.create({
        data: {
          courseId: course.id,
          type: 'CHAPTER',
          title: item.title,
          position: item.position,
          isRequired: item.isRequired ?? true,
          chapter: { create: { contentJson: { body: item.chapterContent } } },
        },
        select: { id: true },
      })
      continue
    }

    await prisma.courseItem.create({
      data: {
        courseId: course.id,
        type: item.type,
        title: item.title,
        position: item.position,
        isRequired: item.isRequired ?? true,
        assessment: {
          create: {
            minPassScore: item.minPassScore,
            attemptsLimit: item.attemptsLimit ?? null,
            timeLimitSec: item.timeLimitSec ?? null,
            shuffleQuestions: false,
            questions: {
              create: item.questions.map((q) => ({
                type: q.type,
                text: q.text,
                points: q.points,
                position: q.position,
                answers: q.answers
                  ? {
                      create: q.answers.map((a) => ({
                        text: a.text,
                        isCorrect: Boolean(a.isCorrect),
                        position: a.position,
                      })),
                    }
                  : undefined,
              })),
            },
          },
        },
      },
      select: { id: true },
    })
  }

  return course
}

async function main() {
  const adminPassword = await bcrypt.hash('admin', 10)
  const userPassword = await bcrypt.hash('user', 10)

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { password: adminPassword, role: UserRole.ADMIN },
    create: {
      email: ADMIN_EMAIL,
      name: 'Admin',
      password: adminPassword,
      role: UserRole.ADMIN,
    },
    select: { id: true, email: true, role: true },
  })

  const user = await prisma.user.upsert({
    where: { email: USER_EMAIL },
    update: { password: userPassword, role: UserRole.USER },
    create: {
      email: USER_EMAIL,
      name: 'User',
      password: userPassword,
      role: UserRole.USER,
    },
    select: { id: true, email: true, role: true },
  })

  const categoryCustoms = await upsertCategory(prisma, { slug: 'prawo-celne', title: 'Prawo celne', sortOrder: 1 })
  const categoryBasics = await upsertCategory(prisma, { slug: 'podstawy', title: 'Podstawy', sortOrder: 2 })

  const course1 = await seedCourse(prisma, {
    categoryId: categoryCustoms.id,
    createdById: admin.id,
    slug: 'agent-celny',
    title: 'Agent celny – kurs + egzamin',
    priceCents: 19900,
    currency: 'PLN',
    items: [
      { type: 'CHAPTER', title: '1. Wprowadzenie', position: 1, chapterContent: 'Wprowadzenie do kursu.' },
      { type: 'CHAPTER', title: '2. Podstawy prawa celnego', position: 2, chapterContent: 'Najważniejsze pojęcia.' },
      {
        type: 'QUIZ',
        title: 'Test – podstawy',
        position: 3,
        minPassScore: 2,
        attemptsLimit: null,
        timeLimitSec: null,
        questions: [
          {
            type: 'SINGLE',
            text: 'Czy deklaracja celna jest dokumentem?',
            points: 1,
            position: 1,
            answers: [
              { text: 'Tak', isCorrect: true, position: 1 },
              { text: 'Nie', isCorrect: false, position: 2 },
            ],
          },
          {
            type: 'SINGLE',
            text: 'Co oznacza skrót UE?',
            points: 1,
            position: 2,
            answers: [
              { text: 'Unia Europejska', isCorrect: true, position: 1 },
              { text: 'Urzędowa Ewidencja', isCorrect: false, position: 2 },
            ],
          },
          {
            type: 'MULTI',
            text: 'Wybierz poprawne przykłady towarów (2):',
            points: 1,
            position: 3,
            answers: [
              { text: 'Elektronika', isCorrect: true, position: 1 },
              { text: 'Samochód', isCorrect: true, position: 2 },
              { text: 'Pogoda', isCorrect: false, position: 3 },
            ],
          },
        ],
      },
      {
        type: 'EXAM',
        title: 'Egzamin końcowy',
        position: 4,
        minPassScore: 3,
        attemptsLimit: 5,
        timeLimitSec: 1800,
        questions: [
          {
            type: 'SINGLE',
            text: 'Kto może składać zgłoszenie celne?',
            points: 1,
            position: 1,
            answers: [
              { text: 'Upoważniony podmiot', isCorrect: true, position: 1 },
              { text: 'Każdy przypadkowy użytkownik', isCorrect: false, position: 2 },
            ],
          },
          {
            type: 'SINGLE',
            text: 'Czy cło zawsze wynosi 0%?',
            points: 1,
            position: 2,
            answers: [
              { text: 'Nie', isCorrect: true, position: 1 },
              { text: 'Tak', isCorrect: false, position: 2 },
            ],
          },
          {
            type: 'SINGLE',
            text: 'Dokument potwierdzający pochodzenie towaru to:',
            points: 1,
            position: 3,
            answers: [
              { text: 'Świadectwo pochodzenia', isCorrect: true, position: 1 },
              { text: 'Karta biblioteczna', isCorrect: false, position: 2 },
            ],
          },
          {
            type: 'TEXT',
            text: 'Opisz krótko, co to jest odprawa celna (pytanie opisowe – bez punktów).',
            points: 0,
            position: 4,
          },
        ],
      },
    ],
  })

  const course2 = await seedCourse(prisma, {
    categoryId: categoryBasics.id,
    createdById: admin.id,
    slug: 'podstawy-e-learning',
    title: 'Podstawy E-learning',
    priceCents: 0,
    currency: 'PLN',
    items: [
      { type: 'CHAPTER', title: '1. Jak korzystać z platformy', position: 1, chapterContent: 'Klikaj Dalej, aby iść dalej.' },
      {
        type: 'QUIZ',
        title: 'Test – platforma',
        position: 2,
        minPassScore: 1,
        attemptsLimit: null,
        timeLimitSec: null,
        questions: [
          {
            type: 'SINGLE',
            text: 'Przycisk "Dalej" służy do:',
            points: 1,
            position: 1,
            answers: [
              { text: 'Przejścia do następnego elementu', isCorrect: true, position: 1 },
              { text: 'Usunięcia kursu', isCorrect: false, position: 2 },
            ],
          },
        ],
      },
    ],
  })

  const course3 = await seedCourse(prisma, {
    categoryId: categoryBasics.id,
    createdById: admin.id,
    slug: 'kurs-demo-test-egzamin',
    title: 'Kurs demo: rozdziały + test + egzamin',
    priceCents: 9900,
    currency: 'PLN',
    items: [
      { type: 'CHAPTER', title: '1. Rozdział 1', position: 1, chapterContent: 'Pierwszy rozdział – teoria.' },
      {
        type: 'QUIZ',
        title: 'Test – po rozdziale 1',
        position: 2,
        minPassScore: 1,
        attemptsLimit: null,
        timeLimitSec: null,
        questions: [
          {
            type: 'SINGLE',
            text: 'Czy przeczytałeś rozdział 1?',
            points: 1,
            position: 1,
            answers: [
              { text: 'Tak', isCorrect: true, position: 1 },
              { text: 'Nie', isCorrect: false, position: 2 },
            ],
          },
        ],
      },
      { type: 'CHAPTER', title: '2. Rozdział 2', position: 3, chapterContent: 'Drugi rozdział – praktyka.' },
      {
        type: 'EXAM',
        title: 'Egzamin końcowy',
        position: 4,
        minPassScore: 2,
        attemptsLimit: 3,
        timeLimitSec: 900,
        questions: [
          {
            type: 'SINGLE',
            text: 'Pytanie egzaminacyjne 1',
            points: 1,
            position: 1,
            answers: [
              { text: 'Odpowiedź poprawna', isCorrect: true, position: 1 },
              { text: 'Odpowiedź błędna', isCorrect: false, position: 2 },
            ],
          },
          {
            type: 'SINGLE',
            text: 'Pytanie egzaminacyjne 2',
            points: 1,
            position: 2,
            answers: [
              { text: 'Odpowiedź poprawna', isCorrect: true, position: 1 },
              { text: 'Odpowiedź błędna', isCorrect: false, position: 2 },
            ],
          },
        ],
      },
    ],
  })

  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: user.id, courseId: course1.id } },
    update: {},
    create: { userId: user.id, courseId: course1.id, source: 'MANUAL' },
    select: { id: true },
  })

  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: user.id, courseId: course2.id } },
    update: {},
    create: { userId: user.id, courseId: course2.id, source: 'FREE' },
    select: { id: true },
  })

  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: user.id, courseId: course3.id } },
    update: {},
    create: { userId: user.id, courseId: course3.id, source: 'MANUAL' },
    select: { id: true },
  })
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
