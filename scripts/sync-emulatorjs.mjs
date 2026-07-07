import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { basename, join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const emulatorData = join(root, 'node_modules/@emulatorjs/emulatorjs/data')
const packageRoot = join(root, 'node_modules/@emulatorjs')
const publicData = join(root, 'public/emulatorjs/data')
const publicCores = join(publicData, 'cores')
const publicReports = join(publicCores, 'reports')

if (!existsSync(emulatorData)) {
  throw new Error('Install @emulatorjs/emulatorjs before syncing assets')
}

rmSync(publicData, { force: true, recursive: true })
cpSync(emulatorData, publicData, { recursive: true })
mkdirSync(publicCores, { recursive: true })
mkdirSync(publicReports, { recursive: true })

for (const entry of readdirSync(packageRoot, { withFileTypes: true })) {
  if (!entry.isDirectory() || !entry.name.startsWith('core-')) {
    continue
  }

  const corePath = join(packageRoot, entry.name)

  for (const file of readdirSync(corePath, { withFileTypes: true })) {
    if (file.isFile() && file.name.endsWith('.data')) {
      cpSync(join(corePath, file.name), join(publicCores, file.name))
    }
  }

  const reportsPath = join(corePath, 'reports')

  if (!existsSync(reportsPath)) {
    continue
  }

  for (const report of readdirSync(reportsPath, { withFileTypes: true })) {
    if (report.isFile() && report.name.endsWith('.json')) {
      cpSync(join(reportsPath, report.name), join(publicReports, basename(report.name)))
    }
  }
}
