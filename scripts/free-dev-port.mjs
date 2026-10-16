#!/usr/bin/env node
/**
 * Dev-only: make a TCP port bindable before Vite / tsx start.
 *
 * Cursor + Git Bash on Windows often leave the previous node process alive after
 * the folder is closed. `netstat` from PATH is Git Bash's (no PIDs), so this
 * always uses System32 netstat/taskkill, then confirms with a real bind.
 */
import { execFileSync } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SYSTEM_PIDS = new Set([0, 4])
const DEV_RUNTIME = new Set(['node.exe', 'nodejs.exe', 'npm.exe', 'npx.exe', 'tsx.exe', 'node', 'npm', 'npx', 'tsx'])

function usageAndExit() {
  console.error('Usage: node scripts/free-dev-port.mjs <port> [--own-pid=<pid>]')
  process.exit(2)
}

function parsePort(raw) {
  const port = Number(raw)
  if (!Number.isInteger(port) || port < 1 || port > 65535) usageAndExit()
  return port
}

function parseOwnPid(argv) {
  const flag = argv.find((arg) => arg.startsWith('--own-pid='))
  if (!flag) return process.pid
  const pid = Number(flag.slice('--own-pid='.length))
  return Number.isInteger(pid) && pid > 0 ? pid : process.pid
}

function winExe(...segments) {
  return path.join(process.env.SystemRoot || 'C:\\Windows', ...segments)
}

function addressPort(localAddress) {
  const trimmed = localAddress.replace(/^\[|\]$/g, '')
  const idx = trimmed.lastIndexOf(':')
  if (idx < 0) return null
  const port = Number(trimmed.slice(idx + 1))
  return Number.isInteger(port) ? port : null
}

function pidsListeningOnPort(port) {
  const pids = new Set()

  if (process.platform === 'win32') {
    const output = execFileSync(winExe('System32', 'netstat.exe'), ['-ano'], {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 10_000,
    })

    for (const line of output.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('TCP')) continue
      const parts = trimmed.split(/\s+/)
      if (parts.length < 5) continue
      const state = String(parts[3] ?? '').toUpperCase()
      if (state !== 'LISTENING' && state !== 'ESCUCHANDO') continue
      if (addressPort(parts[1]) !== port) continue
      const pid = Number(parts[4])
      if (Number.isInteger(pid)) pids.add(pid)
    }

    return [...pids]
  }

  try {
    const output = execFileSync('lsof', ['-ti', `tcp:${port}`, '-sTCP:LISTEN'], {
      encoding: 'utf8',
      timeout: 10_000,
    }).trim()
    for (const raw of output.split(/\s+/).filter(Boolean)) {
      const pid = Number(raw)
      if (Number.isInteger(pid)) pids.add(pid)
    }
  } catch {
    // lsof exits 1 when nothing is listening.
  }

  return [...pids]
}

function processInfo(pid) {
  if (process.platform !== 'win32') return null
  try {
    const output = execFileSync(
      winExe('System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
      [
        '-NoProfile',
        '-Command',
        `$p = Get-CimInstance Win32_Process -Filter "ProcessId=${pid}"; if ($p) { '{0}|{1}' -f $p.ParentProcessId, $p.Name }`,
      ],
      { encoding: 'utf8', windowsHide: true, timeout: 8_000 },
    ).trim()
    if (!output.includes('|')) return null
    const [ppidRaw, name] = output.split('|')
    const ppid = Number(ppidRaw)
    return { ppid: Number.isInteger(ppid) ? ppid : 0, name: name || '' }
  } catch {
    return null
  }
}

function leftoverTree(listenerPid, protectedPids) {
  const chain = [listenerPid]
  let current = listenerPid

  for (let i = 0; i < 8; i++) {
    const info = processInfo(current)
    const parent = info?.ppid ?? 0
    if (!parent || SYSTEM_PIDS.has(parent) || protectedPids.has(parent)) break
    if (info?.name && !DEV_RUNTIME.has(info.name.trim().toLowerCase())) break
    chain.push(parent)
    current = parent
  }

  return chain
}

function stopPid(pid) {
  if (process.platform === 'win32') {
    try {
      execFileSync(winExe('System32', 'taskkill.exe'), ['/F', '/T', '/PID', String(pid)], {
        stdio: 'ignore',
        windowsHide: true,
        timeout: 10_000,
      })
    } catch {
      // Already gone.
    }
    return
  }

  try {
    process.kill(pid, 'SIGKILL')
  } catch {
    // Already gone.
  }
}

function canBind(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.unref()
    server.once('error', () => resolve(false))
    server.listen({ port, host }, () => {
      server.close(() => resolve(true))
    })
  })
}

async function portIsFree(port) {
  return canBind(port, '127.0.0.1')
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function freeDevPort(port, { ownPid = process.pid, log = true } = {}) {
  const protectedPids = new Set([process.pid, process.ppid, ownPid].filter((pid) => Number.isInteger(pid) && pid > 0))
  const deadline = Date.now() + 10_000

  while (Date.now() < deadline) {
    const listeners = pidsListeningOnPort(port).filter((pid) => !protectedPids.has(pid) && !SYSTEM_PIDS.has(pid))
    if (listeners.length === 0 && (await portIsFree(port))) return
    const toStop = new Set()
    for (const listener of listeners) {
      for (const pid of leftoverTree(listener, protectedPids)) {
        if (!protectedPids.has(pid) && !SYSTEM_PIDS.has(pid)) toStop.add(pid)
      }
    }

    if (toStop.size === 0) {
      await sleep(200)
      continue
    }

    for (const pid of toStop) {
      if (log) {
        const name = processInfo(pid)?.name
        console.log(`[dev] Port ${port} is in use by PID ${pid}${name ? ` (${name})` : ''} — stopping it`)
      }
      stopPid(pid)
    }

    await sleep(250)
  }

  throw new Error(`Port ${port} is still busy after trying to free it. Close the process using that port and retry.`)
}

const invokedAsScript =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))

if (invokedAsScript) {
  try {
    await freeDevPort(parsePort(process.argv[2]), { ownPid: parseOwnPid(process.argv) })
  } catch (err) {
    console.error(`[dev] ${err.message}`)
    process.exit(1)
  }
}
