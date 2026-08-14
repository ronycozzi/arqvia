import { describe, expect, it } from "vitest";
import {
  fallbackInstitutionalPages,
  institutionalPageFromForm,
  serializeInstitutionalPage,
  toPublicInstitutionalPage,
} from "@/lib/institutional-content";
import { institutionalPageFormSchema } from "@/lib/validations";

function aboutFormInput() {
  const page = fallbackInstitutionalPages.nosotros;

  return {
    slug: "nosotros" as const,
    eyebrow: page.eyebrow,
    title: page.title,
    introduction: page.introduction,
    decisionEyebrow: page.payload.decision.eyebrow,
    decisionTitle: page.payload.decision.title,
    decisionDescription: page.payload.decision.description,
    decisionItem1: page.payload.decision.items[0],
    decisionItem2: page.payload.decision.items[1],
    decisionItem3: page.payload.decision.items[2],
    decisionItem4: page.payload.decision.items[3],
    philosophyEyebrow: page.payload.philosophy.eyebrow,
    philosophyTitle: page.payload.philosophy.title,
    philosophyDescription: page.payload.philosophy.description,
    philosophyItem1Title: page.payload.philosophy.items[0].title,
    philosophyItem1Description: page.payload.philosophy.items[0].description,
    philosophyItem2Title: page.payload.philosophy.items[1].title,
    philosophyItem2Description: page.payload.philosophy.items[1].description,
    philosophyItem3Title: page.payload.philosophy.items[2].title,
    philosophyItem3Description: page.payload.philosophy.items[2].description,
    teamEyebrow: page.payload.team.eyebrow,
    teamTitle: page.payload.team.title,
    teamDescription: page.payload.team.description,
    finalCtaTitle: page.finalCtaTitle,
    finalCtaDescription: page.finalCtaDescription,
    primaryCtaLabel: page.primaryCtaLabel,
    secondaryCtaLabel: page.secondaryCtaLabel,
    whatsappMessage: page.whatsappMessage,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
  };
}

function processFormInput() {
  const page = fallbackInstitutionalPages.proceso;
  const input: Record<string, string> = {
    slug: "proceso",
    eyebrow: page.eyebrow,
    title: page.title,
    introduction: page.introduction,
    finalCtaTitle: page.finalCtaTitle,
    finalCtaDescription: page.finalCtaDescription,
    primaryCtaLabel: page.primaryCtaLabel,
    secondaryCtaLabel: page.secondaryCtaLabel,
    whatsappMessage: page.whatsappMessage,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
  };

  page.payload.steps.forEach((step, index) => {
    input[`processStep${index + 1}Title`] = step.title;
    input[`processStep${index + 1}Description`] = step.description;
  });

  return input;
}

describe("institutional content", () => {
  it.each(["nosotros", "proceso"] as const)(
    "round-trips the %s page through storage",
    (slug) => {
      const source = fallbackInstitutionalPages[slug];

      expect(toPublicInstitutionalPage(serializeInstitutionalPage(source))).toEqual(
        source,
      );
    },
  );

  it("rejects malformed JSON and structurally invalid payloads", () => {
    const storedAbout = serializeInstitutionalPage(
      fallbackInstitutionalPages.nosotros,
    );
    const storedProcess = serializeInstitutionalPage(
      fallbackInstitutionalPages.proceso,
    );

    expect(
      toPublicInstitutionalPage({ ...storedAbout, payloadJson: "{" }),
    ).toBeNull();
    expect(
      toPublicInstitutionalPage({
        ...storedProcess,
        payloadJson: JSON.stringify({
          steps: fallbackInstitutionalPages.proceso.payload.steps.slice(0, 6),
        }),
      }),
    ).toBeNull();
  });

  it("validates and maps the complete Nosotros form", () => {
    const parsed = institutionalPageFormSchema.safeParse(aboutFormInput());

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const page = institutionalPageFromForm(parsed.data);
    expect(page.slug).toBe("nosotros");
    if (page.slug !== "nosotros") return;
    expect(page.payload.decision.items).toHaveLength(4);
    expect(page.payload.philosophy.items).toHaveLength(3);
    expect(page.payload.team).toEqual(
      fallbackInstitutionalPages.nosotros.payload.team,
    );
  });

  it("validates all seven process steps and rejects incomplete forms", () => {
    const validInput = processFormInput();
    const parsed = institutionalPageFormSchema.safeParse(validInput);

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const page = institutionalPageFromForm(parsed.data);
    expect(page.slug).toBe("proceso");
    if (page.slug !== "proceso") return;
    expect(page.payload.steps).toEqual(
      fallbackInstitutionalPages.proceso.payload.steps,
    );

    const incompleteInput = { ...validInput };
    delete incompleteInput.processStep7Description;
    expect(institutionalPageFormSchema.safeParse(incompleteInput).success).toBe(
      false,
    );
  });
});
