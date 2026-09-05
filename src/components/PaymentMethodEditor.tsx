"use client";

// Two-step "how should people pay you" editor: pick a payment method first,
// then fill in only the field that method actually needs — replaces the
// old single generic free-text box (used identically here and in
// OnboardingWizard.tsx, so the two never drift apart). PAYMENT_METHODS is
// the single source of truth for the method set/labels; User.paymentMethod
// stores the `value` below, User.paymentHandle stores whatever that
// method's field collects (IBAN number, PayPal email, Revolut @tag, or
// free text for Other).

import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import clsx from "clsx";
import { PAYMENT_METHODS, paymentMethodLabel } from "@/lib/paymentMethods";

export interface PaymentMethodValue {
  paymentMethod: string;
  paymentHandle: string;
  paymentHandleAccountName: string;
}

// Re-exported for existing client-side importers (this file is already a
// "use client" component, so re-exporting here is safe) — but server code
// (API routes) must import these from @/lib/paymentMethods directly, never
// from this file. See that module's comment for why.
export { PAYMENT_METHODS, paymentMethodLabel };

export default function PaymentMethodEditor({
  value,
  onChange,
  autoFocus,
}: {
  value: PaymentMethodValue;
  onChange: (next: PaymentMethodValue) => void;
  autoFocus?: boolean;
}) {
  const selected = PAYMENT_METHODS.find((m) => m.value === value.paymentMethod);

  if (!selected) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {PAYMENT_METHODS.map((method) => (
          <button
            key={method.value}
            type="button"
            onClick={() => onChange({ ...value, paymentMethod: method.value })}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-carbon-line bg-white p-4 text-center shadow-surface transition-transform active:scale-95 hover:border-riviera"
          >
            <span className="text-2xl">{method.icon}</span>
            <span className="text-sm font-semibold text-chalk">{method.label}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-chalk">
          <span>{selected.icon}</span>
          {selected.label}
        </span>
        <button
          type="button"
          onClick={() => onChange({ ...value, paymentMethod: "", paymentHandle: "" })}
          className="text-xs font-medium text-riviera"
        >
          Change method
        </button>
      </div>
      <label className="text-xs font-medium text-carbon-text">{selected.fieldLabel}</label>
      <Input
        autoFocus={autoFocus}
        inputMode={selected.inputMode === "email" ? "email" : "text"}
        type={selected.inputMode === "email" ? "email" : "text"}
        value={value.paymentHandle}
        onChange={(e) => onChange({ ...value, paymentHandle: e.target.value })}
        placeholder={selected.placeholder}
      />
      <label className="mt-1 text-xs font-medium text-carbon-text">Name on the account</label>
      <Input
        value={value.paymentHandleAccountName}
        onChange={(e) => onChange({ ...value, paymentHandleAccountName: e.target.value })}
        placeholder="As it appears on the account"
      />
    </div>
  );
}

// Small read-only display line, used wherever a payment method+handle is
// shown back (profile summary, the counterpart's details once validated).
export function PaymentMethodSummary({
  method,
  handle,
  accountName,
  className,
}: {
  method: string | null;
  handle: string | null;
  accountName?: string | null;
  className?: string;
}) {
  if (!method || !handle) {
    return <p className={clsx("text-base text-carbon", className)}>Not added yet</p>;
  }
  const label = paymentMethodLabel(method);
  return (
    <p className={clsx("text-base", className)}>
      <span className="font-semibold">{label}:</span> {handle}
      {accountName ? ` (${accountName})` : ""}
    </p>
  );
}
