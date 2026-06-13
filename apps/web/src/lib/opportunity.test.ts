import { describe, expect, it } from "vitest";

import {
  canTransition,
  decisionFor,
  isOppStatus,
  isTerminal,
  nextStates,
  OppStatus,
  outcomeFor,
  statusTone,
} from "./opportunity";

describe("opportunity state machine (L2)", () => {
  it("starts at new with review/pass moves", () => {
    expect(nextStates("new").sort()).toEqual(["pass", "reviewing"]);
  });

  it("allows the full happy path new→…→won", () => {
    const path: [OppStatus, OppStatus][] = [
      ["new", "reviewing"],
      ["reviewing", "analyzed"],
      ["analyzed", "bid"],
      ["bid", "tracking"],
      ["tracking", "won"],
    ];
    for (const [from, to] of path) expect(canTransition(from, to)).toBe(true);
  });

  it("rejects illegal jumps", () => {
    expect(canTransition("new", "won")).toBe(false);
    expect(canTransition("new", "tracking")).toBe(false);
    expect(canTransition("pass", "won")).toBe(false);
  });

  it("lets a passed opportunity be reopened", () => {
    expect(canTransition("pass", "reviewing")).toBe(true);
  });

  it("marks won/lost terminal", () => {
    expect(isTerminal("won")).toBe(true);
    expect(isTerminal("lost")).toBe(true);
    expect(isTerminal("new")).toBe(false);
  });

  it("records decision and outcome on the right moves", () => {
    expect(decisionFor("bid")).toBe("bid");
    expect(decisionFor("pass")).toBe("pass");
    expect(decisionFor("reviewing")).toBeNull();
    expect(outcomeFor("won")).toBe("won");
    expect(outcomeFor("lost")).toBe("lost");
    expect(outcomeFor("bid")).toBeNull();
  });

  it("tones map to semantic colors", () => {
    expect(statusTone("won")).toBe("green");
    expect(statusTone("reviewing")).toBe("amber");
    expect(statusTone("lost")).toBe("red");
    expect(statusTone("new")).toBe("neutral");
  });

  it("validates status strings", () => {
    expect(isOppStatus("bid")).toBe(true);
    expect(isOppStatus("nonsense")).toBe(false);
  });
});
