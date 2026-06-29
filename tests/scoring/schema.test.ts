import { describe, it, expect } from "vitest";
import {
  measureSchema,
  patientSchema,
  inviteSchema,
  scoringOutputSchema,
  buildAnswerSchema,
} from "@/lib/domain/_schema";

describe("measureSchema", () => {
  it("validates a correct PHQ-9-like measure", () => {
    const phq9 = {
      slug: "severity-depression-adult",
      title: "Severity Measure for Depression—Adult",
      description: "Adapted from the PHQ-9",
      version: "1.0.0",
      instructions: "Over the last 7 days, how often...",
      resultChart: "severity_bar",
      fields: [
        {
          id: "item_1",
          label: "Little interest or pleasure in doing things",
          type: "scale",
          required: true,
          min: 0,
          max: 3,
          options: [
            { value: 0, label: "Not at all" },
            { value: 1, label: "Several days" },
            { value: 2, label: "More than half" },
            { value: 3, label: "Nearly every day" },
          ],
        },
        {
          id: "item_2",
          label: "Feeling down, depressed, or hopeless",
          type: "scale",
          required: true,
          min: 0,
          max: 3,
        },
      ],
      scoringRule: {
        calculation: "total",
        maxScale: 3,
        severityThresholds: {
          none: [0, 4],
          severe: [20, 27],
        },
        reverseScoredItems: [],
        requiredFields: ["item_1", "item_2"],
        t_score: false,
      },
    };

    const result = measureSchema.safeParse(phq9);
    expect(result.success).toBe(true);
  });

  it("rejects empty fields array", () => {
    const bad = {
      slug: "test",
      title: "Test",
      fields: [],
      scoringRule: { calculation: "total", maxScale: 3, t_score: false },
    };
    const result = measureSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("applies defaults for missing optional fields", () => {
    const minimal = {
      slug: "test",
      title: "Test",
      fields: [
        { id: "q1", label: "Q1", type: "text" },
      ],
      scoringRule: { calculation: "total", maxScale: 3, t_score: false },
    };
    const parsed = measureSchema.parse(minimal);
    expect(parsed.description).toBe("");
    expect(parsed.instructions).toBe("");
    expect(parsed.version).toBe("1.0.0");
    expect(parsed.resultChart).toBe("severity_bar");
  });
});

describe("patientSchema", () => {
  it("validates a correct patient", () => {
    const patient = {
      id: "patient-001",
      name: "Jane Doe",
      demographics: "35-year-old female",
      clinicalBackground: "Reported symptoms of moderate depression",
      consentStatus: "granted",
    };
    const result = patientSchema.safeParse(patient);
    expect(result.success).toBe(true);
  });

  it("rejects invalid patient ID with path traversal", () => {
    const patient = {
      id: "../patient-001",
      name: "Jane Doe",
    };
    const result = patientSchema.safeParse(patient);
    expect(result.success).toBe(false);
  });

  it("rejects invalid patient ID with spaces", () => {
    const patient = {
      id: "patient 001",
      name: "Jane Doe",
    };
    const result = patientSchema.safeParse(patient);
    expect(result.success).toBe(false);
  });
});

describe("inviteSchema", () => {
  it("validates a correct invite", () => {
    const invite = {
      token: "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6",
      measureSlug: "severity-depression-adult",
      patientId: "patient-001",
      createdAt: "2026-06-20T12:00:00Z",
      status: "pending",
    };
    const result = inviteSchema.safeParse(invite);
    expect(result.success).toBe(true);
  });

  it("rejects token with wrong length", () => {
    const invite = {
      token: "short",
      measureSlug: "phq-9",
      patientId: "patient-001",
      createdAt: "2026-06-20T12:00:00Z",
    };
    const result = inviteSchema.safeParse(invite);
    expect(result.success).toBe(false);
  });

  it("defaults status to pending", () => {
    const invite = {
      token: "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6",
      measureSlug: "phq-9",
      patientId: "patient-001",
      createdAt: "2026-06-20T12:00:00Z",
    };
    const parsed = inviteSchema.parse(invite);
    expect(parsed.status).toBe("pending");
  });
});

describe("scoringOutputSchema", () => {
  it("validates a correct scoring output", () => {
    const output = {
      assessmentSlug: "severity-depression-adult",
      patientId: "patient-001",
      total: 15,
      average: 3.0,
      tScore: null,
      severity: "moderately_severe",
      dataQualityFlags: [],
    };
    const result = scoringOutputSchema.safeParse(output);
    expect(result.success).toBe(true);
  });

  it("validates unscorable with flags", () => {
    const output = {
      assessmentSlug: "gad-7",
      patientId: "patient-001",
      total: null,
      average: null,
      tScore: null,
      severity: "unscorable",
      dataQualityFlags: ["missing_required:item_3", "incomplete"],
    };
    const result = scoringOutputSchema.safeParse(output);
    expect(result.success).toBe(true);
  });
});

describe("buildAnswerSchema", () => {
  it("builds schema from measure fields", () => {
    const measure = {
      slug: "test",
      title: "Test",
      fields: [
        { id: "q1", label: "Scale Q", type: "scale" as const, required: true, min: 0, max: 3 },
        { id: "q2", label: "Text Q", type: "text" as const, required: false },
        { id: "q3", label: "Bool Q", type: "boolean" as const, required: true },
      ],
      scoringRule: { calculation: "total" as const, maxScale: 3, severityThresholds: {}, reverseScoredItems: [], requiredFields: [], t_score: false },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const schema = buildAnswerSchema(measure);

    // Valid answers pass
    const valid = schema.safeParse({ q1: 2, q3: true });
    expect(valid.success).toBe(true);

    // Invalid: scale out of range
    const outOfRange = schema.safeParse({ q1: 5, q3: true });
    expect(outOfRange.success).toBe(false);

    // Invalid: missing required boolean
    const missingReq = schema.safeParse({ q1: 1 });
    expect(missingReq.success).toBe(false);
  });

  it("validates select field options", () => {
    const measure = {
      slug: "test",
      title: "Test",
      fields: [
        {
          id: "choice",
          label: "Pick one",
          type: "select" as const,
          required: true,
          options: [
            { value: "a", label: "Option A" },
            { value: "b", label: "Option B" },
          ],
        },
      ],
      scoringRule: { calculation: "total" as const, maxScale: 3, severityThresholds: {}, reverseScoredItems: [], requiredFields: [], t_score: false },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const schema = buildAnswerSchema(measure);

    expect(schema.safeParse({ choice: "a" }).success).toBe(true);
    expect(schema.safeParse({ choice: "b" }).success).toBe(true);
    expect(schema.safeParse({ choice: "c" }).success).toBe(false);
  });
});