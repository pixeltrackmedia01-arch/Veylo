import { describe, expect, it } from "vitest";
import {
  BATCH_TRANSITIONS,
  canTransition,
  closureOutcome,
  isJoinable,
  progressPercent,
  spotsLeft,
  TERMINAL_STATUSES,
} from "./batch-lifecycle";

const base = { status: "open" as const, deadline: "2099-01-01T00:00:00Z", verified_participant_count: 5, target_participants: 20 };

describe("batch state machine", () => {
  it("allows only forward lifecycle transitions", () => {
    expect(canTransition("draft", "open")).toBe(true);
    expect(canTransition("open", "target_reached")).toBe(true);
    expect(canTransition("target_reached", "quotation_requested")).toBe(true);
    expect(canTransition("quotation_review", "quotes_published")).toBe(true);
    expect(canTransition("open", "completed")).toBe(false);
    expect(canTransition("open", "quotes_published")).toBe(false);
    expect(canTransition("draft", "target_reached")).toBe(false);
  });

  it("never marks a batch completed directly from reaching its target", () => {
    expect(canTransition("target_reached", "completed")).toBe(false);
  });

  it("treats completed, cancelled and expired as terminal", () => {
    for (const s of TERMINAL_STATUSES) expect(BATCH_TRANSITIONS[s]).toHaveLength(0);
  });

  it("allows cancellation from every non-terminal state", () => {
    for (const [from, targets] of Object.entries(BATCH_TRANSITIONS)) {
      if (TERMINAL_STATUSES.includes(from as never)) continue;
      expect(targets).toContain("cancelled");
    }
  });
});

describe("closure outcome", () => {
  it("reaches target at exactly the target count", () => {
    expect(closureOutcome({ verified_participant_count: 20, target_participants: 20, minimum_participants: 5 })).toBe("target_reached");
    expect(closureOutcome({ verified_participant_count: 19, target_participants: 20, minimum_participants: 5 })).toBe("closed_deadline");
  });

  it("expires below the minimum", () => {
    expect(closureOutcome({ verified_participant_count: 4, target_participants: 20, minimum_participants: 5 })).toBe("expired");
  });
});

describe("joinability and progress", () => {
  const now = new Date("2030-01-01T00:00:00Z");
  it("is joinable only while open, before the deadline and below target", () => {
    expect(isJoinable(base, now)).toBe(true);
    expect(isJoinable({ ...base, status: "target_reached" }, now)).toBe(false);
    expect(isJoinable({ ...base, deadline: "2029-12-31T00:00:00Z" }, now)).toBe(false);
    expect(isJoinable({ ...base, verified_participant_count: 20 }, now)).toBe(false);
  });

  it("computes progress and remaining spots", () => {
    expect(progressPercent(base)).toBe(25);
    expect(progressPercent({ verified_participant_count: 25, target_participants: 20 })).toBe(100);
    expect(spotsLeft(base)).toBe(15);
    expect(spotsLeft({ verified_participant_count: 22, target_participants: 20 })).toBe(0);
  });
});
