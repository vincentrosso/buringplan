import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRegisterSW } from 'virtual:pwa-register/react';
import UpdateBanner from './UpdateBanner';

const setNeedRefresh = vi.fn();
const updateServiceWorker = vi.fn().mockResolvedValue(undefined);

function mockSW(needRefresh: boolean) {
  vi.mocked(useRegisterSW).mockReturnValue({
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [false, () => {}],
    updateServiceWorker,
  });
}

beforeEach(() => {
  setNeedRefresh.mockClear();
  updateServiceWorker.mockClear();
});

describe('UpdateBanner', () => {
  it('renders nothing when no refresh is pending', () => {
    mockSW(false);
    const { container } = render(<UpdateBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('activates the waiting worker and reloads when Reload is clicked', async () => {
    mockSW(true);
    const user = userEvent.setup();
    render(<UpdateBanner />);
    expect(screen.getByText(/new version of the app is available/i)).toBeInTheDocument();

    await user.click(screen.getByText('Reload'));
    expect(updateServiceWorker).toHaveBeenCalledWith(true);
  });

  it('dismisses without reloading when Later is clicked', async () => {
    mockSW(true);
    const user = userEvent.setup();
    render(<UpdateBanner />);

    await user.click(screen.getByText('Later'));
    expect(setNeedRefresh).toHaveBeenCalledWith(false);
    expect(updateServiceWorker).not.toHaveBeenCalled();
  });
});
