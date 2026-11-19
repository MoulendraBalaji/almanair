// @vitest-environment jsdom
/** Component smoke tests for the Stage 7 P1 screens. */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { config } from '@/config';
import { AppProvider } from '@/features/app/AppProvider';
import { CommunityView } from '@/features/community/CommunityView';
import { MoveView } from '@/features/move/MoveView';
import { SettingsView } from '@/features/settings/SettingsView';

vi.mock('@/infra/sw-register', () => ({ registerServiceWorker: vi.fn(() => Promise.resolve()) }));

/** Renders a screen inside the single on-device provider. */
const renderWithApp = (ui: ReactElement): ReturnType<typeof render> => render(<AppProvider>{ui}</AppProvider>);

describe('P1 screens', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders Move filters and their sourced receipts', async () => {
    renderWithApp(<MoveView />);
    await waitFor(() => {
      expect(screen.getByLabelText('Show options for')).toBeTruthy();
    });
    expect(screen.getByText('Free options first')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Show options for'), { target: { value: 'high' } });
    expect(screen.getByText('Lower-emission swaps')).toBeTruthy();
  });

  it('generates a playbook and counts local pledges', async () => {
    renderWithApp(<CommunityView />);
    await waitFor(() => {
      expect(screen.getByLabelText('Community type')).toBeTruthy();
    });
    expect(screen.getByText('Owners and steps')).toBeTruthy();
    fireEvent.click(screen.getByText("I'll try this"));
    expect(screen.getByText('Pledges kept: 1')).toBeTruthy();
  });

  it('persists a display preference on this device', async () => {
    renderWithApp(<SettingsView />);
    await waitFor(() => {
      expect(screen.getByLabelText('Theme')).toBeTruthy();
    });
    fireEvent.change(screen.getByLabelText('Theme'), { target: { value: 'dark' } });
    await waitFor(() => {
      expect(window.localStorage.getItem(config.storage.key)).toContain('"theme":"dark"');
    });
  });

  it('rejects an invalid imported plan without changing the profile', async () => {
    renderWithApp(<SettingsView />);
    await waitFor(() => {
      expect(screen.getByLabelText('Import plan')).toBeTruthy();
    });
    const file = new File(['{}'], 'plan.json', { type: 'application/json' });
    fireEvent.change(screen.getByLabelText('Import plan'), { target: { files: [file] } });
    await waitFor(() => {
      expect(screen.getByText('That file is too large or is not a valid Almanair export.')).toBeTruthy();
    });
  });

  it('deletes the stored profile after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderWithApp(<SettingsView />);
    await waitFor(() => {
      expect(screen.getByLabelText('Language')).toBeTruthy();
    });
    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'es' } });
    await waitFor(() => {
      expect(window.localStorage.getItem(config.storage.key)).toContain('"locale":"es"');
    });
    fireEvent.click(screen.getByText('Borrar todo'));
    await waitFor(() => {
      expect(window.localStorage.getItem(config.storage.key)).toContain('"locale":"en"');
    });
  });
});
