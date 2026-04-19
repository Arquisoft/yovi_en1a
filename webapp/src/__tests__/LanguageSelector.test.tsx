import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import LanguageSelector from '../LanguageSelector';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: vi.fn(),
      language: 'en',
    },
  }),
}));

describe('LanguageSelector Component', () => {
  it('renders the language button', () => {
    render(<LanguageSelector />);
    const button = screen.getByRole('button', { name: /lbl_language/i });
    expect(button).toBeInTheDocument();
  });

  it('opens the language menu when clicked', () => {
    render(<LanguageSelector />);
    const button = screen.getByRole('button', { name: /lbl_language/i });
    
    
    fireEvent.click(button);
    
    
    const englishOption = screen.getByText('English');
    expect(englishOption).toBeInTheDocument();
  });
});