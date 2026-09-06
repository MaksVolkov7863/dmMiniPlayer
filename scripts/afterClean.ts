import fs from 'fs-extra'
import { manifest } from '../src/manifest'
import { outDir } from './shared.tsup'
import { getWebAccessibleResources, pr } from './utils.mjs'

manifest.web_accessible_resources = getWebAccessibleResources(pr(outDir))
fs.writeJSONSync(pr(outDir, './manifest.json'), manifest, { spaces: 2 })
