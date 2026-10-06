'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { addExpense, saveCost, voidExpense } from '@/lib/business';
import { createManualOrder, updateOrder } from '@/lib/orders';
import type { CollectionChannel, Expense, StaffOrderInput } from '@/lib/businessTypes';
function message(error: unknown) {
  if ((error as NodeJS.ErrnoException)?.code) return 'Could not save this business record. Please try again.';
  return error instanceof Error ? error.message : 'Could not save this business record.';
}
export async function enterManualOrder(input: StaffOrderInput) {
  try { await requireAdmin(); const order = await createManualOrder(input); revalidatePath('/admin'); return {ok:true as const,order}; }
  catch(error) { return {ok:false as const,error:message(error)}; }
}
export async function collectPayment(requestId: string, version: number, channel: CollectionChannel, reference: string) {
  try { await requireAdmin(); const order = await updateOrder(requestId,version,'payment',undefined,{channel,reference}); revalidatePath('/admin'); return {ok:true as const,order}; }
  catch(error) { return {ok:false as const,error:message(error)}; }
}
export async function recordExpense(input: Omit<Expense,'id'|'createdAt'|'voidedAt'|'voidReason'>) {
  try { await requireAdmin(); const business = await addExpense(input); revalidatePath('/admin'); return {ok:true as const,business}; }
  catch(error) { return {ok:false as const,error:message(error)}; }
}
export async function cancelExpense(id: string, reason: string, version: number) {
  try { await requireAdmin(); const business = await voidExpense(id,reason,version); revalidatePath('/admin'); return {ok:true as const,business}; }
  catch(error) { return {ok:false as const,error:message(error)}; }
}
export async function setProductCost(id: string, cost: number, version: number) {
  try { await requireAdmin(); const business = await saveCost(id,cost,version); revalidatePath('/admin'); return {ok:true as const,business}; }
  catch(error) { return {ok:false as const,error:message(error)}; }
}
