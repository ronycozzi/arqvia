import { ListingLoading } from "@/components/loading-states";

export default function Loading() {
  return (
    <ListingLoading
      eyebrow="Proyectos"
      filterCount={6}
      title="Cargando obras, casos y referencias."
    />
  );
}
