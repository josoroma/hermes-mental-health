import { describe, it, expect } from "vitest";
import {
  assertScoped,
  validatePatientId,
  PatientScopeError,
  getInvites,
  getResults,
  addInvite,
  updateInviteStatus,
} from "@/lib/data/_repository";
import type { Invite } from "@/lib/domain/_schema";
import { InviteStatus } from "@/lib/domain/_schema";
import { SEED_PATIENTS, SEED_INVITES, SEED_RESULTS } from "@/lib/data/patients";

describe("validatePatientId", () => {
  it("accepts valid IDs", () => {
    expect(validatePatientId("patient-001")).toBe(true);
    expect(validatePatientId("patient_002")).toBe(true);
    expect(validatePatientId("PATIENT")).toBe(true);
    expect(validatePatientId("a")).toBe(true);
    expect(validatePatientId("a".repeat(64))).toBe(true);
  });

  it("rejects empty string", () => {
    expect(validatePatientId("")).toBe(false);
  });

  it("rejects IDs with dots or slashes", () => {
    expect(validatePatientId("../etc")).toBe(false);
    expect(validatePatientId("patient.001")).toBe(false);
    expect(validatePatientId("patient/001")).toBe(false);
  });

  it("rejects IDs with spaces", () => {
    expect(validatePatientId("patient 001")).toBe(false);
  });

  it("rejects IDs longer than 64 chars", () => {
    expect(validatePatientId("a".repeat(65))).toBe(false);
  });
});

describe("assertScoped", () => {
  it("allows access when IDs match", () => {
    expect(() => assertScoped("patient-001", "patient-001")).not.toThrow();
  });

  it("allows access when no patient is active", () => {
    expect(() => assertScoped("patient-001", null)).not.toThrow();
  });

  it("throws PatientScopeError on cross-patient access", () => {
    expect(() => assertScoped("patient-002", "patient-001")).toThrow(
      PatientScopeError
    );
  });

  it("throws with descriptive message", () => {
    try {
      assertScoped("patient-002", "patient-001");
    } catch (e) {
      const err = e as PatientScopeError;
      expect(err.message).toContain("patient-002");
      expect(err.message).toContain("patient-001");
      expect(err.name).toBe("PatientScopeError");
    }
  });
});

describe("getInvites (scoped)", () => {
  const store = { ...SEED_INVITES };

  it("returns invites for active patient", () => {
    const invites = getInvites("patient-001", "patient-001", store);
    expect(invites.length).toBe(3);
    expect(invites[0].patientId).toBe("patient-001");
  });

  it("throws on cross-patient read", () => {
    expect(() => getInvites("patient-002", "patient-001", store)).toThrow(
      PatientScopeError
    );
  });

  it("returns empty array for patient with no invites", () => {
    const invites = getInvites("patient-999", "patient-999", store);
    expect(invites).toEqual([]);
  });
});

describe("getResults (scoped)", () => {
  const store = { ...SEED_RESULTS };

  it("returns results for active patient", () => {
    const results = getResults("patient-001", "patient-001", store);
    expect(results.length).toBe(2);
    expect(results[0].assessmentSlug).toBe("severity-depression-adult");
  });

  it("throws on cross-patient read", () => {
    expect(() => getResults("patient-002", "patient-001", store)).toThrow(
      PatientScopeError
    );
  });
});

describe("addInvite", () => {
  it("adds an invite to a patient", () => {
    const store: Record<string, Invite[]> = {};
    const invite: Invite = {
      token: "T".repeat(32),
      measureSlug: "severity-depression-adult",
      patientId: "patient-001",
      createdAt: "2026-06-20T12:00:00Z",
      status: InviteStatus.PENDING,
    };
    const next = addInvite(invite, store);
    expect(next["patient-001"]).toHaveLength(1);
    expect(next["patient-001"][0].token).toBe("T".repeat(32));
  });

  it("appends to existing invites", () => {
    let store: Record<string, Invite[]> = {};
    const invite1: Invite = {
      token: "A".repeat(32), measureSlug: "phq-9", patientId: "p1",
      createdAt: "2026-01-01T00:00:00Z", status: InviteStatus.PENDING,
    };
    const invite2: Invite = {
      token: "B".repeat(32), measureSlug: "gad-7", patientId: "p1",
      createdAt: "2026-01-02T00:00:00Z", status: InviteStatus.PENDING,
    };
    store = addInvite(invite1, store);
    store = addInvite(invite2, store);
    expect(store["p1"]).toHaveLength(2);
  });
});

describe("updateInviteStatus", () => {
  it("flips invite status to completed", () => {
    const store = { ...SEED_INVITES };
    const pendingToken = "E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0";
    const next = updateInviteStatus(pendingToken, InviteStatus.COMPLETED, store);
    const updated = next["patient-001"]?.find((i) => i.token === pendingToken);
    expect(updated?.status).toBe(InviteStatus.COMPLETED);
  });
});

describe("seed data integrity", () => {
  it("has 3 seed patients", () => {
    expect(SEED_PATIENTS.length).toBe(3);
  });

  it("all seed patients have valid IDs", () => {
    for (const p of SEED_PATIENTS) {
      expect(validatePatientId(p.id)).toBe(true);
    }
  });

  it("all seed patients have consent granted", () => {
    for (const p of SEED_PATIENTS) {
      expect(p.consentStatus).toBe("granted");
    }
  });

  it("seed results link to existing patients only", () => {
    for (const patientId of Object.keys(SEED_RESULTS)) {
      expect(SEED_PATIENTS.find((p) => p.id === patientId)).toBeDefined();
    }
  });

  it("seed invites link to existing patients only", () => {
    for (const patientId of Object.keys(SEED_INVITES)) {
      expect(SEED_PATIENTS.find((p) => p.id === patientId)).toBeDefined();
    }
  });
});

describe("scope guard lifecycle", () => {
  it("active patient switch invalidates previous scoped reads", () => {
    // Cross-patient reads are blocked
    expect(() => assertScoped("patient-002", "patient-001")).toThrow(
      PatientScopeError
    );
    // Same-patient reads are allowed
    expect(() => assertScoped("patient-001", "patient-001")).not.toThrow();
  });

  it("null active patient allows any read (no scope set)", () => {
    expect(() => assertScoped("patient-001", null)).not.toThrow();
    expect(() => assertScoped("patient-003", null)).not.toThrow();
  });

  it("empty seed results store returns empty for unknown patient", () => {
    const results = getResults("patient-999", "patient-999", {});
    expect(results).toEqual([]);
  });
});