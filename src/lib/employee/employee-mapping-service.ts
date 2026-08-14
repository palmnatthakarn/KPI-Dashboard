/**
 * Ported from EmployeeMappingService (employee_mapping_service.dart).
 * SharedPreferences -> localStorage, same key names and JSON shape, so no
 * migration is needed if this ever needs to read data written by a
 * WebView-hosted build of the Flutter app sharing the same origin storage.
 */
const MAPPINGS_KEY = "employee_name_mappings";
const KNOWN_NAMES_KEY = "known_employee_names";

function hasStorage(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function getAllMappings(): Record<string, string> {
  if (!hasStorage()) return {};
  try {
    const raw = window.localStorage.getItem(MAPPINGS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** Falls back to `username` itself if unmapped. */
export function getDisplayName(username: string): string {
  const mappings = getAllMappings();
  return mappings[username] ?? username;
}

/** Trims displayName; an empty trimmed value removes the mapping instead of storing "". */
export function saveMapping(username: string, displayName: string): void {
  if (!hasStorage()) return;
  const trimmed = displayName.trim();
  const mappings = getAllMappings();
  if (!trimmed) {
    delete mappings[username];
  } else {
    mappings[username] = trimmed;
  }
  window.localStorage.setItem(MAPPINGS_KEY, JSON.stringify(mappings));
}

export function removeMapping(username: string): void {
  if (!hasStorage()) return;
  const mappings = getAllMappings();
  delete mappings[username];
  window.localStorage.setItem(MAPPINGS_KEY, JSON.stringify(mappings));
}

export function getKnownEmployees(): string[] {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(KNOWN_NAMES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/** Union-merges with any existing known names and sorts, mirroring saveKnownEmployees. */
export function saveKnownEmployees(names: string[]): void {
  if (!hasStorage()) return;
  const merged = new Set([...getKnownEmployees(), ...names.filter(Boolean)]);
  const sorted = Array.from(merged).sort((a, b) => a.localeCompare(b));
  window.localStorage.setItem(KNOWN_NAMES_KEY, JSON.stringify(sorted));
}

export function clearAllEmployeeMappings(): void {
  if (!hasStorage()) return;
  window.localStorage.removeItem(MAPPINGS_KEY);
  window.localStorage.removeItem(KNOWN_NAMES_KEY);
}
