import { hash } from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";
import {
  blogPosts,
  faqs,
  projectCategories,
  projects,
  serviceCategories,
  services,
  team,
  testimonials,
  workAreas,
} from "../src/lib/content";
import { imageKit } from "../src/lib/content";
import { legalPageDefinitions } from "../src/lib/legal-content";
import {
  fallbackHomeContent,
  HOME_CONTENT_ID,
  serializeHomeContent,
} from "../src/lib/home-content";
import {
  fallbackInstitutionalPages,
  institutionalPageSlugs,
  serializeInstitutionalPage,
} from "../src/lib/institutional-content";
import {
  defaultAdminEmail,
  resolveSeedAdminCredentials,
} from "../src/lib/seed-safety";

const prisma = new PrismaClient();
const seedPublishedAt = new Date("2026-07-01T12:00:00.000Z");

// Initial commercial assumptions. Review these ranges before a production launch.
const estimatorRules = [
  {
    id: "estimate-rule-new-build",
    key: "obra-nueva",
    label: "Obra nueva",
    description:
      "Construcción residencial con materiales, mano de obra y coordinación general.",
    minUsdPerM2: 850,
    maxUsdPerM2: 1350,
    minimumProjectUsd: 80000,
    sortOrder: 10,
  },
  {
    id: "estimate-rule-remodel",
    key: "remodelacion-integral",
    label: "Remodelación integral",
    description:
      "Intervención completa de espacios existentes, instalaciones y terminaciones.",
    minUsdPerM2: 450,
    maxUsdPerM2: 900,
    minimumProjectUsd: 15000,
    sortOrder: 20,
  },
  {
    id: "estimate-rule-extension",
    key: "ampliacion",
    label: "Ampliación",
    description:
      "Nuevos metros cubiertos integrados a una construcción existente.",
    minUsdPerM2: 700,
    maxUsdPerM2: 1150,
    minimumProjectUsd: 25000,
    sortOrder: 30,
  },
  {
    id: "estimate-rule-interiors",
    key: "diseno-interior",
    label: "Diseño interior",
    description:
      "Materialidad, iluminación, equipamiento y ambientación del espacio.",
    minUsdPerM2: 180,
    maxUsdPerM2: 420,
    minimumProjectUsd: 6000,
    sortOrder: 40,
  },
  {
    id: "estimate-rule-retail",
    key: "local-comercial",
    label: "Local comercial",
    description:
      "Adecuación de marca, instalaciones, obra y terminaciones para uso comercial.",
    minUsdPerM2: 500,
    maxUsdPerM2: 950,
    minimumProjectUsd: 15000,
    sortOrder: 50,
  },
  {
    id: "estimate-rule-office",
    key: "oficina",
    label: "Oficina",
    description:
      "Distribución, instalaciones, acústica, iluminación y terminaciones de trabajo.",
    minUsdPerM2: 450,
    maxUsdPerM2: 850,
    minimumProjectUsd: 12000,
    sortOrder: 60,
  },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  const adminCredentials = resolveSeedAdminCredentials();
  const adminEmail = adminCredentials.email;
  const adminPassword = adminCredentials.password;
  const configId = "arqvia-config";
  const genericWhatsapp =
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim() || "5493515551234";
  const legacyBlogSlugs = [
    "que-incluye-construccion-llave-en-mano",
    "como-elegir-arquitecto-para-construir-casa",
    "cuanto-cuesta-remodelar-una-cocina",
  ];

  if (adminCredentials.production) {
    const defaultAdmin = await prisma.user.findUnique({
      where: { email: defaultAdminEmail },
      select: { active: true },
    });
    if (defaultAdmin?.active) {
      throw new Error(
        "Production seeding refused because the known default admin account is active.",
      );
    }
  }

  const adminPasswordHash = await hash(adminPassword, 12);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: "Admin Arqvia",
      ...(adminCredentials.production ? { passwordHash: adminPasswordHash } : {}),
      role: UserRole.ADMIN,
      active: true,
    },
    create: {
      name: "Admin Arqvia",
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      active: true,
    },
  });

  await prisma.clientConfig.upsert({
    where: { id: configId },
    update: {
      companyName: "Arqvia",
      logoUrl: "",
      primaryColor: "#1c211d",
      secondaryColor: "#eef0eb",
      accentColor: "#9b6a39",
      fontHeading: "Newsreader",
      fontBody: "Manrope",
      whatsapp: genericWhatsapp,
      phone: "+54 351 555 1234",
      email: "hola@arqvia.com.ar",
      address: "Córdoba Capital, Argentina",
      businessHours: "Lunes a viernes, 9:00 a 18:00",
      instagramUrl: "",
      linkedinUrl: "",
      facebookUrl: "",
      heroTitle: "Arquitectura pensada para construirse bien.",
      heroSubtitle:
        "Diseñamos, planificamos y acompañamos proyectos residenciales y comerciales desde la primera idea hasta la entrega final.",
      heroImage: imageKit.hero,
      primaryCtaLabel: "Solicitar presupuesto",
      secondaryCtaLabel: "Ver proyectos",
    },
    create: {
      id: configId,
      companyName: "Arqvia",
      logoUrl: "",
      primaryColor: "#1c211d",
      secondaryColor: "#eef0eb",
      accentColor: "#9b6a39",
      fontHeading: "Newsreader",
      fontBody: "Manrope",
      whatsapp: genericWhatsapp,
      phone: "+54 351 555 1234",
      email: "hola@arqvia.com.ar",
      address: "Córdoba Capital, Argentina",
      businessHours: "Lunes a viernes, 9:00 a 18:00",
      instagramUrl: "",
      linkedinUrl: "",
      facebookUrl: "",
      heroTitle: "Arquitectura pensada para construirse bien.",
      heroSubtitle:
        "Diseñamos, planificamos y acompañamos proyectos residenciales y comerciales desde la primera idea hasta la entrega final.",
      heroImage: imageKit.hero,
      primaryCtaLabel: "Solicitar presupuesto",
      secondaryCtaLabel: "Ver proyectos",
    },
  });

  // The application is single-client and only reads this canonical record.
  await prisma.clientConfig.deleteMany({
    where: { id: { not: configId } },
  });

  await prisma.homeContent.upsert({
    where: { id: HOME_CONTENT_ID },
    update: {},
    create: {
      id: HOME_CONTENT_ID,
      ...serializeHomeContent(fallbackHomeContent),
    },
  });

  for (const slug of institutionalPageSlugs) {
    await prisma.institutionalPage.upsert({
      where: { slug },
      update: {},
      create: serializeInstitutionalPage(fallbackInstitutionalPages[slug]),
    });
  }

  await prisma.estimateConfig.upsert({
    where: { id: "arqvia-estimator" },
    update: { enabled: false },
    create: {
      id: "arqvia-estimator",
      enabled: false,
      headline: "Estimá un rango inicial para tu proyecto.",
      description:
        "Combiná tipo de obra, superficie y nivel de terminación para obtener una primera referencia de inversión.",
      disclaimer:
        "El resultado es orientativo y no constituye una cotización. El alcance, el estado del inmueble, la ubicación, la documentación, la estructura y la selección final de materiales pueden modificarlo.",
      essentialMultiplier: 0.9,
      balancedMultiplier: 1,
      premiumMultiplier: 1.25,
    },
  });

  for (const rule of estimatorRules) {
    await prisma.estimateRule.upsert({
      where: { key: rule.key },
      update: {},
      create: {
        ...rule,
        active: true,
      },
    });
  }

  const mediaSeeds = [
    {
      title: "Hero arquitectónico Arqvia",
      url: imageKit.hero,
      altText:
        "Casa contemporánea con hormigón, piscina e iluminación cálida para hero de Arqvia",
      category: "Hero",
      mimeType: "image/webp",
    },
    {
      title: "Visualización arquitectónica Arqvia",
      url: imageKit.sketch,
      altText:
        "Visualización arquitectónica de una vivienda contemporánea con estructura, materialidad e interiores integrados",
      category: "Servicios",
      mimeType: "image/webp",
    },
    {
      title: "Casa Patio Norte",
      url: imageKit.house,
      altText: "Vivienda contemporánea con patio y galería en Villa Allende",
      category: "Proyecto",
      mimeType: "image/webp",
    },
    {
      title: "Casa Patio Norte · Galería",
      url: imageKit.houseDetail,
      altText:
        "Galería cubierta de Casa Patio Norte conectada con el patio, la piscina y el estar",
      category: "Proyecto",
      mimeType: "image/webp",
    },
    {
      title: "Oficina Umbral",
      url: imageKit.office,
      altText: "Oficina boutique con madera, luz natural y mobiliario cálido",
      category: "Proyecto",
      mimeType: "image/webp",
    },
    {
      title: "Oficina Umbral · Sala de reuniones",
      url: imageKit.officeDetail,
      altText:
        "Sala de reuniones de Oficina Umbral conectada visualmente con la recepción",
      category: "Proyecto",
      mimeType: "image/webp",
    },
    {
      title: "Local Sierra",
      url: imageKit.commercial,
      altText: "Local comercial con fachada contemporánea y materialidad sobria",
      category: "Proyecto",
      mimeType: "image/webp",
    },
    {
      title: "Local Sierra · Interior",
      url: imageKit.commercialDetail,
      altText:
        "Interior de Local Sierra con circulación central, exhibición e iluminación técnica",
      category: "Proyecto",
      mimeType: "image/webp",
    },
    {
      title: "Dirección técnica de obra",
      url: imageKit.construction,
      altText: "Ejecución de obra con seguimiento técnico de estructura y materiales",
      category: "Proyecto",
      mimeType: "image/webp",
    },
    {
      title: "Remodelaciones integrales",
      url: imageKit.remodeling,
      altText:
        "Vivienda remodelada con cocina, comedor y estar integrados mediante una nueva apertura estructural",
      category: "Servicios",
      mimeType: "image/webp",
    },
    {
      title: "Cocina antes de remodelar",
      url: imageKit.before,
      altText: "Cocina antes de una remodelación integral del mismo ambiente",
      category: "Antes y despues",
      mimeType: "image/webp",
    },
    {
      title: "Cocina después de remodelar",
      url: imageKit.after,
      altText: "Cocina remodelada después de una intervención integral del mismo ambiente",
      category: "Antes y despues",
      mimeType: "image/webp",
    },
    {
      title: "Baño antes de remodelar",
      url: imageKit.bathroomBefore,
      altText:
        "Baño antes de la remodelación, con azulejos beige, bañera con cortina y mobiliario antiguo",
      category: "Antes y despues",
      mimeType: "image/webp",
    },
    {
      title: "Baño después de remodelar",
      url: imageKit.bathroomAfter,
      altText:
        "Baño después de la remodelación, con ducha de vidrio, porcelanato claro y vanitory flotante de roble",
      category: "Antes y despues",
      mimeType: "image/webp",
    },
    {
      title: "Dirección de arquitectura",
      url: imageKit.teamA,
      altText: "Perfil del equipo de dirección arquitectónica de Arqvia",
      category: "Equipo",
      mimeType: "image/webp",
    },
    {
      title: "Dirección de obra",
      url: imageKit.teamB,
      altText: "Perfil del equipo de dirección de obra de Arqvia",
      category: "Equipo",
      mimeType: "image/webp",
    },
    {
      title: "Interiorismo",
      url: imageKit.teamC,
      altText: "Perfil del equipo de interiorismo de Arqvia",
      category: "Equipo",
      mimeType: "image/webp",
    },
  ];

  for (const asset of mediaSeeds) {
    await prisma.mediaAsset.upsert({
      where: { url: asset.url },
      update: {
        altText: asset.altText,
        category: asset.category,
        mimeType: asset.mimeType,
        source: "seed",
        title: asset.title,
      },
      create: {
        ...asset,
        sizeBytes: 0,
        source: "seed",
      },
    });
  }

  for (const category of serviceCategories) {
    await prisma.serviceCategory.upsert({
      where: { slug: category.slug },
      update: { name: category.name },
      create: {
        name: category.name,
        slug: category.slug,
        description: `Servicios de ${category.name} para proyectos de arquitectura, obra e interiores.`,
      },
    });
  }

  for (const service of services) {
    const category = await prisma.serviceCategory.findUniqueOrThrow({
      where: { slug: service.category },
    });

    await prisma.service.upsert({
      where: { slug: service.slug },
      update: {
        publicationStatus: "PUBLISHED",
        publishedAt: seedPublishedAt,
        title: service.title,
        description: service.description,
        shortDescription: service.shortDescription,
        icon: service.title,
        coverImage: service.coverImage,
        mainBenefit: service.mainBenefit,
        audience: service.audience,
        included: service.included.join("\n"),
        benefits: [
          service.mainBenefit,
          "Ordena decisiones antes de invertir fuerte.",
          "Reduce cambios durante la obra.",
          "Facilita comparar presupuestos con criterios claros.",
        ].join("\n"),
        process: service.process.join("\n"),
        faq: JSON.stringify(service.faq),
        whatsappMessage: service.whatsappMessage,
        featured: service.featured,
        seoTitle: service.seoTitle,
        seoDescription: service.seoDescription,
        categoryId: category.id,
      },
      create: {
        publicationStatus: "PUBLISHED",
        publishedAt: seedPublishedAt,
        title: service.title,
        slug: service.slug,
        description: service.description,
        shortDescription: service.shortDescription,
        icon: service.title,
        coverImage: service.coverImage,
        mainBenefit: service.mainBenefit,
        audience: service.audience,
        included: service.included.join("\n"),
        benefits: [
          service.mainBenefit,
          "Ordena decisiones antes de invertir fuerte.",
          "Reduce cambios durante la obra.",
          "Facilita comparar presupuestos con criterios claros.",
        ].join("\n"),
        process: service.process.join("\n"),
        faq: JSON.stringify(service.faq),
        whatsappMessage: service.whatsappMessage,
        featured: service.featured,
        seoTitle: service.seoTitle,
        seoDescription: service.seoDescription,
        categoryId: category.id,
      },
    });
  }

  for (const category of projectCategories.filter((item) => item !== "Todos")) {
    await prisma.projectCategory.upsert({
      where: { slug: slugify(category) },
      update: { name: category },
      create: {
        name: category,
        slug: slugify(category),
        description: `Proyectos de ${category} desarrollados por Arqvia.`,
      },
    });
  }

  for (const project of projects) {
    const category = await prisma.projectCategory.findUniqueOrThrow({
      where: { slug: slugify(project.category) },
    });
    const service = await prisma.service.findUniqueOrThrow({
      where: { slug: project.serviceSlug },
    });

    const savedProject = await prisma.project.upsert({
      where: { slug: project.slug },
      update: {
        publicationStatus: "PUBLISHED",
        publishedAt: seedPublishedAt,
        title: project.title,
        summary: project.summary,
        description: project.description,
        location: project.location,
        year: project.year,
        areaM2: project.areaM2,
        status: project.status,
        clientType: project.clientType,
        servicePerformed: project.servicePerformed,
        coverImage: project.coverImage,
        challenge: project.challenge,
        solution: project.solution,
        process: project.process,
        result: project.result,
        optimized: project.optimized,
        specialNote: project.specialNote,
        materials: project.materials,
        duration: project.duration,
        constructionSystem: project.constructionSystem,
        currentStage: project.currentStage,
        responsibleTeam: project.responsibleTeam,
        architectDirector: project.architectDirector,
        supplier: project.supplier,
        budgetRange: project.budgetRange,
        featured: project.featured,
        seoTitle: project.seoTitle,
        seoDescription: project.seoDescription,
        seoCategory: project.category,
        imageAlt: project.imageAlt,
        categoryId: category.id,
        serviceId: service.id,
      },
      create: {
        publicationStatus: "PUBLISHED",
        publishedAt: seedPublishedAt,
        title: project.title,
        slug: project.slug,
        summary: project.summary,
        description: project.description,
        location: project.location,
        year: project.year,
        areaM2: project.areaM2,
        status: project.status,
        clientType: project.clientType,
        servicePerformed: project.servicePerformed,
        coverImage: project.coverImage,
        challenge: project.challenge,
        solution: project.solution,
        process: project.process,
        result: project.result,
        optimized: project.optimized,
        specialNote: project.specialNote,
        materials: project.materials,
        duration: project.duration,
        constructionSystem: project.constructionSystem,
        currentStage: project.currentStage,
        responsibleTeam: project.responsibleTeam,
        architectDirector: project.architectDirector,
        supplier: project.supplier,
        budgetRange: project.budgetRange,
        featured: project.featured,
        seoTitle: project.seoTitle,
        seoDescription: project.seoDescription,
        seoCategory: project.category,
        imageAlt: project.imageAlt,
        categoryId: category.id,
        serviceId: service.id,
      },
    });

    await prisma.projectImage.deleteMany({ where: { projectId: savedProject.id } });
    const beforeAfter = "beforeAfter" in project ? project.beforeAfter : undefined;
    const galleryAlts =
      "galleryAlts" in project ? project.galleryAlts : undefined;
    const galleryCaptions =
      "galleryCaptions" in project ? project.galleryCaptions : undefined;
    await prisma.projectImage.createMany({
      data: project.gallery.map((url, index) => ({
        projectId: savedProject.id,
        url,
        altText:
          beforeAfter && url === beforeAfter.beforeImage
            ? beforeAfter.beforeAlt
            : beforeAfter && url === beforeAfter.afterImage
              ? beforeAfter.afterAlt
              : galleryAlts?.[index] ??
                (index === 0
                  ? project.imageAlt
                  : `Detalle del proyecto ${project.title}`),
        caption:
          beforeAfter && url === beforeAfter.beforeImage
            ? beforeAfter.beforeNote
            : beforeAfter && url === beforeAfter.afterImage
              ? beforeAfter.afterNote
              : galleryCaptions?.[index] ??
                (index === 0 ? "Imagen principal" : "Detalle del proyecto"),
        type:
          beforeAfter && url === beforeAfter.beforeImage
            ? "BEFORE"
            : beforeAfter && url === beforeAfter.afterImage
              ? "AFTER"
              : index === 0
                ? "FINAL"
                : "PROCESS",
        sortOrder: index,
      })),
    });
  }

  await prisma.testimonial.deleteMany({
    where: { name: { in: testimonials.map((item) => item.name) } },
  });
  for (const item of testimonials) {
    await prisma.testimonial.create({
      data: {
        name: item.name,
        projectType: item.projectType,
        location: item.location,
        quote: item.quote,
        featured: true,
      },
    });
  }

  await prisma.teamMember.deleteMany({
    where: { name: { in: team.map((member) => member.name) } },
  });
  for (const member of team) {
    await prisma.teamMember.create({
      data: {
        name: member.name,
        role: member.role,
        specialty: member.specialty,
        licenseNumber: member.licenseNumber,
        bio: member.bio,
        imageUrl: member.imageUrl,
        linkedinUrl: member.linkedinUrl,
        active: true,
      },
    });
  }

  await prisma.faq.deleteMany({
    where: { question: { in: faqs.map((item) => item.question) } },
  });
  for (const item of faqs) {
    await prisma.faq.create({
      data: {
        question: item.question,
        answer: item.answer,
        category: item.category,
        active: true,
      },
    });
  }

  for (const area of workAreas) {
    await prisma.area.upsert({
      where: { slug: area.slug },
      update: {
        name: area.name,
        description: area.description,
        seoTitle: `Arquitectura, construcción y remodelaciones en ${area.name}`,
        seoDescription: `${area.description} Servicios de arquitectura, construcción, remodelaciones e interiores en Córdoba.`,
        active: true,
      },
      create: {
        name: area.name,
        slug: area.slug,
        description: area.description,
        seoTitle: `Arquitectura, construcción y remodelaciones en ${area.name}`,
        seoDescription: `${area.description} Servicios de arquitectura, construcción, remodelaciones e interiores en Córdoba.`,
        active: true,
      },
    });
  }

  await prisma.blogPost.deleteMany({
    where: { slug: { in: legacyBlogSlugs } },
  });

  for (const post of blogPosts) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: {
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        coverImage: post.coverImage,
        category: post.category,
        publishedAt: seedPublishedAt,
        status: "PUBLISHED",
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
      },
      create: {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        coverImage: post.coverImage,
        category: post.category,
        publishedAt: seedPublishedAt,
        status: "PUBLISHED",
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        authorId: admin.id,
      },
    });
  }

  for (const page of legalPageDefinitions) {
    await prisma.legalPage.upsert({
      where: { slug: page.slug },
      update: {},
      create: {
        slug: page.slug,
        title: page.title,
        summary: page.summary,
        content: page.content,
        status: "DRAFT",
        seoTitle: page.seoTitle,
        seoDescription: page.seoDescription,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
