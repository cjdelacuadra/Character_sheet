import { spawn } from 'child_process'

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

const proc = spawn('cmd', ['/c', 'npx', 'electron-vite', 'dev'], {
  env,
  stdio: 'inherit'
})

proc.on('exit', code => process.exit(code ?? 0))
