import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RegisterForm from '../RegisterForm'
import { afterEach, describe, expect, test, vi } from 'vitest'
import '@testing-library/jest-dom'

describe('RegisterForm', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  test('shows validation error when username is empty', async () => {
    render(<RegisterForm onRegisterSuccess={vi.fn()} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /lets go!/i }))
    expect(await screen.findByText(/please enter a username/i)).toBeInTheDocument()
  })

  test('submits username and displays response with game status', async () => {
    const user = userEvent.setup()
    const mockSuccess = vi.fn()

    // Mock User Service (Registration) and then Gamey Status check
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Welcome Pablo!' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
      } as Response)

    render(<RegisterForm onRegisterSuccess={mockSuccess} />)

    // Matches your label: "Whats your name?"
    await user.type(screen.getByLabelText(/whats your name\?/i), 'Pablo')
    await user.click(screen.getByRole('button', { name: /lets go!/i }))

    expect(await screen.findByText(/welcome pablo!/i)).toBeInTheDocument()
    expect(await screen.findByText(/game is ready/i)).toBeInTheDocument()

    // Check localStorage
    expect(localStorage.getItem('username')).toBe('Pablo')

    // Wait for the 1500ms setTimeout to trigger onRegisterSuccess
    await waitFor(() => {
      expect(mockSuccess).toHaveBeenCalledTimes(1)
    }, { timeout: 3000 })
  })
})