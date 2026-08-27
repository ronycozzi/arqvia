"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ParsedMetricValue = {
  decimalDigits: number;
  prefix: string;
  suffix: string;
  target: number;
};

export function parseMetricValue(value: string): ParsedMetricValue | null {
  const match = value.match(/\d[\d.,]*/);
  if (!match) return null;

  const rawNumber = match[0];
  const lastDot = rawNumber.lastIndexOf(".");
  const lastComma = rawNumber.lastIndexOf(",");
  const hasBothSeparators = lastDot >= 0 && lastComma >= 0;
  let decimalDigits = 0;
  let normalizedNumber = rawNumber;

  if (hasBothSeparators) {
    const decimalIndex = Math.max(lastDot, lastComma);
    const whole = rawNumber.slice(0, decimalIndex).replace(/[.,]/g, "");
    const fraction = rawNumber.slice(decimalIndex + 1).replace(/[.,]/g, "");
    decimalDigits = fraction.length;
    normalizedNumber = `${whole}.${fraction}`;
  } else if (lastDot >= 0 || lastComma >= 0) {
    const separator = lastDot >= 0 ? "." : ",";
    const groups = rawNumber.split(separator);
    const usesThousandsGrouping =
      groups.length > 1 && groups.slice(1).every((group) => group.length === 3);

    if (usesThousandsGrouping) {
      normalizedNumber = groups.join("");
    } else {
      const fraction = groups.at(-1) || "";
      decimalDigits = fraction.length;
      normalizedNumber = `${groups.slice(0, -1).join("")}.${fraction}`;
    }
  }

  const target = Number(normalizedNumber);
  if (!Number.isFinite(target)) return null;

  const startIndex = match.index || 0;
  return {
    decimalDigits,
    prefix: value.slice(0, startIndex),
    suffix: value.slice(startIndex + rawNumber.length),
    target,
  };
}

export function formatMetricValue(
  metric: ParsedMetricValue,
  currentValue: number,
) {
  const formatter = new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: metric.decimalDigits,
    minimumFractionDigits: metric.decimalDigits,
  });

  return `${metric.prefix}${formatter.format(currentValue)}${metric.suffix}`;
}

export function MetricCounter({
  value,
  delay = 0,
  duration = 720,
}: {
  value: string;
  delay?: number;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const parsedMetric = useMemo(() => parseMetricValue(value), [value]);
  const [animation, setAnimation] = useState<{
    source: string;
    value: string;
  } | null>(null);
  const displayValue = animation?.source === value ? animation.value : value;

  useEffect(() => {
    const element = ref.current;
    if (!element || !parsedMetric) return;

    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion || !("IntersectionObserver" in window)) return;

    let animationFrame = 0;
    let startTimer = 0;
    let hasStarted = false;
    const safeDelay = Math.min(Math.max(delay, 0), 240);
    const safeDuration = Math.min(Math.max(duration, 300), 1200);

    const startAnimation = () => {
      const startedAt = window.performance.now();

      const update = (now: number) => {
        const progress = Math.min((now - startedAt) / safeDuration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3);

        setAnimation({
          source: value,
          value:
            progress === 1
              ? value
              : formatMetricValue(parsedMetric, parsedMetric.target * easedProgress),
        });

        if (progress < 1) {
          animationFrame = window.requestAnimationFrame(update);
        }
      };

      animationFrame = window.requestAnimationFrame(update);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (hasStarted || !entries.some((entry) => entry.isIntersecting)) return;

        hasStarted = true;
        observer.disconnect();
        setAnimation({
          source: value,
          value: formatMetricValue(parsedMetric, 0),
        });
        startTimer = window.setTimeout(startAnimation, safeDelay);
      },
      { rootMargin: "0px 0px -5% 0px", threshold: 0.35 },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      window.clearTimeout(startTimer);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [delay, duration, parsedMetric, value]);

  return (
    <>
      <span ref={ref} aria-hidden="true">
        {displayValue}
      </span>
      <span className="sr-only">{value}</span>
    </>
  );
}
