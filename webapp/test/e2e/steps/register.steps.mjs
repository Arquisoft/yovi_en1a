import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'assert'

Given('the register page is open', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')

  // Mock the login API so the test doesn't need MongoDB
  await page.route('**/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        message: 'Login successful for Alice',
        token: 'mock-jwt-token',
        username: 'Alice'
      })
    })
  })

  await page.goto('http://localhost:5173')
})

When('I enter {string} as the username and {string} as the password and submit', async function (username, password) {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  await page.fill('#username', username)
  await page.fill('#password', password)
  await page.click('.submit-button')
})

Then('I should be redirected to the lobby', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')

  // After successful login, the app navigates to ?view=lobby
  await page.waitForURL('**/view=lobby**', { timeout: 5000 })

  // Verify the lobby is rendered with the username
  await page.waitForSelector('.profile-username', { timeout: 5000 })
  const text = await page.textContent('.profile-username')
  assert.ok(text && text.includes('Alice'), `Expected lobby to show "Alice", got: "${text}"`)
})
