// @vitest-environment jsdom
/** Component tests for the P2 field library and expanded local sharing. */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProvider } from '@/features/app/AppProvider';
import { LearnView } from '@/features/learn/LearnView';
import { TodayView } from '@/features/today/TodayView';

vi.mock('@/infra/sw-register', () => ({ registerServiceWorker: vi.fn(() => Promise.resolve()) }));

const writeText = vi.fn(() => Promise.resolve());
const print = vi.fn();

/** Renders a screen inside the single on-device provider. */
const renderWithApp = (ui: ReactElement): ReturnType<typeof render> => render(<AppProvider>{ui}</AppProvider>);

describe('P2 screens', () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window.navigator, 'clipboard', { value: { writeText }, configurable: true });
    Object.defineProperty(window, 'print', { value: print, configurable: true });
    writeText.mockClear();
    print.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('browses and filters sourced field cards locally', async () => {
    renderWithApp(<LearnView />);
    await waitFor(() => {
      expect(screen.getByLabelText('Search the library')).toBeTruthy();
    });
    expect(screen.getByText('All cards')).toBeTruthy();
    expect(screen.getByText('How Almanair reads the air')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Search the library'), { target: { value: 'cadr' } });
    await waitFor(() => {
      expect(screen.getByText('1 card')).toBeTruthy();
    });
    expect(screen.getByText('Sizing a purifier for a room')).toBeTruthy();

    fireEvent.click(screen.getByText('Clear search'));
    await waitFor(() => {
      expect(screen.getByText('All cards')).toBeTruthy();
    });
  });

  it('copies the digest and prints the current plan without a network call', async () => {
    renderWithApp(<TodayView />);
    await waitFor(() => {
      expect(screen.getByText('Take today with you')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Copy Plan Digest'));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalled();
    });
    expect(screen.getByText('Copied to clipboard')).toBeTruthy();

    fireEvent.click(screen.getByText('Copy plan with sources'));
    expect(writeText).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByText('Print plan'));
    expect(print).toHaveBeenCalled();
  });
});
