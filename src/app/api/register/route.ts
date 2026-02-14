import { type NextRequest, NextResponse } from "next/server";
import { teamSubmissionSchema } from "@/lib/register-schema";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function createSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

function transformToLegacyFormat(data: any) {
  const allMembers = [data.lead, ...data.members];

  return {
    teamName: data.teamName,

    fullName1: allMembers[0]?.name ?? null,
    rollNumber1: allMembers[0]?.raNumber ?? null,
    dept1: allMembers[0]?.dept ?? null,

    fullName2: allMembers[1]?.name ?? null,
    rollNumber2: allMembers[1]?.raNumber ?? null,
    dept2: allMembers[1]?.dept ?? null,

    fullName3: allMembers[2]?.name ?? null,
    rollNumber3: allMembers[2]?.raNumber ?? null,
    dept3: allMembers[2]?.dept ?? null,

    fullName4: allMembers[3]?.name ?? null,
    rollNumber4: allMembers[3]?.raNumber ?? null,
    dept4: allMembers[3]?.dept ?? null,

    whatsAppNumber: data.lead?.contact ?? null,

    paymentAgreement: true,
  };
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = teamSubmissionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload." },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Prevent duplicate registration
  const { data: existing } = await supabase
    .from("eventsregistrations")
    .select("id")
    .eq("event_id", '583a3b40-da9d-412a-a266-cc7e64330b16') //TODO: Replace with actual event ID
    .eq("application_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "You have already registered for this event." },
      { status: 409 }
    );
  }

  const legacyDetails = transformToLegacyFormat(parsed.data);

  const { data, error } = await supabase
    .from("eventsregistrations")
    .insert([
      {
        event_id:'583a3b40-da9d-412a-a266-cc7e64330b16', //TODO: Replace with actual event ID
        event_title: "Foundathon 3.0",
        application_id: user.id,
        details: legacyDetails,
        registration_email: user.email,
        is_team_entry: true,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Insert error:", error);
    return NextResponse.json(
      { error: "Failed to register team." },
      { status: 500 }
    );
  }

  return NextResponse.json({ registration: data }, { status: 201 });
}

export async function GET() {
  const supabase = await createSupabaseClient();

  const { data, error } = await supabase
    .from("eventsregistrations")
    .select("id, created_at, details, is_approved")
    .eq("event_id",'583a3b40-da9d-412a-a266-cc7e64330b16') //TODO: Add event ID filter
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ registrations: data });
}
