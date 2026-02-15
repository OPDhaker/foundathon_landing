import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  type TeamRecord,
  teamSubmissionSchema,
} from "@/lib/register-schema";

export const JSON_HEADERS = { "Cache-Control": "no-store" };
export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const EVENT_ID = "583a3b40-da9d-412a-a266-cc7e64330b16";

export type TeamSummary = {
  id: string;
  teamName: string;
  teamType: "srm" | "non_srm";
  leadName: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
};

export type RegistrationRow = {
  id: string;
  created_at: string;
  updated_at: string | null;
  details: Record<string, unknown> | null;
};

type SupabaseCredentials = {
  anonKey: string;
  url: string;
};

export function getSupabaseCredentials(): SupabaseCredentials | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return { anonKey, url };
}

export async function createSupabaseClient({
  anonKey,
  url,
}: SupabaseCredentials) {
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, options, value }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}



export function toTeamSummary(row: RegistrationRow): TeamSummary {
  const details = row.details ?? {};
  const parsed = teamSubmissionSchema.safeParse(details);

  if (!parsed.success) {
    return {
      id: row.id,
      teamName: "Unnamed Team",
      teamType: "srm",
      leadName: "Unknown Lead",
      memberCount: 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at ?? row.created_at,
    };
  }

  const submission = parsed.data;
  return {
    id: row.id,
    teamName: submission.teamName,
    teamType: submission.teamType,
    leadName: submission.lead.name,
    memberCount: submission.members.length + 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

export function toTeamRecord(row: RegistrationRow): TeamRecord | null {
  const details = row.details ?? {};
  const parsed = teamSubmissionSchema.safeParse(details);

  if (!parsed.success) {
    return null;
  }

  return {
    ...parsed.data,
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}