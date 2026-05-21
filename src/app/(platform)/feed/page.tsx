import { listActivityFeed } from "@/lib/db/activity-feed";
import FeedClient from "./feed-client";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const events = await listActivityFeed({ limit: 200 });
  return <FeedClient events={events} />;
}
