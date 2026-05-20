import { WatchlistMapContent } from "@/components/watchlist-map/WatchlistMapContent";
import { fetchWatchlistMap } from "@/lib/watchlist-map-data";
import { requireAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function WatchlistMapPage() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const initial = await fetchWatchlistMap(auth.userId);

  return <WatchlistMapContent initial={initial} />;
}
