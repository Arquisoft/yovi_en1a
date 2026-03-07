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
    // Matches the error message in your LoginForm.tsx
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
    await user.type(screen.getByLabelText(/password/i), 'secret')
    await user.click(screen.getByRole('button', { name: /login/i }))

    // 1. Verify success message appears
    expect(await screen.findByText(/login successful for alice/i)).toBeInTheDocument()
    
    // 2. Wait for the 1000ms setTimeout to finish and trigger the callback
    await waitFor(() => {
      expect(mockSuccess).toHaveBeenCalledTimes(1)
    }, { timeout: 2500 }) 
  })

  test('displays server error when fetch returns non-ok', async () => {
    const user = userEvent.setup()

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid' }),
    } as Response)

    render(<LoginForm onLoginSuccess={vi.fn()} />)

    await user.type(screen.getByLabelText(/username/i), 'Bob')
    await user.type(screen.getByLabelText(/password/i), 'pw')
    await user.click(screen.getByRole('button', { name: /login/i }))

    expect(await screen.findByText(/invalid/i)).toBeInTheDocument()
  })

  test('covers network failure catch block', async () => {
    const user = userEvent.setup();
    // Simulate a total network failure
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network request failed'));

    render(<LoginForm onLoginSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText(/username/i), 'Alice');
    await user.type(screen.getByLabelText(/password/i), 'secret');
    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(await screen.findByText(/network request failed/i)).toBeInTheDocument();
  });
  
})