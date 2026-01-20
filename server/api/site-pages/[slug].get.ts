import { createError, getRouterParam } from 'h3'
import { prisma } from '../../utils/db'

const defaultHomeContent = {
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

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing slug' })
  }

  const page = await prisma.sitePage.findUnique({
    where: { slug },
    select: { slug: true, content: true },
  })

  if (!page) {
    return {
      slug,
      content: slug === 'home' ? defaultHomeContent : null,
    }
  }

  return page
})

