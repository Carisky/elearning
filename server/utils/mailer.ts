import nodemailer from 'nodemailer'
import type { SentMessageInfo, Transporter } from 'nodemailer'
import fs from 'node:fs/promises'
import path from 'node:path'

type MailTransportMode = 'smtp' | 'console' | 'noop'

type MailAddress = {
  email: string
  name?: string
}

type MailTemplateVars = Record<string, unknown>
type MailTemplateRenderOptions = {
  vars: MailTemplateVars
  rawKeys?: string[]
}

type SendTemplateMailParams = {
  to: string
  subject: string
  template: string
  vars: MailTemplateVars
  rawKeys?: string[]
}

type SendTemplateMailResult =
  | { ok: true; skipped: false; messageId?: string }
  | { ok: true; skipped: true }

const sanitizeDisplayName = (value: string): string => value.replaceAll('"', '').trim()

const parseFrom = (raw: string): Partial<MailAddress> => {
  const value = raw.trim()
  if (!value) return {}

  const angle = value.match(/^(.*)<([^>]+)>$/)
  if (angle) {
    const name = sanitizeDisplayName(angle[1] ?? '')
    const email = (angle[2] ?? '').trim()
    return {
      email: email || undefined,
      name: name || undefined,
    }
  }

  if (value.includes('@')) return { email: value }
  return { name: sanitizeDisplayName(value) }
}

const getEnv = () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  mailTransport: process.env.MAIL_TRANSPORT,
  mailHost: process.env.MAIL_HOST ?? process.env.SMTP_HOST,
  mailPort: process.env.MAIL_PORT ?? process.env.SMTP_PORT,
  mailSecure: process.env.MAIL_SECURE ?? process.env.SMTP_SECURE,
  mailUser: process.env.MAIL_USER ?? process.env.SMTP_USER,
  mailPass: process.env.MAIL_PASS ?? process.env.SMTP_PASS,
  mailFrom: process.env.MAIL_FROM,
  mailFromName: process.env.MAIL_FROM_NAME,
  smtpFrom: process.env.SMTP_FROM,
})

const parseBool = (value: string | undefined): boolean | undefined => {
  if (!value) return undefined
  return value === '1' || value.toLowerCase() === 'true'
}

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const stringifyVar = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

const renderTemplate = (source: string, options: MailTemplateRenderOptions): string => {
  const rawKeys = new Set(options.rawKeys ?? [])
  const get = (key: string) => (key in options.vars ? options.vars[key] : undefined)

  const renderKey = (key: string, raw: boolean) => {
    const value = stringifyVar(get(key))
    return raw ? value : escapeHtml(value)
  }

  const rawPattern = /\{\{\{([a-zA-Z0-9_]+)\}\}\}/g
  const escapedPattern = /\{\{([a-zA-Z0-9_]+)\}\}/g

  const withRaw = source.replace(rawPattern, (_, key: string) => renderKey(key, true))
  return withRaw.replace(escapedPattern, (_, key: string) => renderKey(key, rawKeys.has(key)))
}

const templatePath = (template: string) =>
  path.join(process.cwd(), 'server', 'emails', 'templates', `${template}.html`)

const detectMode = (): MailTransportMode => {
  const env = getEnv()
  if (env.nodeEnv === 'test') return 'noop'
  if (env.mailTransport === 'smtp' || env.mailTransport === 'console' || env.mailTransport === 'noop') {
    return env.mailTransport
  }
  if (env.mailHost) return 'smtp'
  return 'console'
}

const buildFrom = (): MailAddress => {
  const env = getEnv()

  let name = env.mailFromName?.trim() ? env.mailFromName.trim() : undefined
  let email = env.mailFrom?.trim() ? env.mailFrom.trim() : undefined

  if (env.smtpFrom) {
    const parsed = parseFrom(env.smtpFrom)
    if (!name && parsed.name) name = parsed.name
    if (!email && parsed.email) email = parsed.email
  }

  if (!email && env.mailUser?.trim()) email = env.mailUser.trim()

  return { email: email ?? 'no-reply@localhost', name }
}

let cachedTransporter: Transporter | null | undefined
let cachedMode: MailTransportMode | null = null

const getTransporter = (): Transporter | null => {
  const mode = detectMode()
  if (cachedTransporter !== undefined && cachedMode === mode) return cachedTransporter

  cachedMode = mode

  if (mode === 'noop') {
    cachedTransporter = null
    return cachedTransporter
  }

  if (mode === 'console') {
    cachedTransporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true,
    })
    return cachedTransporter
  }

  const env = getEnv()
  const port = env.mailPort ? Number(env.mailPort) : 587
  const secure = parseBool(env.mailSecure) ?? port === 465

  cachedTransporter = nodemailer.createTransport({
    host: env.mailHost,
    port,
    secure,
    auth: env.mailUser
      ? {
          user: env.mailUser,
          pass: env.mailPass ?? '',
        }
      : undefined,
  })

  return cachedTransporter
}

const normalizeSentInfo = (info: SentMessageInfo): { messageId?: string } => {
  const anyInfo = info as unknown as { messageId?: string }
  return { messageId: anyInfo?.messageId }
}

export const sendTemplateMail = async (params: SendTemplateMailParams): Promise<SendTemplateMailResult> => {
  const transporter = getTransporter()
  if (!transporter) return { ok: true, skipped: true }

  const source = await fs.readFile(templatePath(params.template), 'utf8')
  const html = renderTemplate(source, { vars: params.vars, rawKeys: params.rawKeys })

  const from = buildFrom()
  const fromHeader = from.name ? `"${from.name}" <${from.email}>` : from.email

  const info = await transporter.sendMail({
    from: fromHeader,
    to: params.to,
    subject: params.subject,
    html,
  })

  if (detectMode() === 'console' && getEnv().nodeEnv !== 'test') {
    const output = (info as unknown as { message?: Buffer | string })?.message
    if (output) {
      console.log(typeof output === 'string' ? output : output.toString('utf8'))
    }
  }

  return { ok: true, skipped: false, ...normalizeSentInfo(info) }
}
