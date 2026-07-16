import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiRequestError } from "./api";
import { useSession } from "./store";

describe("API client", () => {
  beforeEach(() => {
    sessionStorage.clear();
    useSession.setState({ token: null, role: null, name: null, user: null });
    vi.restoreAllMocks();
  });

  it("rotates an expired access token and retries once", async () => {
    useSession.getState().setAuth("expired", "CANDIDATE", "Minh Anh");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "expired" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ accessToken: "fresh" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    await expect(api<{ ok: boolean }>("/protected")).resolves.toEqual({
      ok: true,
    });
    expect(useSession.getState().token).toBe("fresh");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("exposes standardized API error details", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          code: "VALIDATION_ERROR",
          message: "Invalid",
          requestId: "req-1",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      ),
    );
    const error = (await api("/invalid", {}, false).catch(
      (value) => value,
    )) as ApiRequestError;
    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error.details.requestId).toBe("req-1");
  });
});
