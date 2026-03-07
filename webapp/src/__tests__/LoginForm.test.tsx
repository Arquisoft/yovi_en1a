import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginForm from '../LoginForm'
import { afterEach, describe, expect, test, vi } from 'vitest'
import '@testing-library/jest-dom'

describe('LoginForm', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('shows validation error when any field is missing', async () => {
    render(<LoginForm onLoginSuccess={vi.fn()} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /login/i }))
    // Updated to match the new error message in LoginForm.tsx
    expect(await screen.findByText(/please enter both username and password/i)).toBeInTheDocument()
  })

  test('submits credentials and displays success response', async () => {
    const user = userEvent.setup()
    const mockSuccess = vi.fn()

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Login successful for Alice' }),
    } as Response)

    render(<LoginForm onLoginSuccess={mockSuccess} />)

    await user.type(screen.getByLabelText(/username/i), 'Alice')
    // REMOVED: E-mail field interaction
    await user.type(screen.getByLabelText(/password/i), 'secret')
    await user.click(screen.getByRole('button', { name: /login/i }))

    expect(await screen.findByText(/login successful for alice/i)).toBeInTheDocument()
    
    await waitFor(() => {
      expect(mockSuccess).toHaveBeenCalledTimes(1)
    })

    // fields should have been cleared after success
    await waitFor(() => {
      expect(screen.getByLabelText(/username/i)).toHaveValue('')
      // REMOVED: E-mail field check
      expect(screen.getByLabelText(/password/i)).toHaveValue('')
    })
  })

  test('displays server error when fetch returns non-ok', async () => {
    const user = userEvent.setup()

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid' }),
    } as Response)

    render(<LoginForm onLoginSuccess={vi.fn()} />)

    await user.type(screen.getByLabelText(/username/i), 'Bob')
    // REMOVED: E-mail field interaction
    await user.type(screen.getByLabelText(/password/i), 'pw')
    await user.click(screen.getByRole('button', { name: /login/i }))

    expect(await screen.findByText(/invalid/i)).toBeInTheDocument()
  })
})