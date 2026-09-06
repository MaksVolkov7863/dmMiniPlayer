import { spawn as _spawn } from 'child_process'
import path from 'path'
import * as url from 'url'
import fs from 'fs-extra'
import { getDefinesObject } from '@apad/env-tools/lib/bundler.js'
export const __filename = url.fileURLToPath(import.meta.url)
export const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

export function spawn(...args) {
  const child = _spawn(...args, {
    env: process.env,
    shell: true,
  })
  console.log(`⚡ ${args[0]} ${args[1].join(' ')}`)
  return new Promise((res) => {
    let rs = ''
    child.on('close', () => res(rs))
    child.stderr.pipe(process.stderr)
    child.stdout.pipe(process.stdout)
    child.stdout.on('data', (data) => (rs += data.toString()))
    child.stderr.on('data', (data) => (rs += data.toString()))
    process.stdin.pipe(child.stdin)
  })
}

export function spawnWithoutLog(...args) {
  const child = _spawn(...args, {
    env: process.env,
    shell: true,
  })

  return new Promise((res) => {
    let rs = ''
    child.on('close', () => res(rs))
    child.stdout.on('data', (data) => (rs += data.toString()))
    child.stderr.on('data', (data) => (rs += data.toString()))
  })
}

export function pr(...args) {
  return path.resolve(__dirname, ...args).replaceAll('\\', '/')
}

export function getWebAccessibleResources(outDir) {
  const resources = []
  for (const name of fs.readdirSync(outDir)) {
    if (name === 'manifest.json') continue
    const full = path.join(outDir, name)
    if (fs.statSync(full).isDirectory()) {
      resources.push(`${name}/*`, `${name}/**/*`)
    } else {
      resources.push(name)
    }
  }
  return [
    {
      resources,
      matches: ['<all_urls>'],
    },
    {
      resources: ['assets/icon.png', 'assets/*', 'assets/lib/*', 'lib/*'],
      matches: ['<all_urls>'],
    },
  ]
}

export function copyExtensionStaticFiles(outDir) {
  const locales = fs.readdirSync(pr('../src/locales-ext'))
  locales.forEach((locale) => {
    if (locale === '.translated.json') return
    fs.copySync(
      pr('../src/locales-ext', locale),
      pr(outDir, `./_locales/${locale.replace('.json', '')}/messages.json`),
    )
  })
  fs.copySync(pr('../assets'), pr(outDir, './assets'))

  const protobufSrc = pr(outDir, './assets/lib/protobuf.js')
  if (fs.existsSync(protobufSrc)) {
    fs.ensureDirSync(pr(outDir, './lib'))
    fs.copySync(protobufSrc, pr(outDir, './lib/protobuf.js'))
  }
}

export function getChangeLog(ver, lang) {
  const targetFile =
    lang === 'zh' ? pr('../docs/changeLog-zh.md') : pr('../docs/changeLog.md')

  const regex = new RegExp(`## v${ver}\\s*([\\s\\S]*?)(?=## v|$)`)

  return fs.readFileSync(targetFile, 'utf-8').match(regex)?.[1].trim?.()
}

function omit(obj, key) {
  let rs = { ...obj }
  key.forEach((k) => delete rs[k])
  return rs
}

export function getDefinesConfig(
  /**@type {'prod'| 'dev'} */
  type,
  extend = {},
) {
  return omit(getDefinesObject(type, extend), ['process.env'])
}
