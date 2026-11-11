"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FixedActions } from "@/components/Page";
import { PhoneField } from "@/components/PhoneField";
import { ErrorNote, btnPrimary, cardClass } from "@/components/ui";
import { isSgMobile } from "@/lib/format";
import { updateContact } from "../../actions";

export function PhoneForm({ initial }: { initial: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const valid = isSgMobile(phone) && phone !== initial;

  const save = () =>
    start(async () => {
      const res = await updateContact({ phone });
      if (res.error) return setError(res.error);
      router.push("/profile");
      router.refresh();
    });

  return (
    <>
      <div className={`${cardClass} -mt-1 flex flex-col gap-4 p-5`}>
        <PhoneField label="Mobile number" value={phone} onChange={setPhone} autoFocus />
        <p className="text-xs leading-[18px] text-muted">Your admin uses this to reach you about jobs and schedules.</p>
      </div>
      <ErrorNote>{error}</ErrorNote>
      <FixedActions>
        <button type="button" onClick={save} disabled={!valid || pending} className={`${btnPrimary} flex-1 md:flex-none md:px-10`}>
          {pending ? "Saving…" : "Save"}
        </button>
      </FixedActions>
    </>
  );
}
