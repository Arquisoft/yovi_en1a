import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RegisterForm from '../RegisterForm'
import { afterEach, describe, expect, test, vi } from 'vitest'
import '@testing-library/jest-dom'

describe('RegisterForm Coverage Booster', () => {
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

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Welcome Pablo!' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
      } as Response)

    render(<RegisterForm onRegisterSuccess={mockSuccess} />)

    await user.type(screen.getByLabelText(/whats your name\?/i), 'Pablo')
    await user.click(screen.getByRole('button', { name: /lets go!/i }))

    expect(await screen.findByText(/welcome pablo!/i)).toBeInTheDocument()
    expect(await screen.findByText(/game is ready/i)).toBeInTheDocument()
    expect(localStorage.getItem('username')).toBe('Pablo')

    await waitFor(() => {
      expect(mockSuccess).toHaveBeenCalledTimes(1)
    }, { timeout: 3000 })
  })

  // COVERAGE: checkGamey fetch failure (catch block inside checkGamey)
  test('handles checkGamey network failure gracefully', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Success' }),
      } as Response)
      .mockRejectedValueOnce(new Error('Gamey Offline')); // Triggers catch in checkGamey

    render(<RegisterForm onRegisterSuccess={vi.fn()} />);
    await user.type(screen.getByLabelText(/whats your name\?/i), 'Bob');
    await user.click(screen.getByRole('button', { name: /lets go!/i }));

    expect(await screen.findByText(/game is not ready/i)).toBeInTheDocument();
  })

  // COVERAGE: handleSubmit fetch failure (main catch block)
  test('handles main registration network failure', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Server Down'));

    render(<RegisterForm onRegisterSuccess={vi.fn()} />);
    await user.type(screen.getByLabelText(/whats your name\?/i), 'Charlie');
    await user.click(screen.getByRole('button', { name: /lets go!/i }));

    expect(await screen.findByText(/server down/i)).toBeInTheDocument();
  })

  // COVERAGE: handles non-Error rejection in main catch
  test('handles non-Error rejection objects', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockRejectedValueOnce("Unknown Error String");

    render(<RegisterForm onRegisterSuccess={vi.fn()} />);
    await user.type(screen.getByLabelText(/whats your name\?/i), 'Charlie');
    await user.click(screen.getByRole('button', { name: /lets go!/i }));

    expect(await screen.findByText(/network error/i)).toBeInTheDocument();
  })

  // COVERAGE: handles server error with no error message from JSON
  test('handles server error without specific message', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({}), // No .error field
    } as Response);

    render(<RegisterForm onRegisterSuccess={vi.fn()} />);
    await user.type(screen.getByLabelText(/whats your name\?/i), 'Dave');
    await user.click(screen.getByRole('button', { name: /lets go!/i }));

    expect(await screen.findByText(/server error/i)).toBeInTheDocument();
  })

  // COVERAGE: explicitly tests the gameyStatus === 'error' branch from a non-ok response
  test('displays "not ready" when gamey service returns non-ok status', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'User created' }) })
      .mockResolvedValueOnce({ ok: false }); // status check returns 500 etc

    render(<RegisterForm onRegisterSuccess={vi.fn()} />);
    await user.type(screen.getByLabelText(/whats your name\?/i), 'Eve');
    await user.click(screen.getByRole('button', { name: /lets go!/i }));

    expect(await screen.findByText(/game is not ready/i)).toBeInTheDocument();
  });
})