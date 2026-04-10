import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'assert'

// Generate a random suffix for each test run to ensure MongoDB doesn't throw "Username already exists"
const randomId = Math.floor(Math.random() * 100000)
const testUser = `E2EPlayer_${randomId}`
const testEmail = `e2e_${randomId}@example.com`

Given('I am on the login page', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')

  // Auto-accept any browser alerts/popups (like "Registration successful!")
  page.on('dialog', async dialog => {
    await dialog.accept()
  })

  const baseUrl = process.env.BASE_URL || 'http://localhost'
  await page.goto(baseUrl)
})

When('I fill in {string} with {string}', async function (label, value) {
  const page = this.page

  // Inject the random test data if the feature file asks for the base E2EPlayer
  if (value === 'E2EPlayer') value = testUser
  if (value === 'e2e@example.com') value = testEmail

  // For standard inputs we can identify by placeholder, id or simple text since the form has specific ids
  if (label === 'Username') {
    await page.fill('#username', value)
  } else if (label === 'Email Address') {
    await page.fill('#email', value)
  } else if (label === 'Password') {
    await page.fill('#password', value)
  }
})

When('I click {string}', async function (buttonText) {
  const page = this.page
  await page.getByText(buttonText, { exact: true }).click()
})

Then('I should see {string}', async function (text) {
  const page = this.page
  const showUI = process.env.SHOW_UI === '1'
  const slowMo = showUI ? 1200 : 0

  // Check if an error message unexpectedly appeared (e.g. from the backend)
  const errorMsg = await page.$('.error-message').catch(() => null)
  if (errorMsg && (await errorMsg.isVisible())) {
    const errText = await errorMsg.textContent()
    throw new Error(`CRITICAL: Expected to see '${text}', but the app threw an error banner instead: "${errText}"`)
  }

  const element = page.getByText(text, { exact: false }).first()
  await element.waitFor({ state: 'visible', timeout: 10000 })
})

When('I click the user profile button', async function () {
  const page = this.page
  // The profile button text contains the dynamic username, so we select it via its robust CSS class
  await page.locator('.user-profile-button').click()
})

When('I play a {string} game on size {int}', { timeout: 300000 }, async function (difficulty, size) {
  const page = this.page

  // 1. Setup the Game configuration from Lobby
  await page.getByText('PLAYER VS. COMPUTER', { exact: true }).click()
  await page.getByText(difficulty, { exact: true }).click()

  await page.waitForSelector('input[type="range"]')
  await page.$eval('input[type="range"]', (el, val) => {
    // Bypass React's controlled input hijacking
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(el, val)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }, size)

  // 2. Launch the match
  await page.getByText('PLAY', { exact: true }).click()
  await page.getByText('START GAME', { exact: true }).click()

  // 3. Keep playing randomly until the match finishes
  let finished = false
  while (!finished) {
    // Check if the winner modal appeared
    const winnerPopupExists = await page.$('.winner-popup-overlay')
    if (winnerPopupExists) {
      const isVisible = await winnerPopupExists.isVisible().catch(() => false)
      if (isVisible) {
        // Explicitly verify the winner text
        const popupText = await winnerPopupExists.textContent()
        const assert = await import('assert')
        assert.ok(popupText.includes('WINS!'), `Expected popup to declare a winner (contain 'WINS!'), but got: ${popupText}`)

        finished = true
        break
      }
    }

    // Otherwise, try to find an empty hex cell and make a turn
    const emptyCells = await page.$$('button.hex-empty:not([disabled])')
    if (emptyCells.length > 0) {
      // Pick a random valid cell so the game is dynamic
      const targetCell = emptyCells[Math.floor(Math.random() * emptyCells.length)]
      try {
        await targetCell.click({ timeout: 2000 })
      } catch (e) {
        // If it fails (e.g. state changed exactly when clicking), just ignore and loop
      }
    }

    // Check if the React app caught a backend API crash or disconnect
    // (the GameBoard will display an alert div in the sidebar with red text)
    const errorAlert = await page.$$('div[style*="color: rgb(255, 68, 68)"]')
    if (errorAlert.length > 0) {
      const text = await errorAlert[0].textContent()
      throw new Error(`The App reported a fatal backend error during the game: ${text}`)
    }

    // Wait momentarily for the rust bot to respond
    await page.waitForTimeout(300)
  }

  // 4. Return to the Lobby natively
  await page.getByText('GO TO LOBBY', { exact: true }).click()

  // Ensure we are successfully back
  const lobbyElement = page.getByText('SELECT MODE:', { exact: false }).first()
  await lobbyElement.waitFor({ state: 'visible', timeout: 10000 })
})
