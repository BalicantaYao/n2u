import { MarketMapContent } from "@/components/market-map/MarketMapContent";
import { fetchMarketMap } from "@/lib/market-map-data";
import { requireAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MarketMapPage() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const initial = await fetchMarketMap({ market: "BOTH", rankFrom: 1, rankTo: 100 });

  return <MarketMapContent initial={initial} />;
}
