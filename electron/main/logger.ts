import { join } from 'path'
import { appendFileSync } from 'fs'

let logPath = ''

export function initLogger(userData: string): void {
  logPath = join(userData, 'app-errors.log')

  process.on('uncaughtException', (err: Error) => {
    writeEntry('uncaughtException', err.stack ?? String(err))
  })

  process.on('unhandledRejection', (reason: unknown) => {
    const msg = reason instanceof Error ? (reason.stack ?? String(reason)) : String(reason)
    writeEntry('unhandledRejection', msg)
  })
}

export function writeEntry(source: string, message: string): void {
  if (!logPath) return
  const line = `[${new Date().toISOString()}] [${source}] ${message}\n`
  try {
    appendFileSync(logPath, line, 'utf-8')
  } catch {
    // ignore write failures — can't do much without a log path
  }
}
