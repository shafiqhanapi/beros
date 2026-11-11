"use client";

import { useState } from "react";
import { PHONE_ERROR, fmtPhone, isSgMobile, phoneDigits } from "@/lib/format";
import { labelCaps } from "./ui";

/**
 * +65 mobile field: fixed prefix, numeric keypad, auto-formatted "9123 4567".
 * Shows the red outline and message once the number is complete or the field is left.
 */
export function PhoneField({
  label,
  value,
  onChange,
  autoFocus,
}: {
  label: string;
  value: string; // digits only
  onChange: (digits: string) => void;
  autoFocus?: boolean;
}) {
  const [touched, setTouched] = useState(false);
  const invalid = value.length > 0 && !isSgMobile(value) && (touched || value.length === 8);
  const id = label.replace(/\W+/g, "-").toLowerCase();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={labelCaps}>
        {label}
      </label>
      <div
        className={`flex items-center gap-2.5 rounded-xl bg-card p-3.5 ${
          invalid ? "border-[1.5px] border-bad" : "border border-[#dbdbdb] focus-within:border-ink"
        }`}
      >
        <span className="text-[15px] font-semibold">+65</span>
        <span className="h-[18px] w-px bg-line" />
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          autoFocus={autoFocus}
          placeholder="9123 4567"
          value={fmtPhone(value)}
          onChange={(e) => onChange(phoneDigits(e.target.value))}
          onBlur={() => setTouched(true)}
          aria-invalid={invalid}
          aria-describedby={invalid ? `${id}-error` : undefined}
          className="min-w-0 flex-1 bg-transparent text-[15px] font-medium outline-none placeholder:text-faint"
        />
      </div>
      {invalid && (
        <p id={`${id}-error`} className="text-xs font-medium text-bad">
          {PHONE_ERROR}
        </p>
      )}
    </div>
  );
}
