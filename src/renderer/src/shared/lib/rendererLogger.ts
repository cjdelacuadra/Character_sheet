function send(source: string, message: string): void {
  window.appLogger?.logError(source, message)
}

/** Persist a non-fatal error to the app log (forwarded to the main-process logger). */
export function logError(source: string, message: string, error?: unknown): void {
  const detail = error === undefined ? '' : `: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`
  send(source, message + detail)
}

export function initRendererLogger(): void {
  window.onerror = (_event, _source, _lineno, _colno, error) => {
    send('window.onerror', error?.stack ?? String(error))
    return false
  }

  window.onunhandledrejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason
    const msg = reason instanceof Error ? (reason.stack ?? String(reason)) : String(reason)
    send('unhandledRejection', msg)
  }
}
