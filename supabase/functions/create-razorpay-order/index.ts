import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight securely
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Manually extract the token from the header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error("Missing Authorization header from mobile app");
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // 2. Explicitly validate the token to bypass Edge Function header dropping bugs
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error(`Auth Error: ${userError?.message || 'Invalid user token'}`);
    }

    const { storeId } = await req.json();

    // 3. Fetch the cart safely
    const { data: cart, error: cartError } = await supabaseClient
      .from('carts')
      .select('items')
      .eq('user_id', user.id)
      .single();

    if (cartError) throw new Error(`Database Error: Could not fetch cart. ${cartError.message}`);
    if (!cart || !cart.items || cart.items.length === 0) throw new Error("Cart is empty");

    // 4. Calculate actual total server-side
    const actualTotal = cart.items.reduce((acc: number, item: any) => acc + (item.price * item.qty), 0);
    const amountInPaise = Math.round(actualTotal * 100);

    // 5. Create Razorpay Order
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    
    if (!razorpayKeyId || !razorpayKeySecret) {
      throw new Error("Server configuration error: Missing Razorpay keys");
    }

    const basicAuth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);

    const razorpayRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `rcpt_${user.id.substring(0, 8)}`
      }),
    });

    const razorpayData = await razorpayRes.json();
    
    if (!razorpayRes.ok) {
      console.error("Razorpay API Error:", razorpayData);
      throw new Error(`Razorpay Error: ${razorpayData.error?.description || 'Failed to create order'}`);
    }

    // Return the safe order ID to the client
    return new Response(
      JSON.stringify({ orderId: razorpayData.id, amount: amountInPaise }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error("Edge Function Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});