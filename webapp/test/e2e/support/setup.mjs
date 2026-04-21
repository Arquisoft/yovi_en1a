import { setWorldConstructor, Before, After, setDefaultTimeout } from '@cucumber/cucumber'
import { chromium, firefox, webkit } from 'playwright'

setDefaultTimeout(60_000)

class CustomWorld {
  browser = null
  page = null
}

setWorldConstructor(CustomWorld)

Before(async function () {
  // Use SHOW_UI=1 to visibly watch the playback. Otherwise, it runs blazingly fast in the background.
  const showUI = process.env.SHOW_UI === '1'
  const headless = !showUI
  const slowMo = showUI ? 800 : 0
  const devtools = false

  const browserName = process.env.BROWSER || 'chromium'
  console.log(`\nLaunching browser: ${browserName}`)
  
  const browsers = { chromium, firefox, webkit }
  const launchOptions = { headless, slowMo, devtools }
  
  if (!browsers[browserName]) {
    throw new Error(`Unsupported browser: ${browserName}. Choose chromium, firefox, or webkit.`)
  }

  this.browser = await browsers[browserName].launch(launchOptions)
  this.page = await this.browser.newPage()
  await this.page.addInitScript(() => {
    window.localStorage.setItem('i18nextLng', 'en');
  });
})

After(async function () {
  if (this.page) await this.page.close()
  if (this.browser) await this.browser.close()
})
