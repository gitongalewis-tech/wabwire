import { spawn } from 'node:child_process'

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const detached = process.platform !== 'win32'
const children = ['frontend', 'backend'].map(directory => spawn(npm, ['run', 'dev', '--prefix', directory], { stdio: 'inherit', detached }))
let stopping = false

function stop() {
  if (stopping) return
  stopping = true
  for (const child of children) {
    try { process.kill(detached ? -child.pid : child.pid, 'SIGTERM') } catch { child.kill('SIGTERM') }
  }
}

process.on('SIGINT', stop)
process.on('SIGTERM', stop)
for (const child of children) {
  child.on('error', error => { console.error(error.message); process.exitCode = 1; stop() })
  child.on('exit', code => { if (code && code !== 0) process.exitCode = code; stop() })
}
