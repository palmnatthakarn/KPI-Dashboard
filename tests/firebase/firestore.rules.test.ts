import { readFile } from "node:fs/promises";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

const describeWithFirestoreEmulator = process.env.FIRESTORE_EMULATOR_HOST
  ? describe
  : describe.skip;

describeWithFirestoreEmulator("Firestore employee mapping rules", () => {
  let testEnvironment: RulesTestEnvironment;

  beforeAll(async () => {
    testEnvironment = await initializeTestEnvironment({
      projectId: "demo-dashboard-status",
      firestore: { rules: await readFile("firestore.rules", "utf8") },
    });
  });

  afterEach(async () => {
    await testEnvironment.clearFirestore();
  });

  afterAll(async () => {
    await testEnvironment.cleanup();
  });

  function anonymousDb() {
    return testEnvironment
      .authenticatedContext("anonymous-user", { provider_id: "anonymous" })
      .firestore();
  }

  function validDocument(overrides: Record<string, unknown> = {}) {
    return {
      mappings: {},
      knownNames: [],
      knownKeyers: [],
      updatedAt: Timestamp.now(),
      ...overrides,
    };
  }

  async function seedDocument(data = validDocument()) {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "settings", "employeeMappings"), data);
    });
  }

  it("allows an authenticated anonymous user to get the mapping document", async () => {
    await seedDocument();
    const snapshot = await assertSucceeds(
      getDoc(doc(anonymousDb(), "settings", "employeeMappings"))
    );

    expect(snapshot.exists()).toBe(true);
  });

  it("allows an authenticated KPI sync to create known keyers", async () => {
    const mappingDocument = doc(anonymousDb(), "settings", "employeeMappings");

    await assertSucceeds(
      setDoc(mappingDocument, {
        knownKeyers: arrayUnion("employee-a"),
        updatedAt: Timestamp.now(),
      })
    );

    const snapshot = await assertSucceeds(getDoc(mappingDocument));
    expect(snapshot.data()?.knownKeyers).toEqual(["employee-a"]);
  });

  it("allows an authenticated KPI sync to update known keyers", async () => {
    await seedDocument();
    const mappingDocument = doc(anonymousDb(), "settings", "employeeMappings");

    await assertSucceeds(
      setDoc(
        mappingDocument,
        {
          knownKeyers: arrayUnion("employee-a"),
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      )
    );

    const snapshot = await assertSucceeds(getDoc(mappingDocument));
    expect(snapshot.data()?.knownKeyers).toEqual(["employee-a"]);
  });

  it("allows the authenticated clear-all operation's full document shape", async () => {
    await seedDocument(
      validDocument({
        mappings: { "employee-a": "Employee A" },
        knownNames: ["employee-a"],
        knownKeyers: ["employee-a"],
      })
    );
    const mappingDocument = doc(anonymousDb(), "settings", "employeeMappings");

    await assertSucceeds(
      setDoc(mappingDocument, {
        mappings: {},
        knownNames: [],
        knownKeyers: [],
        updatedAt: Timestamp.now(),
      })
    );

    const snapshot = await assertSucceeds(getDoc(mappingDocument));
    expect(snapshot.data()).toMatchObject({
      mappings: {},
      knownNames: [],
      knownKeyers: [],
    });
  });

  it("rejects an unauthenticated document get", async () => {
    await seedDocument();
    const db = testEnvironment.unauthenticatedContext().firestore();

    await assertFails(getDoc(doc(db, "settings", "employeeMappings")));
  });

  it("rejects an unauthenticated document create", async () => {
    const db = testEnvironment.unauthenticatedContext().firestore();

    await assertFails(
      setDoc(doc(db, "settings", "employeeMappings"), validDocument())
    );
  });

  it("rejects an authenticated collection list", async () => {
    await seedDocument();

    await assertFails(getDocs(collection(anonymousDb(), "settings")));
  });

  it("rejects an authenticated document delete", async () => {
    await seedDocument();

    await assertFails(
      deleteDoc(doc(anonymousDb(), "settings", "employeeMappings"))
    );
  });

  it("rejects fields outside the employee mapping contract", async () => {
    const mappingDocument = doc(anonymousDb(), "settings", "employeeMappings");

    await assertFails(setDoc(mappingDocument, validDocument({ isAdmin: true })));
  });

  it.each([
    ["mappings", { mappings: [] }],
    ["knownNames", { knownNames: "employee-a" }],
    ["knownKeyers", { knownKeyers: "employee-a" }],
    ["updatedAt", { updatedAt: "now" }],
  ] satisfies Array<[string, Record<string, unknown>]>)(
    "rejects the wrong type for %s",
    async (_field, invalidValue) => {
      const mappingDocument = doc(anonymousDb(), "settings", "employeeMappings");

      await assertFails(setDoc(mappingDocument, validDocument(invalidValue)));
    }
  );

  it("rejects more than 500 known keyers", async () => {
    const mappingDocument = doc(anonymousDb(), "settings", "employeeMappings");
    const knownKeyers = Array.from(
      { length: 501 },
      (_, index) => `employee-${index}`
    );

    await assertFails(setDoc(mappingDocument, validDocument({ knownKeyers })));
  });

  // isValidEmployeeMappings applies the same `.size() <= 500` cap to
  // `mappings` and `knownNames` as it does to `knownKeyers` above — mirrored
  // here so a future edit that loosens one cap but not the others gets
  // caught.
  it("rejects more than 500 mappings entries", async () => {
    const mappingDocument = doc(anonymousDb(), "settings", "employeeMappings");
    const mappings = Object.fromEntries(
      Array.from({ length: 501 }, (_, index) => [`employee-${index}`, `Employee ${index}`])
    );

    await assertFails(setDoc(mappingDocument, validDocument({ mappings })));
  });

  it("rejects more than 500 knownNames entries", async () => {
    const mappingDocument = doc(anonymousDb(), "settings", "employeeMappings");
    const knownNames = Array.from(
      { length: 501 },
      (_, index) => `employee-${index}`
    );

    await assertFails(setDoc(mappingDocument, validDocument({ knownNames })));
  });
});
