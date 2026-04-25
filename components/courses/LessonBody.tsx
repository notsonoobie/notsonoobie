import { EpisodeMarkdown } from "./EpisodeMarkdown";

export function LessonBody({ source }: { source: string }) {
  return <EpisodeMarkdown source={source} />;
}
