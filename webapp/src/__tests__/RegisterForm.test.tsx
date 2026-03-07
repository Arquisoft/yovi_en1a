import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RegisterForm from '../RegisterForm'
import { afterEach, describe, expect, test, vi } from 'vitest' 
import '@testing-library/jest-dom'

describe('RegisterForm', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('shows validation error when username is empty', async () => {
    // Pass the required prop here
    render(<RegisterForm onRegisterSuccess={vi.fn()} />)
    const user = userEvent.setup()

    await waitFor(async () => {
      await user.click(screen.getByRole('button', { name: /lets go!/i }))
      expect(screen.getByText(/please enter a username/i)).toBeInTheDocument()
    })
  })

  test('submits username and displays response', async () => {
    const user = userEvent.setup()
    const mockSuccess = vi.fn() // To track if success callback is called

    // Mock fetch for the registration call
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Hello Pablo! Welcome to the course!' }),
    } as Response)

    // Pass the mock prop here
    render(<RegisterForm onRegisterSuccess={mockSuccess} />)

    // Interaction + assertion
    await user.type(screen.getByLabelText(/whats your name\?/i), 'Pablo')
    await user.click(screen.getByRole('button', { name: /lets go!/i }))

    // Check for success message
    expect(
      await screen.findByText(/hello pablo! welcome to the course!/i)
    ).toBeInTheDocument()

    // Verify the redirect callback was triggered (after your timeout in the component)
    await waitFor(() => {
      expect(mockSuccess).toHaveBeenCalled()
    }, { timeout: 2000 }) // Giving it extra time for the 1500ms timeout in your code
  })
})