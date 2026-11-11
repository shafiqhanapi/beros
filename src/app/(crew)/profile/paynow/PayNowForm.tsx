"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FixedActions } from "@/components/Page";
import { PhoneField } from "@/components/PhoneField";
import { ErrorNote, Notice, btnPrimary, cardClass, inputClass, labelCaps } from "@/components/ui";
import { isSgMobile } from "@/lib/format";
import { updateContact } from "../../actions";

export function PayNowForm({ initialName, initialPhone }: { initialName: string; initialPhone: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const changed = name.trim() !== initialName || phone !== initialPhone;
  const valid = name.trim().length > 0 && isSgMobile(phone) && changed;

  const save = () =>
    start(async () => {
      const res = await updateContact({ paynowName: name.trim(), paynowPhone: phone });
      if (res.error) return setError(res.error);
      router.push("/profile");
      router.refresh();
    });

  return (
    <>
      <div className={`${cardClass} -mt-1 flex flex-col gap-4 p-5`}>
        <label className="flex flex-col gap-2">
          <span className={labelCaps}>Name on PayNow</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            maxLength={100}
            className={`${inputClass} border-[#dbdbdb] font-medium ${name.trim() ? "" : "border-[1.5px] border-bad"}`}
          />
          {!name.trim() && <span className="text-xs font-medium text-bad">Enter the name on your PayNow account</span>}
        </label>
        <PhoneField label="PayNow mobile number" value={phone} onChange={setPhone} />
        <p className="text-xs leading-[18px] text-muted">
          Make sure the name matches your bank account so payments are not delayed.
        </p>
      </div>

      <Notice icon="!" title="Your admin will be notified">
        For your security, BEROS is emailed whenever your PayNow details change.
      </Notice>

      <ErrorNote>{error}</ErrorNote>

      <FixedActions>
        <button
          type="button"
          onClick={save}
          disabled={!valid || pending}
          className={`${btnPrimary} flex-1 disabled:bg-strong-line disabled:text-draft md:flex-none md:px-10`}
        >
          {pending ? "Saving…" : "Save details"}
        </button>
      </FixedActions>
    </>
  );
}
