"use client";

import { ExternalLink, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import PresentationPreviewModal from "@/components/presentation/presentation-preview-modal";
import { FnButton } from "@/components/ui/fn-button";
import { PROBLEM_STATEMENTS } from "@/data/problem-statements";
import { toast } from "@/hooks/use-toast";

type AdminReviewStatementFilter =
  | "all"
  | (typeof PROBLEM_STATEMENTS)[number]["id"];
type AdminReviewApprovalStatus = "accepted" | "rejected" | "submitted";

type AdminReviewTab = {
  count: number;
  id: string;
  label: string;
};

type AdminReviewSubmissionTeam = {
  approvalStatus: AdminReviewApprovalStatus;
  id: string;
  leadName: string;
  presentationFileName: string;
  presentationPublicUrl: string;
  presentationUploadedAt: string;
  problemStatementId: string | null;
  problemStatementTitle: string | null;
  registrationEmail: string;
  teamName: string;
};

type AdminReviewSubmissionsResponse = {
  statement: AdminReviewStatementFilter;
  tabs: AdminReviewTab[];
  teams: AdminReviewSubmissionTeam[];
};

export type TeamSubmissionStatus = "submitted" | "non_submitted";

export type AdminTeamContactRow = {
  id: string;
  leadPhone: string | null;
  memberPhones: string[];
  problemStatementNumber: string | null;
  problemStatementTitle: string | null;
  submissionStatus: TeamSubmissionStatus;
  teamName: string;
};

type DecisionApiResponse = {
  approvalStatus: "accepted" | "rejected";
  mail: {
    error?: string;
    recipient: string | null;
    sent: boolean;
  };
  teamId: string;
};

type AdminReviewClientProps = {
  adminEmail: string;
  initialTeamContacts: AdminTeamContactRow[];
};

type SubmissionFilter = "all" | TeamSubmissionStatus;
type SubmissionSortOrder = "submitted_first" | "non_submitted_first";

const ALL_STATEMENTS = ["all", ...PROBLEM_STATEMENTS.map((item) => item.id)];
const CONTACT_EXPORT_COLUMNS = [
  "Team Name",
  "Problem Statement Number",
  "Problem Statement",
  "Lead Phone Number",
  "Team Member Phone Numbers",
  "Submission Status",
] as const;

const DEFAULT_TABS: AdminReviewTab[] = [
  {
    count: 0,
    id: "all",
    label: "All",
  },
  ...PROBLEM_STATEMENTS.map((statement) => ({
    count: 0,
    id: statement.id,
    label: statement.id.toUpperCase(),
  })),
];

const toStatusMeta = (status: AdminReviewApprovalStatus) => {
  switch (status) {
    case "accepted":
      return {
        badgeClass: "border-fngreen/40 bg-fngreen/10 text-fngreen",
        label: "Accepted",
      };
    case "rejected":
      return {
        badgeClass: "border-fnred/40 bg-fnred/10 text-fnred",
        label: "Rejected",
      };
    default:
      return {
        badgeClass: "border-fnblue/40 bg-fnblue/10 text-fnblue",
        label: "Submitted",
      };
  }
};

const toDisplayDateTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return value;
  }

  return parsed.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
};

const toCsvCell = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) {
    return "";
  }

  const normalized = String(value);
  if (
    normalized.includes(",") ||
    normalized.includes('"') ||
    normalized.includes("\n")
  ) {
    return `"${normalized.replaceAll('"', '""')}"`;
  }

  return normalized;
};

const toCsv = ({
  columns,
  rows,
}: {
  columns: readonly string[];
  rows: Array<Record<string, number | string | null>>;
}) => {
  const header = columns.map((column) => toCsvCell(column)).join(",");
  const dataRows = rows.map((row) =>
    columns.map((column) => toCsvCell(row[column])).join(","),
  );

  return [header, ...dataRows].join("\n");
};

const toSubmissionStatusLabel = (value: TeamSubmissionStatus) =>
  value === "submitted" ? "Submitted" : "Non-submitted";

const toSubmissionStatusSortRank = ({
  sortOrder,
  status,
}: {
  sortOrder: SubmissionSortOrder;
  status: TeamSubmissionStatus;
}) => {
  if (sortOrder === "submitted_first") {
    return status === "submitted" ? 0 : 1;
  }

  return status === "non_submitted" ? 0 : 1;
};

const isStatementFilter = (
  value: string,
): value is AdminReviewStatementFilter => ALL_STATEMENTS.includes(value);

export default function AdminReviewClient({
  adminEmail,
  initialTeamContacts,
}: AdminReviewClientProps) {
  const [activeStatement, setActiveStatement] =
    useState<AdminReviewStatementFilter>("all");
  const [tabs, setTabs] = useState<AdminReviewTab[]>(DEFAULT_TABS);
  const [teams, setTeams] = useState<AdminReviewSubmissionTeam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [pendingDecision, setPendingDecision] = useState<{
    decision: "accepted" | "rejected";
    teamId: string;
  } | null>(null);
  const [previewTeam, setPreviewTeam] =
    useState<AdminReviewSubmissionTeam | null>(null);
  const [submissionFilter, setSubmissionFilter] =
    useState<SubmissionFilter>("all");
  const [submissionSortOrder, setSubmissionSortOrder] =
    useState<SubmissionSortOrder>("non_submitted_first");

  const submittedCount = useMemo(
    () =>
      initialTeamContacts.filter(
        (team) => team.submissionStatus === "submitted",
      ).length,
    [initialTeamContacts],
  );
  const nonSubmittedCount = useMemo(
    () =>
      initialTeamContacts.filter(
        (team) => team.submissionStatus === "non_submitted",
      ).length,
    [initialTeamContacts],
  );

  const filteredAndSortedTeamContacts = useMemo(() => {
    const filteredContacts =
      submissionFilter === "all"
        ? initialTeamContacts
        : initialTeamContacts.filter(
            (team) => team.submissionStatus === submissionFilter,
          );

    return [...filteredContacts].sort((left, right) => {
      const submissionRankDifference =
        toSubmissionStatusSortRank({
          sortOrder: submissionSortOrder,
          status: left.submissionStatus,
        }) -
        toSubmissionStatusSortRank({
          sortOrder: submissionSortOrder,
          status: right.submissionStatus,
        });
      if (submissionRankDifference !== 0) {
        return submissionRankDifference;
      }

      const statementCompare = (
        left.problemStatementNumber ?? ""
      ).localeCompare(right.problemStatementNumber ?? "", undefined, {
        numeric: true,
        sensitivity: "base",
      });
      if (statementCompare !== 0) {
        return statementCompare;
      }

      return left.teamName.localeCompare(right.teamName, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });
  }, [initialTeamContacts, submissionFilter, submissionSortOrder]);

  const fetchTeams = useCallback(
    async ({
      showErrorToast,
      statement,
    }: {
      showErrorToast?: boolean;
      statement: AdminReviewStatementFilter;
    }) => {
      setIsLoading(true);
      setFetchError("");
      setActiveStatement(statement);

      try {
        const response = await fetch(
          `/api/admin/review-submissions?statement=${encodeURIComponent(
            statement,
          )}`,
        );
        const data = (await response.json().catch(() => null)) as
          | AdminReviewSubmissionsResponse
          | {
              error?: string;
            }
          | null;

        if (!response.ok || !data || !("teams" in data) || !("tabs" in data)) {
          const error =
            data && "error" in data && typeof data.error === "string"
              ? data.error
              : "Could not load submitted teams.";
          setFetchError(error);
          setTeams([]);
          setTabs(DEFAULT_TABS);

          if (showErrorToast) {
            toast({
              title: "Failed to Load Teams",
              description: error,
              variant: "destructive",
            });
          }
          return;
        }

        setTeams(data.teams);
        setTabs(data.tabs.length > 0 ? data.tabs : DEFAULT_TABS);
      } catch {
        const error = "Network issue while loading submitted teams.";
        setFetchError(error);
        setTeams([]);
        setTabs(DEFAULT_TABS);

        if (showErrorToast) {
          toast({
            title: "Network Error",
            description: error,
            variant: "destructive",
          });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchTeams({ statement: "all" }).catch(() => undefined);
  }, [fetchTeams]);

  const onStatementTabClick = (tabId: string) => {
    if (!isStatementFilter(tabId) || tabId === activeStatement || isLoading) {
      return;
    }

    fetchTeams({ showErrorToast: true, statement: tabId }).catch(
      () => undefined,
    );
  };

  const updateDecision = async ({
    decision,
    teamId,
  }: {
    decision: "accepted" | "rejected";
    teamId: string;
  }) => {
    setPendingDecision({ decision, teamId });

    try {
      const response = await fetch(`/api/admin/review-submissions/${teamId}`, {
        body: JSON.stringify({ decision }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });

      const data = (await response.json().catch(() => null)) as
        | DecisionApiResponse
        | { error?: string }
        | null;

      if (
        !response.ok ||
        !data ||
        !("approvalStatus" in data) ||
        !("mail" in data)
      ) {
        const error =
          data && "error" in data && typeof data.error === "string"
            ? data.error
            : "Could not update decision.";
        toast({
          title: "Decision Failed",
          description: error,
          variant: "destructive",
        });
        return;
      }

      setTeams((current) =>
        current.map((team) =>
          team.id === teamId
            ? {
                ...team,
                approvalStatus: data.approvalStatus,
              }
            : team,
        ),
      );

      if (!data.mail.sent) {
        toast({
          title: "Decision Saved, Mail Failed",
          description:
            data.mail.error ??
            `Decision was saved for this team, but mail could not be sent to ${
              data.mail.recipient ?? "the registered email"
            }.`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: decision === "accepted" ? "Team Accepted" : "Team Rejected",
        description: data.mail.recipient
          ? `Decision saved and mail sent to ${data.mail.recipient}.`
          : "Decision saved and mail sent successfully.",
      });
    } catch {
      toast({
        title: "Network Error",
        description: "Could not reach admin review API.",
        variant: "destructive",
      });
    } finally {
      setPendingDecision(null);
    }
  };

  const activeTabCount = useMemo(() => {
    const matchedTab = tabs.find((tab) => tab.id === activeStatement);
    return matchedTab?.count ?? 0;
  }, [activeStatement, tabs]);

  const downloadContactsCsv = () => {
    const rows = filteredAndSortedTeamContacts.map((team) => ({
      "Lead Phone Number": team.leadPhone ?? "",
      "Problem Statement": team.problemStatementTitle ?? "",
      "Problem Statement Number": team.problemStatementNumber ?? "",
      "Submission Status": toSubmissionStatusLabel(team.submissionStatus),
      "Team Member Phone Numbers":
        team.memberPhones.length > 0 ? team.memberPhones.join(", ") : "",
      "Team Name": team.teamName,
    }));
    const csv = toCsv({
      columns: CONTACT_EXPORT_COLUMNS,
      rows,
    });

    const blob = new Blob([csv], { type: "text/csv; charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${[
      "foundathon-team-contact-list",
      submissionFilter,
      new Date().toISOString().slice(0, 10),
    ].join("-")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-gray-200 text-foreground relative overflow-hidden">
      <div className="fncontainer relative space-y-8 py-10 md:py-14">
        <section className="rounded-2xl border border-b-4 border-fnblue bg-background/95 p-5 shadow-xl md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="inline-flex rounded-full border border-fnblue bg-fnblue/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-fnblue">
                Admin PPT Review
              </p>
              <h1 className="mt-3 text-3xl font-black uppercase tracking-tight md:text-4xl">
                Submission Review Queue
              </h1>
              <p className="mt-2 text-sm text-foreground/75">
                Signed in as <span className="font-semibold">{adminEmail}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <FnButton
                type="button"
                tone="gray"
                size="sm"
                onClick={() =>
                  fetchTeams({
                    showErrorToast: true,
                    statement: activeStatement,
                  }).catch(() => undefined)
                }
                disabled={isLoading}
                loading={isLoading}
                loadingText="Refreshing..."
              >
                <RefreshCcw size={15} strokeWidth={2.6} />
                Refresh
              </FnButton>
              <FnButton asChild tone="gray" size="sm">
                <Link href="/admin/problem-statement-cap">Admin Controls</Link>
              </FnButton>
            </div>
          </div>

          <nav
            className="mt-6 flex flex-wrap gap-2"
            aria-label="Statement tabs"
          >
            {tabs.map((tab) => {
              const isActive = tab.id === activeStatement;
              return (
                <button
                  type="button"
                  key={tab.id}
                  className={[
                    "rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition",
                    isActive
                      ? "border-fnblue bg-fnblue text-white"
                      : "border-foreground/20 bg-white text-foreground/75 hover:border-fnblue hover:text-fnblue",
                  ].join(" ")}
                  onClick={() => onStatementTabClick(tab.id)}
                >
                  {tab.label} ({tab.count})
                </button>
              );
            })}
          </nav>

          <div className="mt-4 rounded-xl border border-fnblue/25 bg-fnblue/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-fnblue">
            Active Queue: {activeStatement.toUpperCase()} ({activeTabCount})
          </div>

          {fetchError ? (
            <div className="mt-4 rounded-xl border border-fnred/35 bg-fnred/10 p-4 text-sm text-fnred">
              {fetchError}
            </div>
          ) : null}

          <div className="mt-6 space-y-3">
            {!isLoading && teams.length === 0 ? (
              <div className="rounded-xl border border-foreground/15 bg-white p-6 text-center text-sm text-foreground/70">
                No PPT submitted teams found for this statement tab.
              </div>
            ) : null}

            {teams.map((team) => {
              const statusMeta = toStatusMeta(team.approvalStatus);
              const isPendingRow = pendingDecision?.teamId === team.id;

              return (
                <article
                  key={team.id}
                  className="rounded-xl border border-foreground/15 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-black uppercase tracking-tight">
                        {team.teamName}
                      </h2>
                      <p className="mt-1 text-xs text-foreground/70">
                        Lead:{" "}
                        <span className="font-semibold text-foreground">
                          {team.leadName}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-foreground/70">
                        Team ID:{" "}
                        <span className="font-mono text-foreground">
                          {team.id}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-foreground/70">
                        Registration Email:{" "}
                        <span className="font-semibold text-foreground">
                          {team.registrationEmail || "N/A"}
                        </span>
                      </p>
                    </div>
                    <div
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${statusMeta.badgeClass}`}
                    >
                      {statusMeta.label}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs text-foreground/75 md:grid-cols-2">
                    <p>
                      <span className="font-semibold text-foreground">
                        Statement:
                      </span>{" "}
                      {team.problemStatementId
                        ? `${team.problemStatementId.toUpperCase()} • ${
                            team.problemStatementTitle ?? "Unknown"
                          }`
                        : "Unassigned"}
                    </p>
                    <p>
                      <span className="font-semibold text-foreground">
                        Uploaded:
                      </span>{" "}
                      {toDisplayDateTime(team.presentationUploadedAt)}
                    </p>
                    <p>
                      <span className="font-semibold text-foreground">
                        File:
                      </span>{" "}
                      {team.presentationFileName}
                    </p>
                    <p>
                      <span className="font-semibold text-foreground">
                        PPT URL:
                      </span>{" "}
                      <a
                        href={team.presentationPublicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-fnblue hover:underline"
                      >
                        Open File <ExternalLink className="inline" size={13} />
                      </a>
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <FnButton
                      type="button"
                      tone="blue"
                      size="sm"
                      onClick={() => setPreviewTeam(team)}
                      disabled={team.presentationPublicUrl.trim().length === 0}
                    >
                      View PPT
                    </FnButton>
                    <FnButton
                      type="button"
                      tone="green"
                      size="sm"
                      onClick={() =>
                        updateDecision({
                          decision: "accepted",
                          teamId: team.id,
                        })
                      }
                      disabled={
                        isPendingRow || team.approvalStatus === "accepted"
                      }
                      loading={
                        isPendingRow && pendingDecision?.decision === "accepted"
                      }
                      loadingText="Accepting..."
                    >
                      Accept
                    </FnButton>
                    <FnButton
                      type="button"
                      tone="red"
                      size="sm"
                      onClick={() =>
                        updateDecision({
                          decision: "rejected",
                          teamId: team.id,
                        })
                      }
                      disabled={
                        isPendingRow || team.approvalStatus === "rejected"
                      }
                      loading={
                        isPendingRow && pendingDecision?.decision === "rejected"
                      }
                      loadingText="Rejecting..."
                    >
                      Reject
                    </FnButton>
                  </div>
                </article>
              );
            })}

            {isLoading ? (
              <div className="rounded-xl border border-foreground/15 bg-white p-6 text-center text-sm text-foreground/70">
                Loading submitted teams...
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-b-4 border-fnblue bg-background/95 p-5 shadow-xl md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="inline-flex rounded-full border border-fnblue bg-fnblue/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-fnblue">
                PR Calling Sheet
              </p>
              <h2 className="mt-3 text-2xl font-black uppercase tracking-tight md:text-3xl">
                Team Contact Directory
              </h2>
              <p className="mt-2 text-sm text-foreground/75">
                Export filtered rows and call teams individually.
              </p>
            </div>
            <FnButton
              type="button"
              tone="blue"
              onClick={downloadContactsCsv}
              disabled={filteredAndSortedTeamContacts.length === 0}
            >
              Download CSV
            </FnButton>
          </div>

          <div className="mt-4 grid gap-3 rounded-xl border border-fnblue/25 bg-fnblue/5 p-3 text-xs font-semibold uppercase tracking-[0.12em] text-fnblue md:grid-cols-3">
            <p>Total Teams: {initialTeamContacts.length}</p>
            <p>Submitted: {submittedCount}</p>
            <p>Non-submitted: {nonSubmittedCount}</p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSubmissionFilter("all")}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                submissionFilter === "all"
                  ? "border-fnblue bg-fnblue text-white"
                  : "border-foreground/20 bg-white text-foreground/75 hover:border-fnblue hover:text-fnblue"
              }`}
            >
              All Teams ({initialTeamContacts.length})
            </button>
            <button
              type="button"
              onClick={() => setSubmissionFilter("submitted")}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                submissionFilter === "submitted"
                  ? "border-fngreen bg-fngreen text-white"
                  : "border-foreground/20 bg-white text-foreground/75 hover:border-fngreen hover:text-fngreen"
              }`}
            >
              Submitted ({submittedCount})
            </button>
            <button
              type="button"
              onClick={() => setSubmissionFilter("non_submitted")}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                submissionFilter === "non_submitted"
                  ? "border-fnred bg-fnred text-white"
                  : "border-foreground/20 bg-white text-foreground/75 hover:border-fnred hover:text-fnred"
              }`}
            >
              Non-submitted ({nonSubmittedCount})
            </button>

            <label className="ml-auto flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-foreground/75">
              Sort Status
              <select
                className="rounded-lg border border-foreground/20 bg-background px-2 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-foreground outline-none focus:border-fnblue"
                value={submissionSortOrder}
                onChange={(event) =>
                  setSubmissionSortOrder(
                    event.target.value as SubmissionSortOrder,
                  )
                }
              >
                <option value="non_submitted_first">Non-submitted first</option>
                <option value="submitted_first">Submitted first</option>
              </select>
            </label>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-foreground/15 bg-white">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-foreground/10 bg-foreground/[0.03] text-xs uppercase tracking-[0.12em] text-foreground/70">
                  {CONTACT_EXPORT_COLUMNS.map((column) => (
                    <th key={column} className="px-3 py-2 font-semibold">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedTeamContacts.map((team) => (
                  <tr
                    key={team.id}
                    className="border-b border-foreground/10 align-top last:border-b-0"
                  >
                    <td className="px-3 py-3 font-semibold text-foreground">
                      {team.teamName}
                    </td>
                    <td className="px-3 py-3 text-foreground/90">
                      {team.problemStatementNumber ?? "N/A"}
                    </td>
                    <td className="px-3 py-3 text-foreground/90">
                      {team.problemStatementTitle ?? "Not locked"}
                    </td>
                    <td className="px-3 py-3 text-foreground/90">
                      {team.leadPhone ?? "N/A"}
                    </td>
                    <td className="px-3 py-3 text-foreground/90">
                      {team.memberPhones.length > 0
                        ? team.memberPhones.join(", ")
                        : "N/A"}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ${
                          team.submissionStatus === "submitted"
                            ? "border-fngreen/40 bg-fngreen/10 text-fngreen"
                            : "border-fnred/40 bg-fnred/10 text-fnred"
                        }`}
                      >
                        {toSubmissionStatusLabel(team.submissionStatus)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredAndSortedTeamContacts.length === 0 ? (
            <p className="mt-4 rounded-xl border border-foreground/15 bg-foreground/[0.03] p-4 text-center text-sm text-foreground/70">
              No teams match this submission filter yet.
            </p>
          ) : null}
        </section>
      </div>

      <PresentationPreviewModal
        fileName={previewTeam?.presentationFileName ?? ""}
        isOpen={Boolean(previewTeam)}
        onClose={() => setPreviewTeam(null)}
        publicUrl={previewTeam?.presentationPublicUrl ?? ""}
      />
    </main>
  );
}
