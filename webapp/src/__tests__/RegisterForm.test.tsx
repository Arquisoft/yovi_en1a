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

  test('renders login form by default', () => {
    render(<RegisterForm onRegisterSuccess={vi.fn()} />)
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/e-mail/i)).not.toBeInTheDocument()
  })

  test('toggles to register form and back', async () => {
    const user = userEvent.setup()
    render(<RegisterForm onRegisterSuccess={vi.fn()} />)

    // Switch to register
    await user.click(screen.getByText(/don't have an account\? register here/i))
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument()

    // Switch to login
    await user.click(screen.getByText(/already have an account\? login here/i))
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
    expect(screen.queryByLabelText(/e-mail/i)).not.toBeInTheDocument()
  })

  test('shows validation error when fields are empty on login', async () => {
    const user = userEvent.setup()
    render(<RegisterForm onRegisterSuccess={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /login/i }))
    expect(await screen.findByText(/please fill in all required fields/i)).toBeInTheDocument()
  })

  test('shows validation error when email is missing on register', async () => {
    const user = userEvent.setup()
    render(<RegisterForm onRegisterSuccess={vi.fn()} />)

    await user.click(screen.getByText(/don't have an account\? register here/i))
    await user.type(screen.getByLabelText(/username/i), 'testuser')
    await user.type(screen.getByLabelText(/password/i), 'password')
    await user.click(screen.getByRole('button', { name: /register/i }))

    expect(await screen.findByText(/please provide an email address/i)).toBeInTheDocument()
  })

  test('submits login successfully', async () => {
    const user = userEvent.setup()
    const mockSuccess = vi.fn()

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    } as Response)

    render(<RegisterForm onRegisterSuccess={mockSuccess} />)

    await user.type(screen.getByLabelText(/username/i), 'Pablo')
    await user.type(screen.getByLabelText(/password/i), 'secret')
    await user.click(screen.getByRole('button', { name: /login/i }))

    await waitFor(() => {
      expect(mockSuccess).toHaveBeenCalledWith('Pablo')
    })
  })

  test('submits register successfully', async () => {
    const user = userEvent.setup()
    const mockSuccess = vi.fn()

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    } as Response)

    render(<RegisterForm onRegisterSuccess={mockSuccess} />)

    await user.click(screen.getByText(/don't have an account\? register here/i))
    await user.type(screen.getByLabelText(/e-mail/i), 'test@test.com')
    await user.type(screen.getByLabelText(/username/i), 'Pablo')
    await user.type(screen.getByLabelText(/password/i), 'secret')
    await user.click(screen.getByRole('button', { name: /register/i }))

    await waitFor(() => {
      expect(mockSuccess).toHaveBeenCalledWith('Pablo')
    })
  })

  test('handles server error with specific message', async () => {
    const user = userEvent.setup()

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'User already exists' }),
    } as Response)

    render(<RegisterForm onRegisterSuccess={vi.fn()} />)

    await user.type(screen.getByLabelText(/username/i), 'Pablo')
    await user.type(screen.getByLabelText(/password/i), 'secret')
    await user.click(screen.getByRole('button', { name: /login/i }))

    expect(await screen.findByText(/user already exists/i)).toBeInTheDocument()
  })

  test('handles server error without specific message', async () => {
    const user = userEvent.setup()

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    } as Response)

    render(<RegisterForm onRegisterSuccess={vi.fn()} />)

    await user.type(screen.getByLabelText(/username/i), 'Pablo')
    await user.type(screen.getByLabelText(/password/i), 'secret')
    await user.click(screen.getByRole('button', { name: /login/i }))

    expect(await screen.findByText(/server error occurred/i)).toBeInTheDocument()
  })

  test('handles network failure', async () => {
    const user = userEvent.setup()

    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network disconnected'))

    render(<RegisterForm onRegisterSuccess={vi.fn()} />)

    await user.type(screen.getByLabelText(/username/i), 'Pablo')
    await user.type(screen.getByLabelText(/password/i), 'secret')
    await user.click(screen.getByRole('button', { name: /login/i }))

    expect(await screen.findByText(/network error\. is the server running\?/i)).toBeInTheDocument()
  })
})