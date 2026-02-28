import { timingSafeEqual } from "node:crypto";
import { notFound } from "next/navigation";
import { parseStatsQueryInput } from "@/app/stats/stats-filters";
import { getFoundathonStatsPageKey } from "@/server/env";
import {
  getRegistrationStats,
  type ServiceFailure,
} from "@/server/registration-stats/service";
import StatsDashboardClient from "./stats-dashboard-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type StatsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type StatsErrorHelp = {
  details: string[];
  headline: string;
  quickChecks: string[];
};

const toSingleSearchParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const isValidPageKey = ({
  expected,
  provided,
}: {
  expected: string;
  provided: string;
}) => {
  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(provided, "utf8");

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
};

const formatGeneratedAt = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return value;
  }

  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
};

const getStatsErrorHelp = (error: string): StatsErrorHelp => {
  const normalized = error.trim().toLowerCase();

  if (normalized.includes("service role client is not configured")) {
    return {
      details: [
        "Supabase service-role environment variables are missing in the runtime where Next.js is running.",
        "This page can render only when server-side stats queries can authenticate with Supabase service role credentials.",
      ],
      headline: "Missing Supabase Service-Role Configuration",
      quickChecks: [
        "Confirm runtime has NEXT_PUBLIC_SUPABASE_URL",
        "Confirm runtime has SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_SERVICE_ROLE",
        "If using Doppler, start app with: doppler run -- bun dev",
      ],
    };
  }

  if (normalized.includes("failed to fetch registrations for stats")) {
    return {
      details: [
        "The stats query reached Supabase but the registration read failed.",
        "This commonly means wrong project credentials, missing table, or access constraints in the connected project.",
      ],
      headline: "Supabase Query Failed",
      quickChecks: [
        "Verify eventsregistrations table exists in the connected Supabase project",
        "Verify runtime keys point to the intended Supabase URL/project",
        "Check Supabase logs for failed query details while loading /stats",
      ],
    };
  }

  return {
    details: [
      "The stats service returned an unexpected failure.",
      "Use the raw error and server logs to identify the exact failing dependency.",
    ],
    headline: "Unexpected Stats Service Error",
    quickChecks: [
      "Review server console logs for this request",
      "Confirm Doppler/runtime variables are loaded into the Next process",
      "Call /api/stats/registrations with x-foundathon-stats-key to compare behavior",
    ],
  };
};

const StatsErrorView = ({ error }: { error: ServiceFailure }) => {
  const help = getStatsErrorHelp(error.error);

  return (
    <main className="min-h-screen bg-gray-200 text-foreground relative overflow-hidden">
      <div className="fncontainer relative py-16">
        <section className="mx-auto max-w-3xl rounded-2xl border border-b-4 border-fnred bg-background p-8 shadow-xl">
          <h1 className="text-2xl font-black uppercase tracking-tight text-fnred">
            Stats Unavailable
          </h1>
          <p className="mt-2 text-sm font-bold uppercase tracking-wider text-fnred/90">
            {help.headline}
          </p>
          <p className="mt-3 text-sm font-medium text-foreground/80">
            {error.error}
          </p>

          <div className="mt-5 rounded-xl border border-foreground/10 bg-white p-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-fnblue">
              What this means
            </p>
            <ul className="mt-2 space-y-2 text-sm font-medium text-foreground/80">
              {help.details.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>

          <div className="mt-4 rounded-xl border border-foreground/10 bg-white p-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-fnblue">
              Quick checks
            </p>
            <ul className="mt-2 space-y-2 text-sm font-medium text-foreground/80">
              {help.quickChecks.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
};

export default async function StatsPage({ searchParams }: StatsPageProps) {
  const params = await searchParams;
  const providedKey = toSingleSearchParam(params.key)?.trim();
  const expectedKey = getFoundathonStatsPageKey()?.trim();

  if (!providedKey || !expectedKey) {
    notFound();
  }

  if (!isValidPageKey({ expected: expectedKey, provided: providedKey })) {
    notFound();
  }

  const query = parseStatsQueryInput(params);
  const result = await getRegistrationStats(query);
  if (!result.ok) {
    return <StatsErrorView error={result} />;
  }

  return (
    <StatsDashboardClient
      generatedAtLabel={formatGeneratedAt(result.data.generatedAt)}
      statsKey={providedKey}
      stats={result.data}
    />
  );
}
