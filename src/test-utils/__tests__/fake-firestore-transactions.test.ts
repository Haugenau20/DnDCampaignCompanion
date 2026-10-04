// src/test-utils/__tests__/fake-firestore-transactions.test.ts
//
// The fake is only worth its tests if it behaves like Firestore where it
// matters. These pin the behaviour measured against the emulator on
// 2026-10-04 (T081): rival transactions that read the same missing document
// do not both commit; the loser is run again and sees the winner's write.
// And plain reads and writes get no such protection.
import { createFakeFirestore, readBarrier } from "../fake-firestore-transactions";

const REF = { path: "npcs/gandalf", id: "gandalf" };

describe("fake Firestore transactions", () => {
  it("re-runs a transaction whose read changed, as the emulator does", async () => {
    const store = createFakeFirestore({ afterRead: readBarrier(2, REF.path) });
    const attempts = { a: 0, b: 0 };
    const create = (who: "a" | "b") =>
      store.runTransaction(null, async (transaction) => {
        attempts[who] += 1;
        const existing = await transaction.get(REF);
        if (existing.exists()) return "refused";
        transaction.set(REF, { author: who });
        return "created";
      });

    const results = await Promise.all([create("a"), create("b")]);

    expect(results.slice().sort()).toEqual(["created", "refused"]);
    expect(attempts.a + attempts.b).toBe(3);
    const winner = results[0] === "created" ? "a" : "b";
    expect(store.read(REF.path)).toEqual({ author: winner });
  });

  it("gives plain getDoc then setDoc no protection, as Firestore gives none", async () => {
    const store = createFakeFirestore({ afterRead: readBarrier(2, REF.path) });
    const create = async (who: string) => {
      const existing = await store.getDoc(REF);
      if (existing.exists()) return "refused";
      await store.setDoc(REF, { author: who });
      return "created";
    };

    expect(await Promise.all([create("a"), create("b")])).toEqual(["created", "created"]);
  });

  it("merges an update into the stored document, and refuses one with nothing to update", async () => {
    const store = createFakeFirestore();
    store.seed(REF.path, { name: "Gandalf", title: "The Grey" });

    await store.runTransaction(null, async (transaction) => {
      transaction.update(REF, { title: "The White" });
    });
    expect(store.read(REF.path)).toEqual({ name: "Gandalf", title: "The White" });

    const absent = { path: "npcs/saruman", id: "saruman" };
    await expect(
      store.runTransaction(null, async (transaction) => {
        transaction.update(absent, { title: "Of Many Colours" });
      })
    ).rejects.toThrow("No document to update");
    expect(store.read(absent.path)).toBeUndefined();
  });

  it("applies nothing from a transaction that throws", async () => {
    const store = createFakeFirestore();
    await expect(
      store.runTransaction(null, async (transaction) => {
        transaction.set(REF, { author: "a" });
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");
    expect(store.read(REF.path)).toBeUndefined();
  });
});
