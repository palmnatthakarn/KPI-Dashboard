import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getTokenExpiryMs,
  isTokenExpired,
  isTokenExpiredOrExpiring,
  saveToken,
} from "./token-storage";

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, String(value));
    },
  };
}

describe("token expiry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-14T00:00:00.000Z"));
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", createMemoryStorage());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("reports the stored expiry timestamp", () => {
    const expiry = Date.now() + 60_000;
    saveToken("token", expiry);

    expect(getTokenExpiryMs()).toBe(expiry);
  });

  it("expires a token at its exact expiry time", () => {
    saveToken("token", Date.now());

    expect(isTokenExpired()).toBe(true);
  });

  it("enters the refresh window five minutes before expiry", () => {
    saveToken("token", Date.now() + 4 * 60_000);

    expect(isTokenExpired()).toBe(false);
    expect(isTokenExpiredOrExpiring()).toBe(true);
  });
});
