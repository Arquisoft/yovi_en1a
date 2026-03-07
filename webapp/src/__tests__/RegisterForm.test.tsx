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
    // Pass the required callback prop
    render(<RegisterForm onRegisterSuccess={vi.fn()} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /lets go!/i }))
    
    // Matches your error state: setError('Please enter a username.')
    expect(await screen.findByText(/please enter a username/i)).toBeInTheDocument()
  })

  test('submits username and displays response with game status', async () => {
    const user = userEvent.setup()
    const mockSuccess = vi.fn()

    // 1. Mock the User Service (Registration)
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Welcome Pablo!' }),
      } as Response)
      // 2. Mock the Gamey Service (Status check)
      .mockResolvedValueOnce({
        ok: true,
      } as Response)

    render(<RegisterForm onRegisterSuccess={mockSuccess} />)

    // Using your new label: "Whats your name?"
    await user.type(screen.getByLabelText(/whats your name\?/i), 'Pablo')
    await user.click(screen.getByRole('button', { name: /lets go!/i }))

    // Check for success message
    expect(await screen.findByText(/welcome pablo!/i)).toBeInTheDocument()
    
    // Check for game status message
    expect(await screen.findByText(/game is ready/i)).toBeInTheDocument()

    // Verify localStorage was set
    expect(localStorage.getItem('username')).toBe('Pablo')

    // Wait for the setTimeout(..., 1500) to trigger the success callback
    await waitFor(() => {
      expect(mockSuccess).toHaveBeenCalled()
    }, { timeout: 2000 })
  })
})