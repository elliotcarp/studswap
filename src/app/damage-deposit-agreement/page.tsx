import Link from "next/link";
import { readLegalDoc } from "@/lib/legalContent";
import MarkdownDoc from "@/components/legal/MarkdownDoc";

export default function DamageDepositAgreementPage() {
  const content = readLegalDoc("damage-deposit-agreement.md");
  return (
    <main className="flex justify-center p-6 pb-16">
      <div className="w-full max-w-2xl">
        <Link href="/" className="text-sm text-gray-500">
          ← Back
        </Link>
        <div className="mt-4">
          <MarkdownDoc markdown={content} />
        </div>
      </div>
    </main>
  );
}
