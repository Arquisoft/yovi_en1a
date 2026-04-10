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
  
  // Wait up to 10 seconds for EITHER the target text to appear, OR an error banner from the backend
  const targetLocator = page.getByText(text, { exact: false }).first()
  const errorLocator = page.locator('.error-message').first()

  try {
    // Elegant Playwright native OR logic (waits for whichever appears first)
    await targetLocator.or(errorLocator).waitFor({ state: 'visible', timeout: 10000 })
    
    if (await errorLocator.isVisible()) {
      const errText = await errorLocator.textContent()
      throw new Error(`CRITICAL: Expected to see '${text}', but the app threw an error banner instead: "${errText}"`)
    }
  } catch (err) {
    if (err.message.includes('CRITICAL')) throw err
    throw new Error(`Timeout after 10000ms waiting for text "${text}" to appear. (No backend error banners were found either). Details: ${err.message}`)
  }
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
  let moveCount = 0
  const maxMoves = size * size

  while (!finished) {
    // Check if the winner modal appeared
    const winnerPopup = await page.$('.winner-popup-overlay')
    if (winnerPopup) {
      const isVisible = await winnerPopup.isVisible().catch(() => false)
      if (isVisible) {
        const popupText = await winnerPopup.textContent()
        const assert = await import('assert')
        assert.ok(popupText.includes('WINS!'), `Expected popup to declare a winner (contain 'WINS!'), but got: ${popupText}`)
        finished = true
        break
      }
    }

    if (moveCount > maxMoves) {
      throw new Error(`Game did not finish after ${moveCount} moves on a size-${size} board. Possible stuck state.`)
    }

    // Find empty cells and make a move
    const emptyCells = await page.$$('button.hex-empty:not([disabled])')
    if (emptyCells.length > 0) {
      const cellCountBefore = emptyCells.length
      const targetCell = emptyCells[Math.floor(Math.random() * emptyCells.length)]

      try {
        await targetCell.click({ timeout: 2000 })
        moveCount++
      } catch (e) {
        await page.waitForTimeout(500)
        continue
      }

      // Wait for BOTH the player's move AND the bot's response to complete
      // (cell count should decrease by 2), OR the winner popup should appear
      try {
        await page.waitForFunction(
          (prevCount) => {
            const currentCount = document.querySelectorAll('button.hex-empty:not([disabled])').length
            const popup = document.querySelector('.winner-popup-overlay')
            return currentCount <= prevCount - 2 || (popup && popup.offsetHeight > 0)
          },
          cellCountBefore,
          { timeout: 30000 }
        )
      } catch (e) {
        // Timeout — either game finished or something went wrong, check on next loop
      }
    } else {
      await page.waitForTimeout(1000)
    }

    // Check for fatal backend error
    const errorAlert = await page.$$('div[style*="color: rgb(255, 68, 68)"]')
    if (errorAlert.length > 0) {
      const text = await errorAlert[0].textContent()
      throw new Error(`The App reported a fatal backend error during the game: ${text}`)
    }
  }

  // 4. Return to the Lobby natively
  await page.getByText('GO TO LOBBY', { exact: true }).click()

  // Ensure we are successfully back
  const lobbyElement = page.getByText('SELECT MODE:', { exact: false }).first()
  await lobbyElement.waitFor({ state: 'visible', timeout: 10000 })
})
