import { PROBLEM_STATEMENT_CAP } from "@/data/problem-statements";
import { EVENT_ID } from "@/server/registration/constants";
import { getServiceRoleSupabaseClient } from "@/server/supabase/service-role-client";

const SETTINGS_TABLE = "foundathon_event_settings";
const CAP_CACHE_TTL_MS = 15_000;
const REGISTRATIONS_OPEN_CACHE_TTL_MS = 15_000;

let capCache: { expiresAtMs: number; value: number } | null = null;
let registrationsOpenCache: { expiresAtMs: number; value: boolean } | null =
  null;

const toPositiveInteger = (value: unknown) => {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
};

const getFallbackCap = () => PROBLEM_STATEMENT_CAP;
const getFallbackRegistrationsOpen = () => true;

const readProblemStatementCapFromSettings = async () => {
  const supabase = getServiceRoleSupabaseClient();
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .select("problem_statement_cap")
      .eq("event_id", EVENT_ID)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return toPositiveInteger(
      (data as { problem_statement_cap?: unknown }).problem_statement_cap,
    );
  } catch {
    return null;
  }
};

const toBoolean = (value: unknown) => {
  if (typeof value === "boolean") {
    return value;
  }

  return null;
};

const readRegistrationsOpenFromSettings = async () => {
  const supabase = getServiceRoleSupabaseClient();
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .select("registrations_open")
      .eq("event_id", EVENT_ID)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return toBoolean(
      (data as { registrations_open?: unknown }).registrations_open,
    );
  } catch {
    return null;
  }
};

export const clearProblemStatementCapCacheForTests = () => {
  capCache = null;
  registrationsOpenCache = null;
};

type GetProblemStatementCapOptions = {
  useCache?: boolean;
};

export const getProblemStatementCap = async ({
  useCache = true,
}: GetProblemStatementCapOptions = {}) => {
  const nowMs = Date.now();
  if (useCache && capCache && capCache.expiresAtMs > nowMs) {
    return capCache.value;
  }

  const cap = await readProblemStatementCapFromSettings();
  if (cap === null) {
    return getFallbackCap();
  }

  capCache = {
    expiresAtMs: nowMs + CAP_CACHE_TTL_MS,
    value: cap,
  };

  return cap;
};

type GetRegistrationsOpenOptions = {
  useCache?: boolean;
};

export const getRegistrationsOpen = async ({
  useCache = true,
}: GetRegistrationsOpenOptions = {}) => {
  const nowMs = Date.now();
  if (
    useCache &&
    registrationsOpenCache &&
    registrationsOpenCache.expiresAtMs > nowMs
  ) {
    return registrationsOpenCache.value;
  }

  const registrationsOpen = await readRegistrationsOpenFromSettings();
  if (registrationsOpen === null) {
    return getFallbackRegistrationsOpen();
  }

  registrationsOpenCache = {
    expiresAtMs: nowMs + REGISTRATIONS_OPEN_CACHE_TTL_MS,
    value: registrationsOpen,
  };

  return registrationsOpen;
};

type UpdateProblemStatementCapResult =
  | { cap: number; ok: true }
  | { error: string; ok: false; status: number };

export const updateProblemStatementCap = async (
  cap: number,
): Promise<UpdateProblemStatementCapResult> => {
  const normalizedCap = toPositiveInteger(cap);
  if (!normalizedCap) {
    return {
      error: "Problem statement cap must be a positive integer.",
      ok: false,
      status: 400,
    };
  }

  const supabase = getServiceRoleSupabaseClient();
  if (!supabase) {
    return {
      error: "Supabase service role client is not configured.",
      ok: false,
      status: 500,
    };
  }

  let error: { message?: string } | null = null;
  try {
    ({ error } = await supabase.from(SETTINGS_TABLE).upsert(
      {
        event_id: EVENT_ID,
        problem_statement_cap: normalizedCap,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_id" },
    ));
  } catch (caughtError) {
    return {
      error:
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to update problem statement cap in settings.",
      ok: false,
      status: 500,
    };
  }

  if (error) {
    return {
      error:
        error.message || "Failed to update problem statement cap in settings.",
      ok: false,
      status: 500,
    };
  }

  capCache = {
    expiresAtMs: Date.now() + CAP_CACHE_TTL_MS,
    value: normalizedCap,
  };

  return {
    cap: normalizedCap,
    ok: true,
  };
};

type UpdateRegistrationsOpenResult =
  | { ok: true; registrationsOpen: boolean }
  | { error: string; ok: false; status: number };

export const updateRegistrationsOpen = async (
  registrationsOpen: boolean,
): Promise<UpdateRegistrationsOpenResult> => {
  if (typeof registrationsOpen !== "boolean") {
    return {
      error: "Registrations open flag must be a boolean.",
      ok: false,
      status: 400,
    };
  }

  const supabase = getServiceRoleSupabaseClient();
  if (!supabase) {
    return {
      error: "Supabase service role client is not configured.",
      ok: false,
      status: 500,
    };
  }

  const cap = await getProblemStatementCap({ useCache: false });

  let error: { message?: string } | null = null;
  try {
    ({ error } = await supabase.from(SETTINGS_TABLE).upsert(
      {
        event_id: EVENT_ID,
        problem_statement_cap: cap,
        registrations_open: registrationsOpen,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_id" },
    ));
  } catch (caughtError) {
    return {
      error:
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to update registrations open setting.",
      ok: false,
      status: 500,
    };
  }

  if (error) {
    return {
      error: error.message || "Failed to update registrations open setting.",
      ok: false,
      status: 500,
    };
  }

  registrationsOpenCache = {
    expiresAtMs: Date.now() + REGISTRATIONS_OPEN_CACHE_TTL_MS,
    value: registrationsOpen,
  };

  return {
    ok: true,
    registrationsOpen,
  };
};
