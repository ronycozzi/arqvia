import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  as?: "h1" | "h2";
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  as = "h2",
  className,
}: SectionHeadingProps) {
  const HeadingTag = as;

  return (
    <div
      className={cn(
        "section-heading max-w-4xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow ? (
        <p className="mb-4 text-xs font-bold uppercase leading-none text-bronze">
          {eyebrow}
        </p>
      ) : null}
      <HeadingTag
        className={cn(
          "text-balance font-serif font-medium text-ink",
          as === "h1"
            ? "text-3xl leading-[1.15] md:text-4xl"
            : "text-2xl leading-[1.2] md:text-3xl",
        )}
      >
        {title}
      </HeadingTag>
      {description ? (
        <p
          className={cn(
            "mt-3 max-w-2xl text-pretty text-base leading-7 text-ink/72",
            align === "center" && "mx-auto",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
