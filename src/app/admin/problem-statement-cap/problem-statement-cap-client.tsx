"use client";

import { type FormEvent, useState } from "react";
import { FnButton } from "@/components/ui/fn-button";
import { toast } from "@/hooks/use-toast";

type UpdateResponse = {
  cap?: number;
  error?: string;
};

type AdminProblemStatementCapClientProps = {
  adminEmail: string;
  initialCap: number;
};

export default function AdminProblemStatementCapClient({
  adminEmail,
  initialCap,
}: AdminProblemStatementCapClientProps) {
  const [capInput, setCapInput] = useState(String(initialCap));
  const [currentCap, setCurrentCap] = useState(initialCap);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = Number.parseInt(capInput.trim(), 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      toast({
        title: "Invalid Cap",
        description: "Cap must be a positive integer.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/problem-statement-cap", {
        body: JSON.stringify({ cap: parsed }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });

      const data = (await response
        .json()
        .catch(() => null)) as UpdateResponse | null;

      if (!response.ok || typeof data?.cap !== "number") {
        toast({
          title: "Update Failed",
          description:
            data?.error ??
            "Could not update the cap. Verify admin access and try again.",
          variant: "destructive",
        });
        return;
      }

      setCurrentCap(data.cap);
      setCapInput(String(data.cap));

      toast({
        title: "Cap Updated",
        description: `Problem statement cap is now ${data.cap}.`,
      });
    } catch {
      toast({
        title: "Network Error",
        description: "Could not reach the admin API. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-200 text-foreground relative overflow-hidden">
      <div className="fncontainer relative py-16">
        <section className="mx-auto max-w-xl rounded-2xl border border-b-4 border-fnblue bg-background p-8 shadow-xl">
          <p className="text-xs uppercase tracking-[0.16em] text-fnblue font-semibold">
            Admin Control
          </p>
          <h1 className="mt-2 text-2xl font-black uppercase tracking-tight">
            Problem Statement Cap
          </h1>
          <p className="mt-2 text-sm text-foreground/75">
            Signed in as <span className="font-semibold">{adminEmail}</span>
          </p>

          <div className="mt-6 rounded-xl border border-fnblue/30 bg-fnblue/8 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-fnblue font-semibold">
              Current Cap
            </p>
            <p className="mt-1 text-3xl font-black text-fnblue">{currentCap}</p>
          </div>

          <form className="mt-6 space-y-4" onSubmit={submit}>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground/80">
                New Cap
              </span>
              <input
                className="mt-2 w-full rounded-xl border border-foreground/20 bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-fnblue"
                inputMode="numeric"
                min={1}
                name="cap"
                onChange={(event) => setCapInput(event.target.value)}
                step={1}
                value={capInput}
              />
            </label>

            <FnButton
              type="submit"
              disabled={isSaving}
              loading={isSaving}
              loadingText="Saving..."
            >
              Update Cap
            </FnButton>
          </form>
        </section>
      </div>
    </main>
  );
}
