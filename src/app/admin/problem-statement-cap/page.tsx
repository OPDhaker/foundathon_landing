import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { isBlockedLoginEmail } from "@/server/auth/email-policy";
import { isFoundathonAdminEmail } from "@/server/env";
import { getProblemStatementCap } from "@/server/problem-statements/cap-settings";
import { createClient } from "@/utils/supabase/server";
import AdminProblemStatementCapClient from "./problem-statement-cap-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ADMIN_ROUTE = "/admin/problem-statement-cap";

export default async function AdminProblemStatementCapPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    notFound();
  }

  const supabase = await createClient(cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || isBlockedLoginEmail(user.email)) {
    redirect(`/api/auth/login?next=${encodeURIComponent(ADMIN_ROUTE)}`);
  }

  if (!isFoundathonAdminEmail(user.email)) {
    notFound();
  }

  const initialCap = await getProblemStatementCap({ useCache: false });

  return (
    <AdminProblemStatementCapClient
      adminEmail={user.email ?? ""}
      initialCap={initialCap}
    />
  );
}
