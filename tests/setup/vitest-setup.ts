import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Vitest doesn't inject `afterEach` onto globalThis unless `test.globals` is
// enabled (it isn't, in this repo — tests import describe/it/expect
// explicitly), so Testing Library's own auto-cleanup never registers.
// Without this, DOM nodes from one `render()` would still be attached to
// document.body when the next test's `render()` runs in the same file.
afterEach(() => {
  cleanup();
});
