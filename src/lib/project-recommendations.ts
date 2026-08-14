type ProjectRecommendationTraits = {
  category: string;
  clientType: string;
  location: string;
  serviceSlug: string;
};

export function rankRelatedProjects<T extends ProjectRecommendationTraits>(
  currentProject: T,
  candidates: T[],
) {
  return candidates
    .map((project, index) => ({
      index,
      project,
      score:
        (project.category === currentProject.category ? 4 : 0) +
        (project.serviceSlug === currentProject.serviceSlug ? 3 : 0) +
        (project.clientType === currentProject.clientType ? 2 : 0) +
        (project.location === currentProject.location ? 1 : 0),
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ project }) => project);
}
