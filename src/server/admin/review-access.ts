import {
  getFoundathonAdminEmails,
  getFoundathonSuperAdminEmail,
  isFoundathonSuperAdminEmail,
} from "@/server/env";
import { getManagedReviewAdminEmails } from "@/server/problem-statements/cap-settings";

const normalizeEmail = (value: string | null | undefined) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

export const getAdminReviewAccessEmails = async () => {
  const emails = new Set<string>([
    ...getFoundathonAdminEmails(),
    ...(await getManagedReviewAdminEmails()),
  ]);
  emails.add(getFoundathonSuperAdminEmail());
  return [...emails];
};

export const hasAdminReviewAccess = async (
  email: string | null | undefined,
) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return false;
  }

  if (isFoundathonSuperAdminEmail(normalizedEmail)) {
    return true;
  }

  const accessEmails = await getAdminReviewAccessEmails();
  return accessEmails.includes(normalizedEmail);
};
