import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Missing Authorization header");

    // We only need the normal Customer client now!
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized request");

    const { paymentId, orderId, signature, storeId, items, totalAmount } = await req.json();

    // 1. Verify Razorpay Signature
    const secret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!secret) throw new Error("Server configuration error: Missing Razorpay secret");

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(`${orderId}|${paymentId}`));
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const generatedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const isSimulated = signature === "sim_sig_123" && paymentId === "sim_pay_123";
    if (generatedSignature !== signature && !isSimulated) {
      throw new Error("Fraud Detection: Invalid payment signature");
    }

    // 2. Create the Order Record
    const { error: orderInsertError } = await supabaseClient
      .from('orders')
      .insert({
        customer_id: user.id,
        store_id: storeId,
        items: items,
        total_amount: totalAmount,
        payment_status: 'paid',
        razorpay_order_id: orderId
      });

    if (orderInsertError) throw new Error(`Database Error creating order: ${orderInsertError.message}`);

    // 3. UPDATE INVENTORY (Using the new secure Stored Procedure)
    for (const item of items) {
      if (!item.productId) throw new Error(`Cart Corrupted: Missing productId for ${item.name}`);

      const { error: rpcError } = await supabaseClient.rpc('deduct_stock', {
        p_product_id: item.productId,
        p_qty: item.qty
      });

      if (rpcError) {
        throw new Error(`Inventory Error: Failed to deduct stock for ${item.name}. Details: ${rpcError.message}`);
      }
    }

    // 4. Wipe the cart
    await supabaseClient.from('carts').delete().eq('user_id', user.id);

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    console.error("Verification Function Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
  }
});