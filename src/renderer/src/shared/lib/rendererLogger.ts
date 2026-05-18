function send(source: string, message: string): void {
  window.appLogger?.logError(source, message)
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
