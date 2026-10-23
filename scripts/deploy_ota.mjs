import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://195.209.213.115:8090'
const PB_EMAIL = process.env.PB_EMAIL || 'pumpuroom@gmail.com'
const PB_PASSWORD = process.env.PB_PASSWORD || '1vd^qF55OuM9kRO'

async function deployOta() {
  console.log('🚀 [OTA] Starting Live Update deployment...\n')

  // 1. Read package.json
  const pkgPath = path.resolve('package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  const version = pkg.version || '1.0.14'
  const changelog = process.argv[2] || `Быстрое обновление интерфейса ${version}`
  const buildNumber = Math.floor(Date.now() / 1000)

  console.log(`📦 Версия: ${version} (build: ${buildNumber})`)
  console.log(`📝 Описание: "${changelog}"\n`)

  // 2. Generate Nuxt web assets
  console.log('⚙️  Сборка веб-бандла (npm run generate)...')
  execSync('npm run generate', { stdio: 'inherit' })

  // 3. Compress dist directory into dist.zip
  const zipPath = path.resolve('dist.zip')
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath)

  console.log('\n🗜️  Упаковка веб-бандла в dist.zip...')
  // PowerShell Compress-Archive puts files inside dist\* directly at root of archive
  execSync(`powershell -Command "Compress-Archive -Path dist\\* -DestinationPath dist.zip -Force"`, { stdio: 'inherit' })

  const zipSize = fs.statSync(zipPath).size
  console.log(`✅ Размер OTA-пакета: ${(zipSize / (1024 * 1024)).toFixed(2)} МБ (вместо 35 МБ APK!)\n`)

  // 4. Authenticate as Superuser in PocketBase
  console.log(`🔑 Авторизация в PocketBase (${POCKETBASE_URL})...`)
  const authRes = await fetch(`${POCKETBASE_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASSWORD })
  })

  if (!authRes.ok) {
    throw new Error(`Ошибка авторизации в PocketBase: ${authRes.status} ${authRes.statusText}`)
  }
  const { token } = await authRes.json()

  // 5. Upload record to app_updates
  console.log('📡 Отправка OTA-пакета на сервер PocketBase...')
  const fileBuffer = fs.readFileSync(zipPath)
  const fileBlob = new Blob([fileBuffer], { type: 'application/zip' })

  const formData = new FormData()
  formData.append('version', version.startsWith('v') ? version : `v${version}`)
  formData.append('build_number', String(buildNumber))
  formData.append('changelog', changelog)
  formData.append('is_mandatory', 'false')
  formData.append('bundle_zip', fileBlob, 'bundle.zip')

  const uploadRes = await fetch(`${POCKETBASE_URL}/api/collections/app_updates/records`, {
    method: 'POST',
    headers: {
      'Authorization': token
    },
    body: formData
  })

  // 6. Cleanup local zip
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath)

  if (!uploadRes.ok) {
    const errData = await uploadRes.json()
    throw new Error(`Ошибка загрузки обновления в PocketBase: ${JSON.stringify(errData)}`)
  }

  const result = await uploadRes.json()
  console.log('\n🎉 [УСПЕХ] Live-обновление успешно опубликовано!')
  console.log(`🔗 ID записи: ${result.id}`)
  console.log(`📱 Пользователи приложения получат обновление автоматически при следующем запуске без переустановки APK!\n`)
}

deployOta().catch((err) => {
  console.error('\n❌ Ошибка развертывания OTA:', err.message)
  process.exit(1)
})
