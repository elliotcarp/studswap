// Pure data/helpers for the payment-method picker — deliberately NOT in
// PaymentMethodEditor.tsx (a "use client" component): importing anything
// from a client-boundary file into server code (API routes) drags the
// whole client-component machinery along and breaks at runtime ("Attempted
// to call map() from the server but map is on the client"), even for a
// plain constant array. Server code (route.ts files) must import from
// here, not from the component.

export const PAYMENT_METHODS = [
  {
    value: "IBAN",
    label: "Bank transfer",
    icon: "🏦",
    fieldLabel: "IBAN",
    placeholder: "e.g. DE89 3704 0044 0532 0130 00",
    inputMode: "text" as const,
  },
  {
    value: "PAYPAL",
    label: "PayPal",
    icon: "💳",
    fieldLabel: "PayPal email",
    placeholder: "you@example.com",
    inputMode: "email" as const,
  },
  {
    value: "REVOLUT",
    label: "Revolut",
    icon: "📱",
    fieldLabel: "Revolut @tag",
    placeholder: "@yourtag",
    inputMode: "text" as const,
  },
  {
    value: "OTHER",
    label: "Other",
    icon: "✉️",
    fieldLabel: "Payment details",
    placeholder: "e.g. Wise, Venmo, or however you'd like to be paid",
    inputMode: "text" as const,
  },
] as const;

export function paymentMethodLabel(method: string | null): string {
  return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? "";
}
