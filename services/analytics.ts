import { supabase } from './supabase';

export type AnalyticsAction = 'scanned' | 'removed' | 'purchased';

export async function trackProductEvent(
  productId: string,
  storeId: string,
  actionType: AnalyticsAction,
  price: number = 0
) {
  if (!productId || !storeId) return;

  try {
    const { error } = await supabase.from('scan_analytics').insert({
      product_id: productId,
      store_id: storeId,
      action_type: actionType,
      price: Number(price) || 0,
    });

    if (error) {
      console.warn(`[Analytics] Failed to log ${actionType}:`, error.message);
    }
  } catch (err) {
    console.error(`[Analytics] Unexpected error tracking ${actionType}:`, err);
  }
}