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
    render(<LoginForm />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /login/i }))
    expect(await screen.findByText(/fill out all fields/i)).toBeInTheDocument()
  })

  test('submits credentials and displays success response', async () => {
    const user = userEvent.setup()

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Login successful for Alice' }),
    } as Response)

    render(<LoginForm />)

    await user.type(screen.getByLabelText(/username/i), 'Alice')
    await user.type(screen.getByLabelText(/password/i), 'secret')
    await user.click(screen.getByRole('button', { name: /login/i }))

    expect(await screen.findByText(/login successful for alice/i)).toBeInTheDocument()
    // fields should have been cleared after success
    await waitFor(() => {
      expect(screen.getByLabelText(/username/i)).toHaveValue('')
      expect(screen.getByLabelText(/password/i)).toHaveValue('')
    })
  })

  test('displays server error when fetch returns non-ok', async () => {
    const user = userEvent.setup()

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid' }),
    } as Response)

    render(<LoginForm />)

    await user.type(screen.getByLabelText(/username/i), 'Bob')
    await user.type(screen.getByLabelText(/password/i), 'pw')
    await user.click(screen.getByRole('button', { name: /login/i }))

    expect(await screen.findByText(/invalid/i)).toBeInTheDocument()
  })
})
