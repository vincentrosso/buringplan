import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerSW } from 'virtual:pwa-register';
import { registerAppUpdates, setSafeToReload } from './appUpdate';

const listeners: Record<string, EventListener> = {};
const reload = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  for (const k of Object.keys(listeners)) delete listeners[k];
  reload.mockClear();
  vi.mocked(registerSW).mockClear().mockReturnValue(async () => {});
  setSafeToReload(true);

  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      addEventListener: (type: string, cb: EventListener) => {
        listeners[type] = cb;
      },
    },
  });
  vi.stubGlobal('location', { reload });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  // @ts-expect-error remove the jsdom shim
  delete navigator.serviceWorker;
});

describe('registerAppUpdates', () => {
  it('registers the service worker immediately and polls for updates', () => {
    const update = vi.fn();
    let onReg: ((url: string, r: unknown) => void) | undefined;
    vi.mocked(registerSW).mockImplementation((opts) => {
      onReg = (opts as { onRegisteredSW?: typeof onReg })?.onRegisteredSW;
      return async () => {};
    });

    registerAppUpdates();
    expect(registerSW).toHaveBeenCalledWith(expect.objectContaining({ immediate: true }));

    onReg?.('/sw.js', { update });
    vi.advanceTimersByTime(60 * 60 * 1000);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('reloads exactly once when the new worker takes control', () => {
    registerAppUpdates();
    listeners.controllerchange(new Event('controllerchange'));
    listeners.controllerchange(new Event('controllerchange'));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('holds the reload back while a drive is being tracked', () => {
    registerAppUpdates();
    setSafeToReload(false);
    listeners.controllerchange(new Event('controllerchange'));
    expect(reload).not.toHaveBeenCalled();

    setSafeToReload(true);
    listeners.controllerchange(new Event('controllerchange'));
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
