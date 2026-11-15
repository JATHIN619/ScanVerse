import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// @ts-ignore
const session = new Supabase.ai.Session('gte-small');

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Sweep the database
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, category')
      .is('embedding', null);

    if (error) throw error;
    
    if (!products || products.length === 0) {
      return new Response("All products already have embeddings!");
    }

    let processed = 0;

    // 2. Loop through and embed them all
    for (const product of products) {
      const textToEmbed = `${product.name} ${product.category || ''}`;
      
      const embedding = await session.run(textToEmbed, {
        mean_pool: true,
        normalize: true,
      });

      // 3. Update the database
      const { error: updateError } = await supabase
        .from('products')
        .update({ embedding: Array.from(embedding) })
        .eq('id', product.id);
        
      if (updateError) throw updateError;
        
      processed++;
    }

    return new Response(`Success! AI generated embeddings for ${processed} products.`);

  } catch (err: any) {
    // Force the exact error message to print to the browser
    const errorMessage = err.message || JSON.stringify(err);
    return new Response(`CRASH REPORT: ${errorMessage}`, { 
      status: 500,
      headers: { "Content-Type": "text/plain" }
    });
  }
});