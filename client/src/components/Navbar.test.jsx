import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect } from 'vitest';
import Navbar from './Navbar';

// ─── Mocking Dependencies ────────────────────────────────────
// We mock Clerk to simulate logged-in/logged-out states
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ isSignedIn: false }),
  UserButton: () => <div data-testid="user-button" />,
  SignInButton: ({ children }) => <div>{children}</div>,
  SignOutButton: ({ children }) => <div>{children}</div>,
}));

// Mocking your custom contexts
vi.mock('../context/UserContext', () => ({
  useDbUser: () => ({ dbUser: null }),
}));

vi.mock('../context/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
}));

describe('Navbar Component', () => {
  
  it('renders the branding logo correctly', () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    // Verify the "DreamWeaver" text is visible
    expect(screen.getByText(/DreamWeaver/i)).toBeInTheDocument();
  });

  it('shows the Sign In button when the user is logged out', () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    // We expect to see the "Sign In" button
    expect(screen.getByText(/Sign In/i)).toBeInTheDocument();
  });

  it('does not show the Generate or Library links when logged out', () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    // Using queryByText (which returns null if not found)
    expect(screen.queryByText(/Generate/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Library/i)).not.toBeInTheDocument();
  });

});
