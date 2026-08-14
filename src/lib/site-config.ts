export const siteConfig = {
  name: "Arqvia",
  tagline: "Arquitectura, obra e interiores",
  description:
    "Diseñamos, planificamos y ejecutamos proyectos residenciales y comerciales con una dirección clara desde el primer plano hasta la entrega final.",
  locale: "es_AR",
  city: "Córdoba",
  country: "Argentina",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "",
  whatsappMessage:
    process.env.NEXT_PUBLIC_WHATSAPP_MESSAGE ||
    "Hola, quiero consultar por un proyecto de construcción/remodelación. Estoy en Córdoba y me gustaría recibir orientación.",
  contact: {
    phone: "+54 351 555 1234",
    email: "hola@arqvia.com.ar",
    address: "Córdoba Capital, Argentina",
    businessHours: "Lunes a viernes, 9:00 a 18:00",
  },
  socials: {
    instagram: "",
    linkedin: "",
    facebook: "",
  },
  ctas: {
    primary: "Solicitar presupuesto",
    secondary: "Ver proyectos",
    whatsapp: "Consultar por WhatsApp",
  },
  nav: [
    { label: "Inicio", href: "/" },
    { label: "Proyectos", href: "/proyectos" },
    { label: "Servicios", href: "/servicios" },
    { label: "Proceso", href: "/proceso" },
    { label: "Nosotros", href: "/nosotros" },
    { label: "Blog", href: "/blog" },
    { label: "Contacto", href: "/contacto" },
  ],
};
