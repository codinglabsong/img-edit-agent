import { describe, it, expect, vi, afterEach } from "vitest";
import { downloadImage } from "./actions";

describe("downloadImage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns blob on success", async () => {
    const blob = new Blob(["hello"], { type: "text/plain" });
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(blob, { status: 200 }),
    );

    const result = await downloadImage("https://example.com/image.png");
    expect(result.success).toBe(true);
    expect(result.blob).toBeDefined();
    expect(result.blob?.size).toBeGreaterThan(0);
  });

  it("returns error on failure", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(null, { status: 404, statusText: "Not Found" }),
    );

    const result = await downloadImage("https://example.com/missing.png");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
