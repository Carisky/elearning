import { closeSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn, spawnSync } from 'node:child_process'
import { config as loadEnvironment } from 'dotenv'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = resolve(rootDir, '.output')
const pidFile = resolve(outputDir, 'server.pid')
const logFile = resolve(outputDir, 'server.log')
const entryFile = resolve(outputDir, 'server', 'index.mjs')
const envFile = resolve(rootDir, '.env')
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

const pause = (milliseconds) => new Promise((resolvePause) => setTimeout(resolvePause, milliseconds))

const requireEnvironment = () => {
  const result = loadEnvironment({ path: envFile, override: true, quiet: true })
  if (result.error) {
    console.error(`Missing ${envFile}. Copy .env.example to .env and set JWT_SECRET first.`)
    process.exit(1)
  }

  const missingVariables = ['DATABASE_URL', 'JWT_SECRET'].filter((name) => !process.env[name]?.trim())
  if (missingVariables.length > 0) {
    console.error(`Missing required variables in .env: ${missingVariables.join(', ')}`)
    process.exit(1)
  }

  if (process.env.JWT_SECRET === 'replace-with-a-long-random-secret') {
    console.error('Replace the example JWT_SECRET in .env before starting the production server.')
    process.exit(1)
  }
}

const readPid = () => {
  try {
    const pid = Number.parseInt(readFileSync(pidFile, 'utf8').trim(), 10)
    return Number.isInteger(pid) && pid > 0 ? pid : null
  } catch {
    return null
  }
}

const isRunning = (pid) => {
  if (!pid) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

const getRunningPid = () => {
  const pid = readPid()
  return isRunning(pid) ? pid : null
}

const runNpmScript = (name) => {
  const result = spawnSync(npmCommand, ['run', name], {
    cwd: rootDir,
    env: process.env,
    stdio: 'inherit',
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

const startServer = async () => {
  requireEnvironment()

  try {
    readFileSync(entryFile)
  } catch {
    console.error(`Build output not found at ${entryFile}. Run 'npm run server:deploy' first.`)
    process.exit(1)
  }

  const runningPid = getRunningPid()
  if (runningPid) {
    console.log(`Server already running with PID ${runningPid}`)
    return
  }

  const logDescriptor = openSync(logFile, 'a')
  const child = spawn(process.execPath, [entryFile], {
    cwd: rootDir,
    detached: true,
    env: {
      ...process.env,
      HOST: process.env.HOST || '127.0.0.1',
      PORT: process.env.PORT || '3344',
    },
    stdio: ['ignore', logDescriptor, logDescriptor],
  })
  child.unref()
  closeSync(logDescriptor)
  writeFileSync(pidFile, `${child.pid}\n`)

  await pause(1000)
  if (isRunning(child.pid)) {
    const host = process.env.HOST || '127.0.0.1'
    const port = process.env.PORT || '3344'
    console.log(`Server started with PID ${child.pid} at http://${host}:${port}`)
    console.log(`Log: ${logFile}`)
    return
  }

  console.error('Server failed to start. Last log lines:')
  try {
    const lines = readFileSync(logFile, 'utf8').trimEnd().split(/\r?\n/)
    console.error(lines.slice(-30).join('\n'))
  } catch {}
  rmSync(pidFile, { force: true })
  process.exit(1)
}

const stopServer = async () => {
  const pid = getRunningPid()
  if (!pid) {
    rmSync(pidFile, { force: true })
    console.log('No running server found.')
    return
  }

  process.kill(pid, 'SIGTERM')
  for (let attempt = 0; attempt < 50 && isRunning(pid); attempt += 1) {
    await pause(100)
  }
  if (isRunning(pid)) {
    console.error(`Server with PID ${pid} did not stop after 5 seconds.`)
    process.exit(1)
  }
  rmSync(pidFile, { force: true })
  console.log(`Stopped server with PID ${pid}`)
}

const rebuildServer = () => {
  requireEnvironment()
  runNpmScript('prisma:generate')
  runNpmScript('build')
}

const deployServer = async () => {
  requireEnvironment()
  runNpmScript('docker:up')
  runNpmScript('prisma:generate')
  runNpmScript('prisma:migrate')
  runNpmScript('build')
  await stopServer()
  await startServer()
}

const showStatus = () => {
  const pid = getRunningPid()
  console.log(pid ? `Server running with PID ${pid}` : 'Server not running.')
}

const action = process.argv[2] || 'start'

switch (action) {
  case 'start':
    await startServer()
    break
  case 'stop':
    await stopServer()
    break
  case 'restart':
    await stopServer()
    await startServer()
    break
  case 'rebuild':
    rebuildServer()
    break
  case 'deploy':
    await deployServer()
    break
  case 'status':
    showStatus()
    break
  default:
    console.error('Usage: node scripts/server.mjs {start|stop|restart|rebuild|deploy|status}')
    process.exit(1)
}
