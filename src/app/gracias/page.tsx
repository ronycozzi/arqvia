import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, MessageCircle } from "lucide-react";
import { TrackedAnchor } from "@/components/tracked-anchor";
import { ThankYouEstimate } from "@/components/thank-you-estimate";
import { getClientConfig } from "@/lib/client-config";
import { buildWhatsAppUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Gracias, recibimos tu consulta",
  robots: { index: false, follow: false },
  description: "Confirmación de envío de una consulta de proyecto.",
};

const nextSteps = [
  {
    title: "Revisión inicial",
    text: "Leemos tipo de proyecto, ubicación, superficie aproximada y rango de inversión para entender el punto de partida.",
  },
  {
    title: "Contacto",
    text: "Te escribimos para pedir información faltante, coordinar una llamada o evaluar si conviene una visita técnica.",
  },
  {
    title: "Próximos pasos",
    text: "Definimos si corresponde diagnóstico, anteproyecto, presupuesto por etapas, dirección o ejecución integral.",
  },
];

export default async function ThankYouPage() {
  const config = await getClientConfig();
  const whatsappFollowUpMessage = `Hola, ya envié mi consulta desde la web de ${config.companyName} y quiero sumar fotos, planos o referencias de mi proyecto para que puedan evaluarlo mejor.`;

  return (
    <section className="mx-auto max-w-6xl px-5 py-16 md:px-8">
      <div className="premium-card grid gap-10 bg-mist p-6 md:p-10 lg:grid-cols-[0.86fr_1.14fr] lg:items-center">
        <div>
          <span className="inline-grid size-16 place-items-center border border-bronze/30 bg-paper text-bronze">
            <CheckCircle2 className="size-8" />
          </span>
          <h1 className="mt-6 max-w-2xl font-serif text-4xl leading-tight text-ink sm:text-5xl md:text-6xl lg:text-7xl">
            Gracias, recibimos tu consulta.
          </h1>
          <p className="mt-5 text-lg leading-8 text-ink/75">
            Vamos a revisar los datos de tu proyecto y te contactaremos para
            coordinar los próximos pasos.
          </p>
          <p className="mt-4 text-base leading-7 text-ink/70">
            Mientras tanto, podés sumar fotos, planos o referencias por WhatsApp
            para que la primera respuesta sea más precisa.
          </p>
          <ThankYouEstimate
            companyName={config.companyName}
            whatsapp={config.whatsapp}
          />
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <TrackedAnchor
              href={buildWhatsAppUrl(whatsappFollowUpMessage, config.whatsapp)}
              eventName="whatsapp_click"
              eventParams={{ source: "thank_you_page" }}
              className="inline-flex h-12 items-center justify-center gap-2 bg-ink px-6 text-sm font-semibold text-paper transition duration-300 hover:-translate-y-0.5 hover:bg-bronze"
            >
              <MessageCircle className="size-4" />
              Escribir por WhatsApp
            </TrackedAnchor>
            <Link
              href="/proyectos"
              className="inline-flex h-12 items-center justify-center gap-2 border border-ink/15 px-6 text-sm font-semibold text-ink transition duration-300 hover:-translate-y-0.5 hover:border-bronze hover:text-bronze"
            >
              Ver proyectos <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
        <div className="grid gap-4">
          {nextSteps.map((step, index) => (
            <article key={step.title} className="premium-card bg-paper p-5">
              <p className="font-serif text-3xl text-bronze">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h2 className="mt-3 font-serif text-3xl text-ink">{step.title}</h2>
              <p className="mt-2 text-sm leading-7 text-ink/75">{step.text}</p>
            </article>
          ))}
        </div>
      </div>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          href="/proceso"
          className="inline-flex h-12 items-center justify-center border border-ink/15 px-6 text-sm font-semibold text-ink transition duration-300 hover:border-bronze hover:text-bronze"
        >
          Conocer cómo trabajamos
        </Link>
        <Link
          href="/"
          className="inline-flex h-12 items-center justify-center border border-ink/15 px-6 text-sm font-semibold text-ink transition duration-300 hover:border-bronze hover:text-bronze"
        >
          Volver al inicio
        </Link>
      </div>
    </section>
  );
}
