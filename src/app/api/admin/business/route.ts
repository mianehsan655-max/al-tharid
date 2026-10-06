import { isAdmin } from '@/lib/auth';
import { getBusiness } from '@/lib/business';
import { getSite } from '@/lib/store';
import { getCheckoutSettings, listAllOrders } from '@/lib/orders';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function GET() {
  const headers = {'Cache-Control':'private, no-store, max-age=0','Vary':'Cookie'};
  if (!(await isAdmin())) return Response.json({error:'Please sign in again.'},{status:401,headers});
  try { const [orders,business,checkoutSettings,site] = await Promise.all([listAllOrders(),getBusiness(),getCheckoutSettings(),getSite()]); return Response.json({orders,business,checkoutSettings,items:site.items},{headers}); }
  catch { return Response.json({error:'Business records are temporarily unavailable.'},{status:503,headers}); }
}
