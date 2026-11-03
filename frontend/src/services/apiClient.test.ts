import { describe, expect, it, vi } from "vitest";
import { ApiError, apiRequest, errorMessageFor } from "./apiClient.ts";

describe("apiClient", () => {
  it("memetakan pesan error 401 ke Bahasa Indonesia", () => {
    expect(errorMessageFor(401)).toContain("Sesi berakhir");
  });

  it("mengirim JSON dan Authorization Bearer", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { ok: true } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiRequest<{ data: { ok: boolean } }>("/contoh", {
      method: "POST",
      body: JSON.stringify({ nama: "contoh" }),
      accessToken: "token-pratinjau",
    });

    expect(result.data.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(options.headers);
    expect(headers.get("Content-Type")).toContain("application/json");
    expect(headers.get("Authorization")).toBe("Bearer token-pratinjau");
    vi.unstubAllGlobals();
  });

  it("melempar ApiError dengan format error api-specification", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: "Data yang dikirim tidak valid.",
            details: [{ field: "email", message: "Format email tidak valid." }],
          },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest("/contoh", { method: "POST" })).rejects.toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
    });
    await expect(apiRequest("/contoh", { method: "POST" })).rejects.toBeInstanceOf(ApiError);
    vi.unstubAllGlobals();
  });
});
