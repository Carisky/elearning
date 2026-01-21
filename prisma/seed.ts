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

const DEFAULT_HOME_PAGE_CONTENT = {
  seo: {
    title: 'E‑Learning — nowoczesna platforma szkoleń',
    description: 'Ucz się szybciej dzięki krótkim lekcjom, testom i śledzeniu postępów.',
  },
  hero: {
    eyebrow: 'Trusted partner',
    titleTop: 'Future of your',
    titleBottom: 'learning today.',
    subtitle:
      'Twórz kursy, sprzedawaj dostęp, sprawdzaj wiedzę testami i analizuj postępy — wszystko w jednym miejscu.',
    primaryCta: { label: 'Zobacz kursy', href: '/courses' },
    secondaryCta: { label: 'Kontakt', href: '/contact-us' },
    imageUrl: '/placeholders/hero-abstract.svg',
    imageAlt: 'Abstract hero image',
  },
  stats: [
    { value: '2000+', label: 'Uczniów' },
    { value: '70+', label: 'Lekcji' },
    { value: '12+', label: 'Kursów' },
  ],
  featureCards: [
    {
      icon: 'mdi-rocket-launch-outline',
      title: 'Szybki start',
      description: 'Dodaj kurs, rozdziały i testy w kilka minut w panelu admina.',
    },
    {
      icon: 'mdi-shield-check-outline',
      title: 'Dostęp i płatności',
      description: 'Sprzedawaj dostęp do kursów lub udostępniaj je za darmo.',
    },
    {
      icon: 'mdi-chart-line',
      title: 'Postępy',
      description: 'Śledź zaliczenia, wyniki i ukończenie materiałów.',
    },
  ],
  promoTiles: [
    {
      variant: 'light',
      title: 'Build the future of your learning',
      description: 'Krótki opis sekcji promocyjnej — możesz to edytować z admina.',
      icon: 'mdi-arrow-top-right',
      href: '/courses',
    },
    {
      variant: 'accent',
      title: 'We are here to help your business',
      description: 'Placeholder — podmień na copy pod Twój projekt.',
      icon: 'mdi-arrow-top-right',
      href: '/contact-us',
    },
    {
      variant: 'light',
      title: 'Helping learners thrive',
      description: 'Sekcja z CTA + mała statystyka, jak w inspiracji.',
      icon: 'mdi-arrow-top-right',
      href: '/about-us',
    },
  ],
  banners: [
    {
      title: 'Banner placeholder',
      subtitle: 'Miejsce na promocję / nowy kurs / webinar',
      imageUrl: '/placeholders/banner-1.svg',
      href: '/courses',
    },
  ],
} as const

const upsertCategory = async (prisma: PrismaClient, input: { slug: string; title: string; sortOrder?: number }) => {
  return prisma.category.upsert({
    where: { slug: input.slug },
    update: { title: input.title, sortOrder: input.sortOrder ?? 0 },
    create: { slug: input.slug, title: input.title, sortOrder: input.sortOrder ?? 0 },
    select: { id: true, slug: true, title: true },
  })
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

  await prisma.sitePage.upsert({
    where: { slug: 'home' },
    update: { content: DEFAULT_HOME_PAGE_CONTENT },
    create: { slug: 'home', content: DEFAULT_HOME_PAGE_CONTENT },
    select: { id: true },
  })

 
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
