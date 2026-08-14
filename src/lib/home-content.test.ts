import { describe, expect, it } from "vitest";
import {
  fallbackHomeContent,
  homeContentFromForm,
  serializeHomeContent,
  toPublicHomeContent,
} from "@/lib/home-content";
import { homeContentFormSchema } from "@/lib/validations";

function validFormInput() {
  const content = fallbackHomeContent;
  return {
    heroEyebrow: content.heroEyebrow,
    heroImageAlt: content.heroImageAlt,
    heroTrustItem1: content.heroTrustItems[0],
    heroTrustItem2: content.heroTrustItems[1],
    heroTrustItem3: content.heroTrustItems[2],
    metric1Value: content.trustMetrics[0].value,
    metric1Label: content.trustMetrics[0].label,
    metric2Value: content.trustMetrics[1].value,
    metric2Label: content.trustMetrics[1].label,
    metric3Value: content.trustMetrics[2].value,
    metric3Label: content.trustMetrics[2].label,
    metric4Value: content.trustMetrics[3].value,
    metric4Label: content.trustMetrics[3].label,
    projectsTitle: content.projectsTitle,
    servicesTitle: content.servicesTitle,
    servicesDescription: content.servicesDescription,
    beforeAfterTitle: content.beforeAfterTitle,
    beforeAfterDescription: content.beforeAfterDescription,
    processTitle: content.processTitle,
    processReason1: content.processReasons[0],
    processReason2: content.processReasons[1],
    processReason3: content.processReasons[2],
    processStep1Title: content.processSteps[0].title,
    processStep1Description: content.processSteps[0].description,
    processStep2Title: content.processSteps[1].title,
    processStep2Description: content.processSteps[1].description,
    processStep3Title: content.processSteps[2].title,
    processStep3Description: content.processSteps[2].description,
    processStep4Title: content.processSteps[3].title,
    processStep4Description: content.processSteps[3].description,
    finalCtaTitle: content.finalCtaTitle,
    finalCtaDescription: content.finalCtaDescription,
    seoTitle: content.seoTitle,
    seoDescription: content.seoDescription,
  };
}

describe("home content contracts", () => {
  it("round-trips the governed content without losing structured fields", () => {
    const stored = serializeHomeContent(fallbackHomeContent);

    expect(toPublicHomeContent(stored)).toEqual(fallbackHomeContent);
  });

  it("rejects malformed arrays instead of exposing partial public content", () => {
    const stored = {
      ...serializeHomeContent(fallbackHomeContent),
      processStepsJson: JSON.stringify([{ title: "Paso incompleto" }]),
    };

    expect(toPublicHomeContent(stored)).toBeNull();
  });

  it("validates and maps every fixed form field into structured content", () => {
    const parsed = homeContentFormSchema.parse(validFormInput());
    const content = homeContentFromForm(parsed);

    expect(content.heroTrustItems).toHaveLength(3);
    expect(content.trustMetrics).toHaveLength(4);
    expect(content.processReasons).toHaveLength(3);
    expect(content.processSteps).toHaveLength(4);
    expect(content.seoDescription.length).toBeGreaterThanOrEqual(70);
  });

  it("rejects unsupported metric and SEO lengths", () => {
    const result = homeContentFormSchema.safeParse({
      ...validFormInput(),
      metric1Value: "",
      seoDescription: "Muy corta",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.metric1Value).toBeDefined();
      expect(result.error.flatten().fieldErrors.seoDescription).toBeDefined();
    }
  });
});
