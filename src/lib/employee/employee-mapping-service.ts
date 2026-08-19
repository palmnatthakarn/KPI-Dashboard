import { signInAnonymously } from "firebase/auth";
import {
  FieldPath,
  arrayUnion,
  deleteField,
  doc,
  onSnapshot,
  runTransaction,
  setDoc,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";
import { create } from "zustand";
import { firebaseAuth, firebaseDb } from "@/lib/firebase/config";

const MAPPINGS_KEY = "employee_name_mappings";
const KNOWN_NAMES_KEY = "known_employee_names";
const MIGRATION_KEY = "employee_mappings_migrated_to_firestore_v1";
const SETTINGS_DOCUMENT = doc(firebaseDb, "settings", "employeeMappings");

type SyncStatus = "idle" | "loading" | "ready" | "error";

interface EmployeeMappingState {
  mappings: Record<string, string>;
  knownNames: string[];
  status: SyncStatus;
  error: string | null;
}

const useEmployeeMappingStore = create<EmployeeMappingState>(() => ({
  mappings: {},
  knownNames: [],
  status: "idle",
  error: null,
}));

function readLegacyMappings(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(MAPPINGS_KEY) ?? "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function readLegacyKnownNames(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KNOWN_NAMES_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function parseCloudData(data: DocumentData | undefined): Pick<EmployeeMappingState, "mappings" | "knownNames"> {
  const rawMappings = data?.mappings;
  const mappings = rawMappings && typeof rawMappings === "object" && !Array.isArray(rawMappings)
    ? Object.fromEntries(
        Object.entries(rawMappings)
          .filter((entry): entry is [string, string] => typeof entry[1] === "string")
          .map(([username, displayName]) => [username, displayName.trim()])
          .filter(([, displayName]) => Boolean(displayName))
      )
    : {};
  const knownNames = Array.isArray(data?.knownNames)
    ? Array.from(new Set(data.knownNames.map(String).filter(Boolean))).sort((a, b) => a.localeCompare(b))
    : [];
  return { mappings, knownNames };
}

async function ensureFirebaseSession(): Promise<void> {
  await firebaseAuth.authStateReady();
  if (!firebaseAuth.currentUser) await signInAnonymously(firebaseAuth);
}

async function migrateLegacyDataOnce(): Promise<void> {
  if (typeof window === "undefined" || window.localStorage.getItem(MIGRATION_KEY) === "done") return;

  const legacyMappings = readLegacyMappings();
  const legacyKnownNames = readLegacyKnownNames();

  await runTransaction(firebaseDb, async (transaction) => {
    const snapshot = await transaction.get(SETTINGS_DOCUMENT);
    const cloud = parseCloudData(snapshot.data());
    const mappings = { ...legacyMappings, ...cloud.mappings };
    const knownNames = Array.from(
      new Set([...legacyKnownNames, ...cloud.knownNames, ...Object.keys(mappings)])
    ).sort((a, b) => a.localeCompare(b));

    transaction.set(
      SETTINGS_DOCUMENT,
      { mappings, knownNames, updatedAt: new Date() },
      { merge: true }
    );
  });

  window.localStorage.setItem(MIGRATION_KEY, "done");
}

/**
 * Starts the shared Firestore listener and migrates legacy localStorage data.
 * Cloud values win when a username exists in both places, preventing an old
 * browser cache from overwriting a newer shared name.
 */
export async function startEmployeeMappingsSync(): Promise<() => void> {
  useEmployeeMappingStore.setState({ status: "loading", error: null });
  try {
    await ensureFirebaseSession();
    await migrateLegacyDataOnce();
    return onSnapshot(
      SETTINGS_DOCUMENT,
      (snapshot) => {
        useEmployeeMappingStore.setState({
          ...parseCloudData(snapshot.data()),
          status: "ready",
          error: null,
        });
      },
      (error) => {
        console.error("Unable to sync employee mappings", error);
        useEmployeeMappingStore.setState({ status: "error", error: error.message });
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to sync employee mappings";
    useEmployeeMappingStore.setState({ status: "error", error: message });
    throw error;
  }
}

export function useEmployeeMappings(): Record<string, string> {
  return useEmployeeMappingStore((state) => state.mappings);
}

export function useKnownEmployees(): string[] {
  return useEmployeeMappingStore((state) => state.knownNames);
}

export function useEmployeeMappingStatus(): Pick<EmployeeMappingState, "status" | "error"> {
  const status = useEmployeeMappingStore((state) => state.status);
  const error = useEmployeeMappingStore((state) => state.error);
  return { status, error };
}

export function getAllMappings(): Record<string, string> {
  return useEmployeeMappingStore.getState().mappings;
}

export function getKnownEmployees(): string[] {
  return useEmployeeMappingStore.getState().knownNames;
}

export function getDisplayName(username: string): string {
  return getAllMappings()[username] ?? username;
}

export async function saveMapping(username: string, displayName: string): Promise<void> {
  await ensureFirebaseSession();
  const trimmed = displayName.trim();
  if (!trimmed) return removeMapping(username);
  await setDoc(
    SETTINGS_DOCUMENT,
    { mappings: { [username]: trimmed }, knownNames: arrayUnion(username), updatedAt: new Date() },
    { merge: true }
  );
}

export async function removeMapping(username: string): Promise<void> {
  await ensureFirebaseSession();
  await updateDoc(
    SETTINGS_DOCUMENT,
    new FieldPath("mappings", username),
    deleteField(),
    "updatedAt",
    new Date()
  );
}

export async function saveKnownEmployees(names: string[]): Promise<void> {
  const uniqueNames = Array.from(new Set(names.filter(Boolean)));
  if (uniqueNames.length === 0) return;
  await ensureFirebaseSession();
  await setDoc(
    SETTINGS_DOCUMENT,
    { knownNames: arrayUnion(...uniqueNames), updatedAt: new Date() },
    { merge: true }
  );
}

export async function clearAllEmployeeMappings(): Promise<void> {
  await ensureFirebaseSession();
  await setDoc(SETTINGS_DOCUMENT, { mappings: {}, knownNames: [], updatedAt: new Date() });
}
