import Anthropic from "@anthropic-ai/sdk";

// Fallback for email domains that aren't in the static ALLOWED_UNIVERSITY_DOMAINS
// list (see allowedDomains.ts). Asks Claude whether the domain looks like it
// belongs to a university/school rather than hand-maintaining an exhaustive list.
// Fails closed: any error, missing API key, or ambiguous response rejects the domain.

let client: Anthropic | null | undefined;

function getClient(): Anthropic | null {
  if (client !== undefined) return client;
  client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
  return client;
}

export async function isLikelyUniversityDomain(domain: string): Promise<boolean> {
  const anthropic = getClient();
  if (!anthropic) return false;

  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-5",
      max_tokens: 300,
      thinking: { type: "disabled" },
      output_config: {
        effort: "low",
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              is_university_domain: {
                type: "boolean",
                description:
                  "True only if this domain belongs to an accredited university, college, or school (higher education or K-12).",
              },
            },
            required: ["is_university_domain"],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: "user",
          content: `Domain: "${domain}"\n\nDoes this email domain belong to an accredited university, college, or school? Judge only from the domain string itself (institution names, country-code patterns, known academic TLD conventions like .edu/.ac.*, etc). If you don't recognize it and it isn't clearly academic, answer false.`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return false;

    const parsed = JSON.parse(textBlock.text) as { is_university_domain?: unknown };
    return parsed.is_university_domain === true;
  } catch {
    return false;
  }
}
