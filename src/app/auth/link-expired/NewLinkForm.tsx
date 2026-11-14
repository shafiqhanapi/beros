"use client";

import { useState, useTransition } from "react";
import { btnPrimary, ErrorNote, inputClass } from "@/components/ui";
import { requestNewLink } from "../confirm/actions";

export function NewLinkForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (sent) {
    return (
      <div className="flex flex-col gap-2 text-center">
        <p className="text-[15px] font-semibold">Check your email</p>
        <p className="text-sm text-muted">
          If {email} is on the BEROS crew list, a new link is on its way. It works for 24 hours. Didn’t get it? Check spam, or contact{" "}
          <a href="mailto:hello@beros.online" className="font-semibold text-ink underline">
            hello@beros.online
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setError(null);
          const res = await requestNewLink(email);
          if ("error" in res) setError(res.error);
          else setSent(true);
        });
      }}
    >
      <label className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold">Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="name@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </label>
      <ErrorNote>{error}</ErrorNote>
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "Sending…" : "Send me a new link"}
      </button>
    </form>
  );
}
