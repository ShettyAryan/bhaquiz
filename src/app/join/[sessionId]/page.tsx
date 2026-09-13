import { JoinClient } from "./join-client";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <JoinClient sessionId={sessionId} />;
}
