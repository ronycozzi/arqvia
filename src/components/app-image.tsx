import NextImage, { type ImageProps } from "next/image";
import { withBasePath } from "@/lib/base-path";

/**
 * `next/image` does not prepend `basePath` to a string `src`. Content and the
 * database keep app-relative paths ("/images/...", "/uploads/media/..."), so
 * the prefix is added here, at render time. Import this instead of
 * `next/image` everywhere in the app.
 */
export default function Image({ src, ...props }: ImageProps) {
  return (
    <NextImage
      {...props}
      src={typeof src === "string" ? withBasePath(src) : src}
    />
  );
}
