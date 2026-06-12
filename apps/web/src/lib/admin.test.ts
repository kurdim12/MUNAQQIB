import { describe, expect, it } from "vitest";

import { isAdminEmail, parseAdminEmails } from "./admin";

describe("parseAdminEmails", () => {
  it("splits, trims, lowercases, and drops blanks", () => {
    expect(parseAdminEmails("A@x.com, b@x.com\n c@x.com ")).toEqual([
      "a@x.com",
      "b@x.com",
      "c@x.com",
    ]);
    expect(parseAdminEmails("")).toEqual([]);
    expect(parseAdminEmails(undefined)).toEqual([]);
  });
});

describe("isAdminEmail", () => {
  const list = "founder@munaqqib.com, ops@munaqqib.com";
  it("matches case-insensitively", () => {
    expect(isAdminEmail("Founder@Munaqqib.com", list)).toBe(true);
    expect(isAdminEmail("ops@munaqqib.com", list)).toBe(true);
  });
  it("rejects non-admins and empty config", () => {
    expect(isAdminEmail("rando@x.com", list)).toBe(false);
    expect(isAdminEmail("founder@munaqqib.com", "")).toBe(false);
    expect(isAdminEmail(null, list)).toBe(false);
  });
});
