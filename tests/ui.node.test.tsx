// @vitest-environment jsdom
/** Component smoke tests for the P0 client screens. */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { config } from '@/config';
import { AppProvider } from '@/features/app/AppProvider';
import { AskView } from '@/features/ask/AskView';
import { ReadingForm } from '@/features/today/ReadingForm';
import { TodayView } from '@/features/today/TodayView';

vi.mock('@/infra/sw-register', () => ({ registerServiceWorker: vi.fn(() => Promise.resolve()) }));

/** Renders a screen inside the single on-device provider. */
const renderWithApp = (ui: ReactElement): ReturnType<typeof render> => render(<AppProvider>{ui}</AppProvider>);

describe('P0 screens', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('asks for consent and honours the local-only choice', async () => {
    renderWithApp(<AskView />);
    expect(screen.getByText('Allow a chat answer?')).toBeTruthy();
    fireEvent.click(screen.getByText('Use local answers only'));
    await waitFor(() => {
      expect(screen.queryByText('Allow a chat answer?')).toBeNull();
    });
    expect(screen.getByText('Try asking')).toBeTruthy();
  });

  it('renders the derived plan on Today', async () => {
    renderWithApp(<TodayView />);
    await waitFor(() => {
      expect(screen.getByText("Today's air")).toBeTruthy();
    });
    expect(screen.getAllByText('Good').length).toBeGreaterThan(0);
  });

  it('saves a validated reading locally', async () => {
    renderWithApp(<ReadingForm />);
    fireEvent.change(screen.getByLabelText("Today's reading"), { target: { value: 'pm25' } });
    fireEvent.change(screen.getByLabelText('PM2.5 in micrograms per cubic metre'), { target: { value: '45' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => {
      expect(window.localStorage.getItem(config.storage.key)).toContain('"pm25"');
    });
  });
});
