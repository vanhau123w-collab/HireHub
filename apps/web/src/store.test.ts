import { describe, expect, it, beforeEach } from "vitest";
import { useSession } from "./store";
describe("session store", () => {
  beforeEach(() => {
    sessionStorage.clear();
    useSession.setState({ token: null, role: null, name: null, user: null });
  });
  it("selects isolated demo role", () => {
    useSession.getState().setDemo("CANDIDATE", "Minh Anh");
    expect(useSession.getState().role).toBe("CANDIDATE");
    expect(useSession.getState().token).toBeNull();
  });
  it("logout preserves theme and language preferences", () => {
    localStorage.setItem("language", "en");
    localStorage.setItem("hirehub-color-scheme", "dark");
    useSession.getState().setAuth("token", "CANDIDATE", "Minh Anh");
    useSession.getState().logout();
    expect(localStorage.getItem("language")).toBe("en");
    expect(localStorage.getItem("hirehub-color-scheme")).toBe("dark");
  });
});
