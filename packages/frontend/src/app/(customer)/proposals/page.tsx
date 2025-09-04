// src/app/(customer)/proposals/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { fetchProposals, submitUserVotes, type Proposal } from "@/lib/api/votes";

// ui primitives per your folders
import Button from "@/components/ui/primitives/button";
import Checkbox from "@/components/ui/primitives/checkbox";
import Badge from "@/components/ui/data-display/badge";
import EmptyState from "@/components/ui/data-display/empty-state";
import Pagination from "@/components/ui/navigation/pagination";

const cardBase =
  "group relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white/70 shadow-sm hover:shadow-md transition-all";

export default function ProposalsPage() {
  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{ totalPages: number; total: number } | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    fetchProposals({ status: "active", page, limit: 12 })
      .then((data) => {
        if (!mounted) return;
        setProposals(data.proposals);
        setPagination({ totalPages: data.pagination.totalPages, total: data.pagination.total });
      })
      .catch((e: any) => mounted && setError(e.message || "Failed to load proposals"))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [page]);

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([k]) => k),
    [selected]
  );

  const toggle = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }));
  const clearSelection = () => setSelected({});

  async function handleSubmit() {
    if (!selectedIds.length) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const result = await submitUserVotes({ proposalIds: selectedIds, voteType: "for" });
      setMessage(result?.message || "Your votes were recorded.");
      clearSelection();
    } catch (e: any) {
      setError(e.message || "Failed to submit votes.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Choose your favorites</h1>
          <p className="text-slate-500">
            Select any proposals you like. Submit once — we’ll record your choices for this session.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && <Badge className="rounded-full">{selectedIds.length} selected</Badge>}
          <Button aria-label="Submit selected votes" disabled={submitting || selectedIds.length === 0} onClick={handleSubmit}>
            {submitting ? "Submitting…" : "Submit your votes"}
          </Button>
        </div>
      </header>

      {message && (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-900">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`${cardBase} h-64 animate-pulse bg-slate-100`} />
          ))}
        </div>
      ) : proposals.length === 0 ? (
        <EmptyState
          title="No proposals yet"
          description="Please check back soon — this brand hasn’t opened any active proposals."
          action={
            <Link href="/">
              <Button>Back home</Button>
            </Link>
          }
        />
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {proposals.map((p) => {
              const picked = !!selected[p.id];
              return (
                <li key={p.id} className={cardBase}>
                  <button className="absolute inset-0 z-10" aria-pressed={picked} onClick={() => toggle(p.id)} />
                  <div className="relative h-40 w-full bg-gradient-to-br from-indigo-50 to-slate-50">
                    {p.imageUrl && (
                      <Image
                        src={p.imageUrl}
                        alt={p.description}
                        fill
                        className="object-cover"
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      />
                    )}
                    <div
                      className={`pointer-events-none absolute inset-0 rounded-3xl ring-1 transition ${
                        picked ? "ring-indigo-500/60" : "ring-transparent group-hover:ring-slate-200"
                      }`}
                    />
                  </div>
                  <div className="flex items-start gap-3 p-4">
                    <Checkbox checked={picked} readOnly />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{p.description}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(p.createdAt).toLocaleDateString()} · {p.category ?? "general"}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {pagination && pagination.totalPages > 1 && (
            <div className="mt-8">
              <Pagination page={page} totalPages={pagination.totalPages} onChange={(p) => setPage(p)} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
