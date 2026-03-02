import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_ERROR_REASON_SRM_BLOCKED } from "@/server/auth/email-policy";

const mocks = vi.hoisted(() => ({
  createRouteSupabaseClient: vi.fn(),
  enforceIpRateLimit: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  getRouteSupabaseCredentials: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/server/supabase/route-client", () => ({
  createRouteSupabaseClient: mocks.createRouteSupabaseClient,
  getRouteSupabaseCredentials: mocks.getRouteSupabaseCredentials,
}));

vi.mock("@/server/security/rate-limit", () => ({
  enforceIpRateLimit: mocks.enforceIpRateLimit,
}));

const ENV_KEYS = [
  "FOUNDATHON_ALLOWED_REDIRECT_HOSTS",
  "FOUNDATHON_NODE_ENV",
  "FOUNDATHON_NEXT_PUBLIC_SITE_URL",
] as const;
const ORIGINAL_ENV = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]]),
) as Record<(typeof ENV_KEYS)[number], string | undefined>;

const restoreEnv = () => {
  for (const key of ENV_KEYS) {
    const value = ORIGINAL_ENV[key];
    if (typeof value === "string") {
      process.env[key] = value;
    } else {
      delete process.env[key];
    }
  }
};

describe("/api/auth/callback GET", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.createRouteSupabaseClient.mockReset();
    mocks.enforceIpRateLimit.mockReset();
    mocks.exchangeCodeForSession.mockReset();
    mocks.getRouteSupabaseCredentials.mockReset();
    mocks.signOut.mockReset();

    mocks.exchangeCodeForSession.mockResolvedValue({
      data: { user: { email: "lead@example.com" } },
      error: null,
    });
    mocks.getRouteSupabaseCredentials.mockReturnValue({
      anonKey: "anon-key",
      url: "https://supabase.example",
    });
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.enforceIpRateLimit.mockResolvedValue(null);
    mocks.createRouteSupabaseClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: mocks.exchangeCodeForSession,
        signOut: mocks.signOut,
      },
    });

    restoreEnv();
  });

  afterEach(() => {
    restoreEnv();
  });

  it("redirects to auth-code-error when code is missing", async () => {
    process.env.FOUNDATHON_NODE_ENV = "development";

    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/auth/callback"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/auth/auth-code-error",
    );
    expect(mocks.createRouteSupabaseClient).not.toHaveBeenCalled();
  });

  it("redirects to safe internal next path when provided", async () => {
    process.env.FOUNDATHON_NODE_ENV = "development";

    const { GET } = await import("./route");
    const response = await GET(
      new Request(
        "http://localhost/api/auth/callback?code=abc123&next=/dashboard/team-1",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/dashboard/team-1",
    );
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it("redirects to auth-code-error with reason for blocked SRM email", async () => {
    process.env.FOUNDATHON_NODE_ENV = "development";
    mocks.exchangeCodeForSession.mockResolvedValue({
      data: { user: { email: "blocked@srmist.edu.in" } },
      error: null,
    });

    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/auth/callback?code=abc123"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `http://localhost/auth/auth-code-error?reason=${AUTH_ERROR_REASON_SRM_BLOCKED}`,
    );
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
  });

  it("falls back to root for unsafe next path", async () => {
    process.env.FOUNDATHON_NODE_ENV = "development";

    const { GET } = await import("./route");
    const response = await GET(
      new Request(
        "http://localhost/api/auth/callback?code=abc123&next=https://evil.example",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/");
  });

  it("uses x-forwarded-host in non-local env", async () => {
    process.env.FOUNDATHON_NODE_ENV = "production";
    process.env.FOUNDATHON_ALLOWED_REDIRECT_HOSTS = "foundathon.example";

    const request = new Request(
      "https://internal-host/api/auth/callback?code=abc123&next=/register",
      {
        headers: {
          "x-forwarded-host": "foundathon.example",
        },
      },
    );

    const { GET } = await import("./route");
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://foundathon.example/register",
    );
  });

  it("falls back when x-forwarded-host is not allowlisted", async () => {
    process.env.FOUNDATHON_NODE_ENV = "production";
    process.env.FOUNDATHON_ALLOWED_REDIRECT_HOSTS = "safe.example";
    delete process.env.FOUNDATHON_NEXT_PUBLIC_SITE_URL;

    const request = new Request(
      "https://internal-host/api/auth/callback?code=abc123&next=/register",
      {
        headers: {
          "x-forwarded-host": "untrusted.example",
        },
      },
    );

    const { GET } = await import("./route");
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://internal-host/register",
    );
  });

  it("returns 429 when callback endpoint is rate limited", async () => {
    mocks.enforceIpRateLimit.mockResolvedValue(
      new Response(JSON.stringify({ code: "RATE_LIMITED" }), {
        headers: { "content-type": "application/json" },
        status: 429,
      }),
    );

    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/auth/callback?code=abc123"),
    );
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.code).toBe("RATE_LIMITED");
    expect(mocks.createRouteSupabaseClient).not.toHaveBeenCalled();
  });
});
