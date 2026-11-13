"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { FixedActions } from "@/components/Page";
import { Sheet } from "@/components/Sheet";
import { ErrorNote, SectionHeader, Stat, StatRow, StatusPill, btnPrimary, cardClass, inputClass, labelCaps } from "@/components/ui";
import { fmtMoney, fmtShortDate, monthEnd, sgDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { claimTitle, type ClaimCategory, type ClaimRow } from "@/lib/types";
import { deleteClaim, receiptUrl, saveClaim } from "../actions";

const TYPES: { value: ClaimCategory; label: string }[] = [
  { value: "transport", label: "Transport" },
  { value: "food", label: "Food" },
  { value: "others", label: "Others" },
];

const MAX_RECEIPT_MB = 10;

/** Content type for the receipts bucket (some phones send an empty type). */
const RECEIPT_TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", heif: "image/heif", pdf: "application/pdf" };
const receiptType = (f: File) => f.type || RECEIPT_TYPES[(f.name.split(".").pop() || "").toLowerCase()] || "application/octet-stream";

export function ClaimsClient({ claims, crewId, month, openNew }: { claims: ClaimRow[]; crewId: string; month: string; openNew: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [editing, setEditing] = useState<ClaimRow | "new" | null>(openNew ? "new" : null);

  // Drop ?new=1 from the URL once the sheet is open, so refresh doesn't reopen it.
  useEffect(() => {
    if (openNew) router.replace(`${pathname}?month=${month.slice(0, 7)}`, { scroll: false });
  }, [openNew, pathname, month, router]);

  const sum = (s: ClaimRow["status"][]) => claims.filter((c) => s.includes(c.status)).reduce((t, c) => t + c.amount, 0);

  return (
    <>
      <div className={`${cardClass} flex flex-col gap-4 p-5`}>
        <span className="text-[13px] font-medium text-muted">Total claimed</span>
        <p className="text-[28px] font-bold">{fmtMoney(claims.reduce((t, c) => t + c.amount, 0))}</p>
        <StatRow>
          <Stat label="Approved" value={fmtMoney(sum(["approved", "paid"]))} />
          <Stat label="Pending" value={fmtMoney(sum(["pending"]))} />
          <Stat label="Rejected" value={fmtMoney(sum(["rejected"]))} />
        </StatRow>
      </div>

      <SectionHeader title="All claims" aside={`${claims.length} ${claims.length === 1 ? "claim" : "claims"}`} />

      <div className="-mt-3 flex flex-col gap-3">
        {claims.length === 0 && <p className={`${cardClass} px-4 py-4 text-[13px] text-muted`}>No claims this month.</p>}
        {claims.map((c) => (
          <ClaimCard key={c.id} claim={c} onEdit={() => setEditing(c)} />
        ))}
      </div>

      <FixedActions aboveTabs>
        <button type="button" onClick={() => setEditing("new")} className={`${btnPrimary} flex-1 whitespace-pre md:flex-none md:px-8`}>
          {"+  New claim"}
        </button>
      </FixedActions>

      {editing && (
        <ClaimSheet
          key={editing === "new" ? "new" : editing.id}
          claim={editing === "new" ? null : editing}
          crewId={crewId}
          month={month}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function ClaimCard({ claim, onEdit }: { claim: ClaimRow; onEdit: () => void }) {
  const [opening, setOpening] = useState(false);
  const editable = claim.status === "pending";

  async function openReceipt(e: React.MouseEvent) {
    e.stopPropagation();
    if (!claim.receipt_path) return;
    setOpening(true);
    const { url } = await receiptUrl(claim.receipt_path);
    setOpening(false);
    if (url) window.open(url, "_blank", "noopener");
  }

  const header = (
    <div className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-subtle text-base font-semibold">⎙</span>
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <p className="truncate text-sm font-semibold">{claimTitle(claim)}</p>
        <p className="truncate text-xs text-muted">
          {fmtShortDate(claim.claim_date)}
          {claim.receipt_path && (
            <>
              {" · "}
              <span role="link" tabIndex={0} onClick={openReceipt} className="font-medium text-ink underline">
                {opening ? "Opening…" : "Receipt"}
              </span>
            </>
          )}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-[5px]">
        <p className="text-sm font-semibold">{fmtMoney(claim.amount)}</p>
        <StatusPill status={claim.status} />
      </div>
    </div>
  );

  return (
    <div className={`${cardClass} flex flex-col gap-3 p-4`}>
      {editable ? (
        <button type="button" onClick={onEdit} className="text-left" aria-label={`Edit ${claimTitle(claim)} claim`}>
          {header}
        </button>
      ) : (
        header
      )}
      {claim.status === "rejected" && (
        <div className="flex items-center gap-2.5 rounded-[10px] bg-bad/[0.06] px-3 py-2.5">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-[11px] font-semibold text-bad">Reason</p>
            <p className="text-[13px] font-medium">{claim.reject_reason || "No reason given"}</p>
          </div>
          <button type="button" onClick={onEdit} className="shrink-0 rounded-[10px] bg-ink px-3 py-2 text-xs font-semibold text-white">
            Edit &amp; resubmit
          </button>
        </div>
      )}
    </div>
  );
}

function ClaimSheet({
  claim,
  crewId,
  month,
  onClose,
  onSaved,
}: {
  claim: ClaimRow | null;
  crewId: string;
  month: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = sgDate();
  const inMonth = today >= month && today <= monthEnd(month);
  const [category, setCategory] = useState<ClaimCategory>(claim?.category ?? "transport");
  const [description, setDescription] = useState(claim?.description ?? "");
  const [amount, setAmount] = useState(claim ? claim.amount.toFixed(2) : "");
  const [date, setDate] = useState(claim?.claim_date ?? (inMonth ? today : monthEnd(month) < today ? monthEnd(month) : today));
  const [file, setFile] = useState<File | null>(null);
  const [keepReceipt, setKeepReceipt] = useState(Boolean(claim?.receipt_path));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const amountNum = Number(amount);
  const valid = amountNum > 0 && Boolean(date) && (category !== "others" || description.trim().length > 0);

  const submit = () =>
    start(async () => {
      setError(null);
      let receiptPath = keepReceipt ? claim?.receipt_path ?? null : null;
      if (file) {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
        const path = `${crewId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await createClient().storage.from("receipts").upload(path, file, { contentType: receiptType(file) });
        if (upErr) return setError(`Receipt upload failed: ${upErr.message}`);
        receiptPath = path;
      }
      const res = await saveClaim({
        id: claim?.id,
        category,
        description,
        amount: amountNum,
        claimDate: date,
        receiptPath,
      });
      if (res.error) setError(res.error);
      else onSaved();
    });

  const remove = () =>
    start(async () => {
      if (!claim) return;
      const res = await deleteClaim(claim.id);
      if (res.error) setError(res.error);
      else onSaved();
    });

  const receiptName = file?.name ?? (keepReceipt ? "Receipt attached" : null);

  return (
    <Sheet open title={claim ? (claim.status === "rejected" ? "Edit & resubmit" : "Edit claim") : "New claim"} onClose={onClose}>
      <div className="flex flex-col gap-2">
        <span className={labelCaps}>Type</span>
        <div className="flex gap-2" role="radiogroup" aria-label="Claim type">
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={category === t.value}
              onClick={() => setCategory(t.value)}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold ${
                category === t.value ? "bg-ink text-white" : "border border-strong-line bg-card"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {category === "others" && (
        <label className="flex flex-col gap-2">
          <span className={labelCaps}>What did you buy?</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Cleaning gloves"
            maxLength={120}
            className={`${inputClass} py-[13px]`}
          />
        </label>
      )}

      <div className="flex gap-3">
        <label className="flex min-w-0 flex-1 flex-col gap-2">
          <span className={labelCaps}>Amount</span>
          <div className="flex items-center gap-2 rounded-xl border border-field px-3.5 py-[13px] focus-within:border-ink">
            <span className="text-[15px] font-semibold text-muted">$</span>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1"))}
              placeholder="0.00"
              className="min-w-0 flex-1 bg-transparent text-[15px] font-medium outline-none placeholder:text-faint"
            />
          </div>
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-2">
          <span className={labelCaps}>Date</span>
          <div className="relative flex items-center gap-2 rounded-xl border border-field px-3.5 py-[13px] focus-within:border-ink">
            <span className="flex-1 text-[15px] font-medium">{date ? fmtShortDate(date) : "Pick a date"}</span>
            <Image src="/icon-select-chevron.svg" alt="" width={9.75} height={5.75} />
            <input
              type="date"
              aria-label="Date"
              max={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="absolute inset-0 opacity-0"
            />
          </div>
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <span className={labelCaps}>Receipt (optional)</span>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-3 rounded-xl border border-dashed border-[#ccc] p-3.5 text-left"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-subtle text-lg font-semibold">
            {receiptName ? "✓" : "+"}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-sm font-semibold">{receiptName ?? "Take photo or upload"}</span>
            <span className="text-xs text-muted">{receiptName ? "Tap to replace" : "JPG, PNG or PDF"}</span>
          </span>
          {receiptName && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                setKeepReceipt(false);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="text-xs font-semibold text-muted"
            >
              Remove
            </span>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            if (f && f.size > MAX_RECEIPT_MB * 1024 * 1024) {
              setError(`Receipts must be under ${MAX_RECEIPT_MB} MB.`);
              e.target.value = "";
              return;
            }
            setError(null);
            setFile(f);
          }}
        />
      </div>

      <ErrorNote>{error}</ErrorNote>

      <button type="button" onClick={submit} disabled={!valid || pending} className={btnPrimary}>
        {pending ? "Submitting…" : claim ? "Resubmit claim" : "Submit claim"}
      </button>
      {claim?.status === "pending" && (
        <button type="button" onClick={remove} disabled={pending} className="-mt-2 py-1 text-sm font-semibold text-bad">
          Delete claim
        </button>
      )}
    </Sheet>
  );
}
