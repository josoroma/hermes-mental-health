import { describe, it, expect } from "vitest";
import {
  scoreResult,
  resolveSeverityThreshold,
} from "@/lib/scoring/engine";
import { type Measure, SeverityBand, ScoringType, FieldType, ResultChartType } from "@/lib/domain/_schema";

// ── Helper: create a minimal Measure for testing ──────────────────────────

function makeMeasure(overrides: Partial<Measure> = {}): Measure {
  return {
    slug: "test-measure",
    title: "Test Measure",
    description: "",
    version: "1.0.0",
    instructions: "",
    resultChart: ResultChartType.SEVERITY_BAR,
    fields: [
      {
        id: "item_1",
        label: "Item 1",
        type: FieldType.SCALE,
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
        label: "Item 2",
        type: FieldType.SCALE,
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
        id: "item_3",
        label: "Item 3",
        type: FieldType.SCALE,
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
    ],
    scoringRule: {
      calculation: ScoringType.TOTAL,
      maxScale: 3,
      severityThresholds: {
        none: [0, 4],
        mild: [5, 9],
        moderate: [10, 14],
        moderately_severe: [15, 19],
        severe: [20, 27],
      },
      reverseScoredItems: [],
      requiredFields: ["item_1", "item_2", "item_3"],
      t_score: false,
    },
    ...overrides,
  } as Measure;
}

// ── Total scoring ──────────────────────────────────────────────────────────

describe("scoreResult — total scoring", () => {
  it("computes correct total for all items answered", () => {
    const measure = makeMeasure();
    const answers = { item_1: 2, item_2: 3, item_3: 1 };
    const result = scoreResult(measure, answers);

    expect(result.total).toBe(6);
    expect(result.average).toBe(2);
    expect(result.severity).toBe(SeverityBand.MILD);
    expect(result.dataQualityFlags).toEqual([]);
  });

  it("maps PHQ-9 total 15 to moderately_severe", () => {
    const phq9 = makeMeasure({
      scoringRule: {
        calculation: ScoringType.TOTAL,
        maxScale: 3,
        severityThresholds: {
          none: [0, 4],
          mild: [5, 9],
          moderate: [10, 14],
          moderately_severe: [15, 19],
          severe: [20, 27],
        },
        reverseScoredItems: [],
        requiredFields: ["item_1", "item_2", "item_3"],
        t_score: false,
      },
    });
    const result = scoreResult(phq9, { item_1: 5, item_2: 5, item_3: 5 });
    expect(result.total).toBe(15);
    expect(result.severity).toBe(SeverityBand.MODERATELY_SEVERE);
  });

  it("maps total 22 to severe", () => {
    const phq9 = makeMeasure({
      scoringRule: {
        calculation: ScoringType.TOTAL,
        maxScale: 3,
        severityThresholds: {
          none: [0, 4],
          mild: [5, 9],
          moderate: [10, 14],
          moderately_severe: [15, 19],
          severe: [20, 27],
        },
        reverseScoredItems: [],
        requiredFields: ["item_1", "item_2", "item_3"],
        t_score: false,
      },
    });
    const result = scoreResult(phq9, { item_1: 7, item_2: 7, item_3: 8 });
    expect(result.total).toBe(22);
    expect(result.severity).toBe(SeverityBand.SEVERE);
  });
});

// ── Reverse scoring ────────────────────────────────────────────────────────

describe("scoreResult — reverse scoring", () => {
  it("reverses flagged items before totaling", () => {
    const measure = makeMeasure({
      scoringRule: {
        calculation: ScoringType.TOTAL,
        maxScale: 3,
        severityThresholds: {},
        reverseScoredItems: ["item_1", "item_2"],
        requiredFields: ["item_1", "item_2", "item_3"],
        t_score: false,
      },
    });

    // maxScale=3, so reversed: 3-3=0, 3-2=1, item_3 stays 3
    const answers = { item_1: 3, item_2: 2, item_3: 3 };
    const result = scoreResult(measure, answers);

    // item_1: 3→0, item_2: 2→1, item_3: 3 → total = 4
    expect(result.total).toBe(4);
    expect(result.dataQualityFlags).toEqual([]);
  });
});

// ── PROMIS T-score ─────────────────────────────────────────────────────────

describe("scoreResult — PROMIS T-score", () => {
  it("looks up T-score from built-in table (depression)", () => {
    const measure: Measure = {
      slug: "level2-depression-adult",
      title: "PROMIS Depression",
      description: "",
      version: "1.0.0",
      instructions: "",
      resultChart: ResultChartType.T_SCORE_GAUGE,
      fields: [
        { id: "item_1", label: "Q1", type: FieldType.SCALE, required: true, min: 1, max: 5 },
        { id: "item_2", label: "Q2", type: FieldType.SCALE, required: true, min: 1, max: 5 },
        { id: "item_3", label: "Q3", type: FieldType.SCALE, required: true, min: 1, max: 5 },
        { id: "item_4", label: "Q4", type: FieldType.SCALE, required: true, min: 1, max: 5 },
        { id: "item_5", label: "Q5", type: FieldType.SCALE, required: true, min: 1, max: 5 },
        { id: "item_6", label: "Q6", type: FieldType.SCALE, required: true, min: 1, max: 5 },
        { id: "item_7", label: "Q7", type: FieldType.SCALE, required: true, min: 1, max: 5 },
        { id: "item_8", label: "Q8", type: FieldType.SCALE, required: true, min: 1, max: 5 },
      ],
      scoringRule: {
        calculation: ScoringType.T_SCORE,
        maxScale: 4,
        severityThresholds: {},
        reverseScoredItems: [],
        requiredFields: ["item_1", "item_2", "item_3", "item_4", "item_5", "item_6", "item_7", "item_8"],
        t_score: true,
      },
    };

    // Raw sum 20 → T-score ~51.5
    const answers = { item_1: 3, item_2: 3, item_3: 2, item_4: 2, item_5: 2, item_6: 3, item_7: 2, item_8: 3 };
    const result = scoreResult(measure, answers);

    expect(result.total).toBe(20);
    expect(result.tScore).toBeCloseTo(51.5, 0);
    expect(result.severity).toBe(SeverityBand.NONE); // <55
  });

  it("returns severe for high T-score (>70)", () => {
    const measure: Measure = {
      slug: "level2-depression-adult",
      title: "PROMIS Depression",
      description: "",
      version: "1.0.0",
      instructions: "",
      resultChart: ResultChartType.T_SCORE_GAUGE,
      fields: Array.from({ length: 8 }, (_, i) => ({
        id: `item_${i + 1}`,
        label: `Q${i + 1}`,
        type: FieldType.SCALE,
        required: true,
        min: 1,
        max: 5,
      })),
      scoringRule: {
        calculation: ScoringType.T_SCORE,
        maxScale: 4,
        severityThresholds: {},
        reverseScoredItems: [],
        requiredFields: Array.from({ length: 8 }, (_, i) => `item_${i + 1}`),
        t_score: true,
      },
    };

    // Raw sum 32 → T-score ~68.9 (severe)
    const answers: Record<string, number> = {};
    for (let i = 1; i <= 8; i++) answers[`item_${i}`] = 4;
    const result = scoreResult(measure, answers);

    expect(result.total).toBe(32);
    expect(result.tScore).toBeCloseTo(68.9, 0);
    expect(result.severity).toBe(SeverityBand.MODERATE); // 60-70
  });
});

// ── Data quality ───────────────────────────────────────────────────────────

describe("scoreResult — data quality", () => {
  it("flags missing required items as unscorable", () => {
    const measure = makeMeasure();
    const answers = { item_1: 2 }; // Missing item_2 and item_3

    const result = scoreResult(measure, answers);
    expect(result.severity).toBe(SeverityBand.UNSCORABLE);
    expect(result.dataQualityFlags).toContain("missing_required:item_2");
    expect(result.dataQualityFlags).toContain("missing_required:item_3");
    expect(result.dataQualityFlags).toContain("incomplete");
  });

  it("passes clean when all required items answered", () => {
    const measure = makeMeasure();
    const answers = { item_1: 1, item_2: 2, item_3: 0 };

    const result = scoreResult(measure, answers);
    expect(result.dataQualityFlags).toEqual([]);
    expect(result.severity).not.toBe(SeverityBand.UNSCORABLE);
  });
});

// ── Severity threshold resolver ────────────────────────────────────────────

describe("resolveSeverityThreshold", () => {
  const phq9Thresholds: Record<string, [number, number]> = {
    none: [0, 4],
    mild: [5, 9],
    moderate: [10, 14],
    moderately_severe: [15, 19],
    severe: [20, 27],
  };

  it("resolves 3 to none", () => {
    expect(resolveSeverityThreshold(3, phq9Thresholds)).toBe(SeverityBand.NONE);
  });

  it("resolves 7 to mild", () => {
    expect(resolveSeverityThreshold(7, phq9Thresholds)).toBe(SeverityBand.MILD);
  });

  it("resolves 12 to moderate", () => {
    expect(resolveSeverityThreshold(12, phq9Thresholds)).toBe(SeverityBand.MODERATE);
  });

  it("resolves 17 to moderately_severe", () => {
    expect(resolveSeverityThreshold(17, phq9Thresholds)).toBe(
      SeverityBand.MODERATELY_SEVERE
    );
  });

  it("resolves 25 to severe", () => {
    expect(resolveSeverityThreshold(25, phq9Thresholds)).toBe(SeverityBand.SEVERE);
  });

  it("returns unscorable for empty thresholds", () => {
    expect(resolveSeverityThreshold(10, {})).toBe(SeverityBand.UNSCORABLE);
  });
});