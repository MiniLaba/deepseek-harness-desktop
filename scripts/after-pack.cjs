const fs = require('node:fs')
const path = require('node:path')

/**
 * Fail the release build if npm/electron-builder drops any DeepSeek runtime
 * peer package. DeepSeek Harness currently loads these packages dynamically,
 * so static import analysis cannot reliably detect that they are required.
 */
module.exports = async function verifyDeepSeekRuntime(context) {
  const lock = JSON.parse(fs.readFileSync(path.join(context.packager.projectDir, 'package-lock.json'), 'utf8'))
  const requiredPackages = Object.keys(lock.packages?.['']?.dependencies ?? {})
    .filter(packageName => packageName.startsWith('@deepseek-ai/'))
    .sort()

  const appRoot = context.electronPlatformName === 'darwin'
    ? path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, 'Contents', 'Resources', 'app')
    : path.join(context.appOutDir, 'resources', 'app')

  const missingPackages = requiredPackages.filter(packageName =>
    !fs.existsSync(path.join(appRoot, 'node_modules', ...packageName.split('/'), 'package.json')))

  if (missingPackages.length > 0) {
    throw new Error(`Packaged DeepSeek runtime is incomplete. Missing: ${missingPackages.join(', ')}`)
  }

  console.log(`Verified ${requiredPackages.length} DeepSeek runtime peer packages in ${appRoot}`)
}
