import { describe, expect, it } from "vitest";
import { publicContactQualityIssues } from "@/lib/public-contact-quality";

const validContact = {
  address: "Cordoba Capital y alrededores",
  businessHours: "Lunes a viernes de 9 a 18 h",
  email: "hola@arqvia.com.ar",
  phone: "+54 351 555 1234",
  whatsapp: "5493515551234",
};

describe("publicContactQualityIssues", () => {
  it("accepts complete staging contact data", () => {
    expect(publicContactQualityIssues(validContact)).toEqual([]);
  });

  it("rejects public placeholder contact data", () => {
    expect(
      publicContactQualityIssues({
        ...validContact,
        email: "contacto@arqvia.example",
        phone: "+54 351 000-0000",
        whatsapp: "5493510000000",
      }),
    ).toEqual([
      "WhatsApp must contain a usable international number",
      "phone must contain a usable public number",
      "email must use a valid public domain",
    ]);
  });

  it("requires public location and schedule context", () => {
    expect(
      publicContactQualityIssues({
        ...validContact,
        address: "Cba",
        businessHours: "9 a 18",
      }),
    ).toEqual([
      "address or service-area text must contain at least 8 characters",
      "business hours must contain at least 8 characters",
    ]);
  });
});
