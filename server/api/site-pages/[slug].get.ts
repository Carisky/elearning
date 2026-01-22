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

const defaultAboutUsContent = {
  seo: {
    title: 'About us — E‑Learning',
    description: 'Who we are, what we build, and how we help learners grow.',
  },
  hero: {
    eyebrow: 'About the platform',
    title: 'We help teams learn faster',
    subtitle:
      'A modern learning platform for courses, assessments, progress tracking and monetization — built to be simple for creators and delightful for students.',
    imageUrl: '/placeholders/about-hero.svg',
    imageAlt: 'Abstract team illustration',
  },
  stats: [
    { value: '4.9/5', label: 'Average rating' },
    { value: '24/7', label: 'Self‑paced learning' },
    { value: '100%', label: 'Progress visibility' },
  ],
  sections: [
    {
      title: 'Our mission',
      body: {
        ops: [
          {
            insert:
              'Make learning practical, measurable and accessible.\n\nWe believe knowledge sticks when it is structured into short lessons, reinforced with quizzes, and supported by clear progress.\n',
          },
        ],
      },
      align: 'left',
    },
    {
      title: 'What we value',
      body: {
        ops: [
          {
            insert:
              'Clarity over complexity.\nQuality over quantity.\nIteration over perfection.\n\nWe ship improvements continuously and keep the platform easy to use.\n',
          },
        ],
      },
      align: 'right',
    },
  ],
  values: [
    {
      icon: 'mdi-compass-outline',
      title: 'Clear learning paths',
      description: 'Courses are structured, progress is visible, and next steps are obvious.',
    },
    {
      icon: 'mdi-check-decagram-outline',
      title: 'Built‑in assessment',
      description: 'Quizzes and exams make learning measurable and actionable.',
    },
    {
      icon: 'mdi-speedometer',
      title: 'Fast and focused',
      description: 'Short lessons, quick feedback, and a clean interface keep learners engaged.',
    },
  ],
  team: {
    title: 'Small team, big focus',
    subtitle: 'We are builders who care about learning outcomes.',
    members: [
      { name: 'Alex', role: 'Product', bio: 'Turns ideas into simple flows and sharp UX.' },
      { name: 'Sam', role: 'Engineering', bio: 'Builds reliable systems and fast pages.' },
      { name: 'Taylor', role: 'Content', bio: 'Crafts lessons that are clear, useful, and testable.' },
    ],
  },
  faq: {
    title: 'FAQ',
    items: [
      { q: 'Can I edit this page from the admin panel?', a: 'Yes — this page content is editable in Admin → About us.' },
      { q: 'Do you support rich text?', a: 'Yes — the long sections use a rich text editor.' },
      { q: 'Where is this stored?', a: 'In the database as a SitePage record with slug \"about-us\".' },
    ],
  },
  cta: {
    title: 'Ready to learn?',
    subtitle: 'Explore courses and start your journey today.',
    primaryCta: { label: 'Browse courses', href: '/courses' },
    secondaryCta: { label: 'Contact us', href: '/contact-us' },
  },
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
      content: slug === 'home' ? defaultHomeContent : slug === 'about-us' ? defaultAboutUsContent : null,
    }
  }

  return page
})
