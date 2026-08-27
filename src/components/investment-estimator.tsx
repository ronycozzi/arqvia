"use client";

import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  Ruler,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { QuoteForm } from "@/components/quote-form";
import { trackEvent } from "@/lib/analytics";
import {
  calculateEstimate,
  estimateTierDetails,
  estimateTierValues,
  formatUsd,
  validateEstimateArea,
  type EstimateSelection,
  type EstimateTierValue,
  type PublicEstimateConfig,
  type PublicEstimateRule,
} from "@/lib/estimator";

export function InvestmentEstimator({
  config,
  rules,
  headingLevel = "h1",
  placement = "estimator_page",
  sourcePage = "/estimador",
}: {
  config: PublicEstimateConfig;
  rules: PublicEstimateRule[];
  headingLevel?: "h1" | "h2";
  placement?: string;
  sourcePage?: string;
}) {
  const [ruleId, setRuleId] = useState(rules[0]?.id || "");
  const [areaInput, setAreaInput] = useState("120");
  const [areaTouched, setAreaTouched] = useState(false);
  const [tier, setTier] = useState<EstimateTierValue>("BALANCED");
  const [selection, setSelection] = useState<EstimateSelection | null>(null);
  const [showConsultation, setShowConsultation] = useState(false);
  const [started, setStarted] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const selectedRule = useMemo(
    () => rules.find((rule) => rule.id === ruleId) || rules[0],
    [ruleId, rules],
  );
  const Heading = headingLevel;
  const headingId = `estimator-heading-${placement}`;
  const parsedArea = Number(areaInput);
  const areaError = validateEstimateArea(parsedArea);

  useEffect(() => {
    trackEvent("estimate_view", { placement, configVersion: config.version });
  }, [config.version, placement]);

  function updateInputs(callback: () => void) {
    if (!started) {
      setStarted(true);
      trackEvent("estimate_start", { placement });
    }
    callback();
    setSelection(null);
    setShowConsultation(false);
  }

  function calculate() {
    setAreaTouched(true);
    if (!selectedRule || areaError) return;
    const result = calculateEstimate(
      selectedRule,
      parsedArea,
      tier,
      config.multipliers,
    );
    const nextSelection: EstimateSelection = {
      ruleId: selectedRule.id,
      ruleKey: selectedRule.key,
      ruleLabel: selectedRule.label,
      tier,
      areaM2: result.areaM2,
      totalMinUsd: result.totalMinUsd,
      totalMaxUsd: result.totalMaxUsd,
      configVersion: config.version,
    };
    setSelection(nextSelection);
    setShowConsultation(false);
    trackEvent("estimate_calculated", {
      placement,
      ruleKey: selectedRule.key,
      tier,
      areaBucket: areaBucket(result.areaM2),
      configVersion: config.version,
    });
    window.setTimeout(() => resultRef.current?.focus(), 0);
  }

  function openConsultation() {
    setShowConsultation(true);
    trackEvent("estimate_continue", {
      placement,
      ruleKey: selection?.ruleKey,
      tier: selection?.tier,
      areaBucket: selection ? areaBucket(selection.areaM2) : undefined,
    });
    window.setTimeout(
      () =>
        document
          .getElementById("consulta-estimador")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      60,
    );
  }

  return (
    <>
      <section
        className="overflow-hidden border border-ink/12 bg-paper shadow-premium"
        aria-labelledby={headingId}
      >
        <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
          <div className="p-5 md:p-8 lg:p-10">
            <div className="flex items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center bg-ink text-paper">
                <Calculator className="size-5 text-bronze-light" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
                  Estimador de inversión
                </p>
                <Heading
                  id={headingId}
                  className="mt-2 max-w-3xl font-serif text-4xl leading-tight text-ink md:text-6xl"
                >
                  {config.headline}
                </Heading>
                <p className="mt-4 max-w-2xl text-base leading-8 text-ink/72">
                  {config.description}
                </p>
              </div>
            </div>

            <fieldset className="mt-9">
              <legend className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/65">
                1. Tipo de proyecto
              </legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {rules.map((rule) => (
                  <label
                    key={rule.id}
                    className="group relative flex min-h-24 cursor-pointer flex-col border border-ink/12 bg-white px-4 py-3 transition hover:-translate-y-0.5 hover:border-bronze has-[:checked]:border-bronze has-[:checked]:bg-bronze-light/30 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-bronze"
                  >
                    <input
                      type="radio"
                      name="estimate-project-type"
                      value={rule.id}
                      checked={rule.id === ruleId}
                      onChange={() => updateInputs(() => setRuleId(rule.id))}
                      className="absolute inset-0 z-10 cursor-pointer opacity-0"
                    />
                    <span className="pointer-events-none font-semibold text-ink">{rule.label}</span>
                    <span className="pointer-events-none mt-1 text-xs leading-5 text-ink/70">
                      {rule.description}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-8">
              <label
                htmlFor="estimate-area"
                className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/65"
              >
                2. Superficie aproximada
              </label>
              <div className="mt-3 grid items-center gap-4 sm:grid-cols-[150px_1fr]">
                <div className="relative">
                  <Ruler
                    className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-bronze"
                    aria-hidden="true"
                  />
                  <input
                    id="estimate-area"
                    type="number"
                    inputMode="numeric"
                    min={10}
                    max={2000}
                    step={1}
                    value={areaInput}
                    aria-invalid={areaTouched && Boolean(areaError)}
                    aria-describedby={areaTouched && areaError ? "estimate-area-error" : "estimate-area-help"}
                    onBlur={() => setAreaTouched(true)}
                    onChange={(event) =>
                      updateInputs(() => setAreaInput(event.currentTarget.value))
                    }
                    className="h-12 w-full border border-ink/15 bg-white pl-11 pr-10 text-base font-semibold text-ink outline-none focus:border-bronze focus:ring-2 focus:ring-bronze/20"
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink/70">
                    m²
                  </span>
                </div>
                <input
                  aria-label="Ajustar superficie en metros cuadrados"
                  type="range"
                  min={10}
                  max={500}
                  step={5}
                  value={Math.min(
                    Math.max(Number.isFinite(parsedArea) ? parsedArea : 10, 10),
                    500,
                  )}
                  onChange={(event) =>
                    updateInputs(() => setAreaInput(event.currentTarget.value))
                  }
                  className="h-2 w-full cursor-pointer accent-bronze"
                />
              </div>
              <p id="estimate-area-help" className="mt-2 text-xs text-ink/70">
                Para superficies mayores a 500 m² podés escribir el valor directamente.
              </p>
              {areaTouched && areaError ? (
                <p
                  id="estimate-area-error"
                  role="alert"
                  className="mt-2 text-sm font-semibold text-red-700"
                >
                  {areaError}
                </p>
              ) : null}
            </div>

            <fieldset className="mt-8">
              <legend className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/65">
                3. Nivel de terminación
              </legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {estimateTierValues.map((value) => (
                  <label
                    key={value}
                    className="relative cursor-pointer border border-ink/12 bg-white p-4 transition hover:border-bronze has-[:checked]:border-bronze has-[:checked]:bg-ink has-[:checked]:text-paper has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-bronze"
                  >
                    <input
                      type="radio"
                      name="estimate-tier"
                      value={value}
                      checked={tier === value}
                      onChange={() => updateInputs(() => setTier(value))}
                      className="absolute inset-0 z-10 cursor-pointer opacity-0"
                    />
                    <span className="pointer-events-none block text-sm font-semibold">
                      {estimateTierDetails[value].label}
                    </span>
                    <span className="pointer-events-none mt-2 block text-xs leading-5 opacity-80">
                      {estimateTierDetails[value].description}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <button
              type="button"
              onClick={calculate}
              className="mt-8 inline-flex min-h-[52px] w-full items-center justify-center gap-2 bg-bronze px-6 text-sm font-semibold text-paper transition hover:-translate-y-0.5 hover:bg-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bronze focus-visible:ring-offset-2 sm:w-auto"
            >
              Calcular rango orientativo
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </div>

          <aside className="relative flex min-h-[420px] flex-col justify-between overflow-hidden bg-ink p-6 text-paper md:p-8 lg:p-10">
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze-light">
                Primera referencia
              </p>
              <h2 className="mt-3 font-serif text-4xl leading-tight">
                Un rango para ordenar la conversación.
              </h2>
              <div className="mt-7 grid gap-3 text-sm leading-6 text-paper/72">
                <p className="flex gap-3">
                  <CheckCircle2 className="mt-1 size-4 shrink-0 text-bronze-light" />
                  Expresado en dólares estadounidenses.
                </p>
                <p className="flex gap-3">
                  <CheckCircle2 className="mt-1 size-4 shrink-0 text-bronze-light" />
                  Ajustado por superficie y terminación.
                </p>
                <p className="flex gap-3">
                  <ShieldCheck className="mt-1 size-4 shrink-0 text-bronze-light" />
                  Recalculado por el servidor al enviar la consulta.
                </p>
              </div>
            </div>

            {selection ? (
              <div
                ref={resultRef}
                tabIndex={-1}
                role="status"
                aria-live="polite"
                className="relative mt-10 border border-bronze/45 bg-paper/[0.06] p-5 outline-none focus-visible:ring-2 focus-visible:ring-bronze-light"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bronze-light">
                  Rango inicial estimado
                </p>
                <p className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">
                  {formatUsd(selection.totalMinUsd)}
                  <span className="mx-2 text-paper/38">—</span>
                  {formatUsd(selection.totalMaxUsd)}
                </p>
                <p className="mt-4 text-sm leading-6 text-paper/68">
                  {selection.ruleLabel} · {selection.areaM2} m² · {estimateTierDetails[selection.tier].label}
                </p>
                <button
                  type="button"
                  onClick={openConsultation}
                  className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-paper px-5 text-sm font-semibold text-ink transition hover:bg-bronze hover:text-paper"
                >
                  Solicitar evaluación profesional
                  <ArrowRight className="size-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <p className="relative mt-10 border-t border-paper/14 pt-5 text-sm leading-7 text-paper/58">
                Elegí las tres variables y calculá para ver la referencia sin dejar datos personales.
              </p>
            )}
          </aside>
        </div>

        <div className="border-t border-ink/10 bg-mist px-5 py-4 text-xs leading-6 text-ink/72 md:px-8">
          <p>{config.disclaimer}</p>
          <Link
            href="/aviso-presupuestos"
            className="mt-2 inline-flex font-semibold text-ink underline decoration-bronze underline-offset-4"
          >
            Ver alcance de las estimaciones
          </Link>
        </div>
      </section>

      {selection && showConsultation ? (
        <section
          id="consulta-estimador"
          className="scroll-mt-28 pt-14"
          aria-labelledby="estimate-consultation-heading"
        >
          <div className="mb-7 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
              Evaluación profesional
            </p>
            <h2
              id="estimate-consultation-heading"
              className="mt-3 font-serif text-4xl leading-tight text-ink md:text-5xl"
            >
              Contanos el contexto detrás del rango.
            </h2>
            <p className="mt-4 text-base leading-8 text-ink/70">
              La categoría, superficie y referencia calculada ya quedan asociadas a la consulta. Sumá ubicación, etapa y prioridades para que el equipo pueda orientarte.
            </p>
          </div>
          <QuoteForm
            key={`${selection.ruleId}-${selection.areaM2}-${selection.tier}-${selection.configVersion}`}
            sourcePage={sourcePage}
            initialEstimate={selection}
          />
        </section>
      ) : null}
    </>
  );
}

function areaBucket(areaM2: number) {
  if (areaM2 < 50) return "10-49";
  if (areaM2 < 100) return "50-99";
  if (areaM2 < 200) return "100-199";
  if (areaM2 < 500) return "200-499";
  return "500+";
}
