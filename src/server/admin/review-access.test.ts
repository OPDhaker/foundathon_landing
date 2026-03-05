import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getFoundathonAdminEmails: vi.fn(),
  getFoundathonSuperAdminEmail: vi.fn(),
  getManagedReviewAdminEmails: vi.fn(),
  isFoundathonSuperAdminEmail: vi.fn(),
}));

vi.mock("@/server/env", () => ({
  getFoundathonAdminEmails: mocks.getFoundathonAdminEmails,
  getFoundathonSuperAdminEmail: mocks.getFoundathonSuperAdminEmail,
  isFoundathonSuperAdminEmail: mocks.isFoundathonSuperAdminEmail,
}));

vi.mock("@/server/problem-statements/cap-settings", () => ({
  getManagedReviewAdminEmails: mocks.getManagedReviewAdminEmails,
}));

describe("review admin access", () => {
  beforeEach(() => {
    vi.resetModules();

    mocks.getFoundathonAdminEmails.mockReset();
    mocks.getFoundathonSuperAdminEmail.mockReset();
    mocks.getManagedReviewAdminEmails.mockReset();
    mocks.isFoundathonSuperAdminEmail.mockReset();

    mocks.getFoundathonAdminEmails.mockReturnValue(["env-admin@example.com"]);
    mocks.getFoundathonSuperAdminEmail.mockReturnValue(
      "opdhaker2007@gmail.com",
    );
    mocks.getManagedReviewAdminEmails.mockResolvedValue([
      "db-admin@example.com",
      "env-admin@example.com",
    ]);
    mocks.isFoundathonSuperAdminEmail.mockImplementation(
      (email) => String(email).toLowerCase() === "opdhaker2007@gmail.com",
    );
  });

  it("combines env and managed review admin emails with super admin", async () => {
    const { getAdminReviewAccessEmails } = await import("./review-access");
    const emails = await getAdminReviewAccessEmails();

    expect(emails).toEqual([
      "env-admin@example.com",
      "db-admin@example.com",
      "opdhaker2007@gmail.com",
    ]);
  });

  it("allows super admin access", async () => {
    const { hasAdminReviewAccess } = await import("./review-access");
    await expect(hasAdminReviewAccess("opdhaker2007@gmail.com")).resolves.toBe(
      true,
    );
  });

  it("allows env and managed review admins", async () => {
    const { hasAdminReviewAccess } = await import("./review-access");

    await expect(hasAdminReviewAccess("env-admin@example.com")).resolves.toBe(
      true,
    );
    await expect(hasAdminReviewAccess("db-admin@example.com")).resolves.toBe(
      true,
    );
  });

  it("denies unknown email", async () => {
    const { hasAdminReviewAccess } = await import("./review-access");
    await expect(hasAdminReviewAccess("other@example.com")).resolves.toBe(
      false,
    );
  });
});
