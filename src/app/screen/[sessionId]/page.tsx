import { ScreenClient } from "./screen-client";

export default async function ScreenPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <ScreenClient sessionId={sessionId} />;
}
