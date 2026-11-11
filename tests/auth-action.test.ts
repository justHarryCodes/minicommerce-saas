import { describe, it, expect } from "vitest";
import { authActionError, parseAuthAction, passwordProblems, safeContinueUrl } from "@/lib/auth-action";

// The /_/auth/action page: Firebase email links (verify, reset password,
// change / undo email) handled on Duka's own domain.

const ORIGIN = "https://dukanigeria.com";

describe("continue links only ever lead back to Duka", () => {
  it("keeps Duka addresses: this site, the root domain and store subdomains", () => {
    expect(safeContinueUrl("https://dukanigeria.com/auth/login", ORIGIN)).toBe("https://dukanigeria.com/auth/login");
    expect(safeContinueUrl("/affiliate/login", ORIGIN)).toBe("https://dukanigeria.com/affiliate/login");
    expect(safeContinueUrl("https://amaka.dukanigeria.com/", ORIGIN)).toBe("https://amaka.dukanigeria.com/");
    expect(safeContinueUrl("http://localhost:3000/auth/login", "http://localhost:3000")).toBe("http://localhost:3000/auth/login");
  });

  it("drops anything else", () => {
    expect(safeContinueUrl("https://evil.com/phish", ORIGIN)).toBeNull();
    expect(safeContinueUrl("https://dukanigeria.com.evil.com/", ORIGIN)).toBeNull();
    expect(safeContinueUrl("https://evildukanigeria.com/", ORIGIN)).toBeNull();
    expect(safeContinueUrl("http://amaka.dukanigeria.com/", ORIGIN)).toBeNull(); // not https
    expect(safeContinueUrl("javascript:alert(1)", ORIGIN)).toBeNull();
    expect(safeContinueUrl("//evil.com/x", ORIGIN)).toBeNull();
    expect(safeContinueUrl(null, ORIGIN)).toBeNull();
  });
});

describe("reading the link", () => {
  it("takes the mode, code and a safe continue URL", () => {
    const p = new URLSearchParams({ mode: "resetPassword", oobCode: "AbC-123_xyz789", apiKey: "k", continueUrl: "https://dukanigeria.com/auth/login", lang: "en" });
    expect(parseAuthAction(p, ORIGIN)).toEqual({ mode: "resetPassword", oobCode: "AbC-123_xyz789", continueUrl: "https://dukanigeria.com/auth/login" });
  });

  it("rejects unknown modes and malformed codes", () => {
    expect(parseAuthAction(new URLSearchParams({ mode: "deleteEverything", oobCode: "AbC-123_xyz789" }), ORIGIN).mode).toBeNull();
    expect(parseAuthAction(new URLSearchParams({ mode: "verifyEmail", oobCode: "<script>" }), ORIGIN).oobCode).toBeNull();
    expect(parseAuthAction(new URLSearchParams({ mode: "verifyAndChangeEmail", oobCode: "x".repeat(20), continueUrl: "https://evil.com" }), ORIGIN)).toEqual({
      mode: "verifyAndChangeEmail",
      oobCode: "x".repeat(20),
      continueUrl: null,
    });
  });
});

describe("messages", () => {
  it("explains expired and used links in plain words", () => {
    expect(authActionError("auth/expired-action-code")).toMatch(/expired/);
    expect(authActionError("auth/invalid-action-code")).toMatch(/already been used/);
    expect(authActionError("something/else")).toMatch(/Request a new one/);
  });

  it("new passwords need 8+ characters with a letter and a number", () => {
    expect(passwordProblems("")).toEqual(["at least 8 characters", "a letter", "a number"]);
    expect(passwordProblems("abcdefgh")).toEqual(["a number"]);
    expect(passwordProblems("12345678")).toEqual(["a letter"]);
    expect(passwordProblems("duka2026")).toEqual([]);
  });
});
