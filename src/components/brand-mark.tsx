import { cn } from "@/lib/utils";

function initials(companyName: string) {
  const words = companyName.trim().split(/\s+/).filter(Boolean);

  if (words.length > 1) {
    return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
  }

  const word = words[0] || "A";
  return `${word[0] || "A"}${word[Math.floor(word.length / 2)] || ""}`.toUpperCase();
}

export function BrandMark({
  className,
  companyName,
  logoUrl,
}: {
  className?: string;
  companyName: string;
  logoUrl?: string;
}) {
  return (
    <span
      className={cn(
        "logo-mark grid size-11 shrink-0 place-items-center overflow-hidden border border-paper/24 bg-paper/8 text-sm font-semibold text-paper",
        className,
      )}
      aria-hidden={logoUrl ? undefined : true}
    >
      {logoUrl ? (
        // Logos administrados viven en /public o en el storage autorizado por CSP.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={`Logo de ${companyName}`}
          className="size-full object-contain p-1.5"
        />
      ) : (
        initials(companyName)
      )}
    </span>
  );
}
