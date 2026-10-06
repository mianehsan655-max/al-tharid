import { isAdmin } from "@/lib/auth";
import { getCheckoutSettings, listAllOrders } from "@/lib/orders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const headers = { "Cache-Control": "private, no-store, max-age=0", "Vary": "Cookie" };
  if (!(await isAdmin())) return Response.json({ error: "Please sign in again." }, { status: 401, headers });
  try {
    const [orders, settings] = await Promise.all([listAllOrders(), getCheckoutSettings()]);
    return Response.json({ orders, settings }, { headers });
  } catch {
    return Response.json({ error: "Order updates are temporarily unavailable." }, { status: 503, headers });
  }
}
