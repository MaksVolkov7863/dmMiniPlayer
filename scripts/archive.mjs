import fs from 'fs-extra'
import { ZipArchive } from 'archiver'
import packageData from '../package.json' with { type: 'json' }
import { pr, spawn } from './utils.mjs'

const args = process.argv.slice(2)
const isSizeTest = args[0] === '--size-test'

const version = packageData.version
const getBuildName = (ver) => `chrome-mv3-prod-${ver}.zip`
const getFirefoxBuildName = (ver) => `firefox-mv3-prod-${ver}.xpi`
const getSizeTestName = (ver) => `size-test-${ver}.zip`
const codeBuildOutDir = pr('../dist')
const firefoxBuildOutDir = pr('../dist-firefox')
const zipOutDir = pr('../build')

if (!fs.existsSync(zipOutDir)) {
  fs.mkdirSync(zipOutDir)
}

const getName = () => {
  if (!isSizeTest) return getBuildName(version)
  let count = 0
  while (true) {
    const fileName = getSizeTestName(count)
    if (fs.existsSync(pr(zipOutDir, fileName))) {
      count++
      continue
    }
    return fileName
  }
}

function archiveDirectory(sourceDir, outFile) {
  const archive = new ZipArchive({
    zlib: { level: 9 },
  })
  const stream = fs.createWriteStream(outFile)
  archive.pipe(stream)
  archive.directory(sourceDir, false)
  return archive.finalize().then(
    () =>
      new Promise((resolve, reject) => {
        stream.on('close', resolve)
        stream.on('error', reject)
      }),
  )
}

function prepareFirefoxDist() {
  fs.removeSync(firefoxBuildOutDir)
  fs.copySync(codeBuildOutDir, firefoxBuildOutDir)

  const manifestPath = pr(firefoxBuildOutDir, 'manifest.json')
  const manifest = fs.readJsonSync(manifestPath)

  manifest.browser_specific_settings = {
    gecko: {
      id: 'dm-mini-player@maksvolkov7863.github.io',
      strict_min_version: '128.0',
    },
  }

  if (manifest.background?.service_worker) {
    manifest.background = {
      scripts: [manifest.background.service_worker],
      type: manifest.background.type || 'module',
    }
  }

  fs.writeJsonSync(manifestPath, manifest, { spaces: 2 })
}

async function main() {
  fs.writeFileSync(
    pr(codeBuildOutDir, './INSTALL.txt'),
    [
      'Chrome / Edge',
      '1. Unzip this archive into its own folder.',
      '2. Open chrome://extensions (or edge://extensions).',
      '3. Enable Developer mode.',
      '4. Click "Load unpacked" and select THIS folder (the one with manifest.json).',
      '5. Do not load the .xpi file in Chrome.',
      '',
      'Chrome / Edge',
      '1. Распакуйте архив в отдельную папку.',
      '2. Откройте chrome://extensions (или edge://extensions).',
      '3. Включите «Режим разработчика».',
      '4. «Загрузить распакованное расширение» и выберите ЭТУ папку (где лежит manifest.json).',
      '5. Не загружайте файл .xpi в Chrome — он только для Firefox.',
      '',
    ].join('\n'),
  )
  await archiveDirectory(codeBuildOutDir, pr(zipOutDir, getName()))

  if (!isSizeTest) {
    prepareFirefoxDist()
    await archiveDirectory(
      firefoxBuildOutDir,
      pr(zipOutDir, getFirefoxBuildName(version)),
    )
    await spawn('rm', [pr(zipOutDir, getSizeTestName('*')), '-f'])
  }
}

main()
