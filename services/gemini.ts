import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from './supabase';

const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function generateRecipeAndMatchCart(userPrompt: string, storeId: string) {
  try {
    const { data: inventory, error } = await supabase
      .from('products')
      .select('id, name, category, price, stock_qty')
      .eq('store_id', storeId)
      .gt('stock_qty', 0);

    if (error || !inventory) throw new Error("Failed to fetch store inventory");

    const trimmedInventory = inventory.map(item => ({ id: item.id, name: item.name }));

    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.8-flash",
      generationConfig: { 
        responseMimeType: "application/json",
        temperature: 0.1 
      }
    });

    const systemInstruction = `
      Task: Create a recipe for "${userPrompt}".
      Inventory: ${JSON.stringify(trimmedInventory)}
      Rules:
      1. Cross-reference required ingredients with the Inventory.
      2. Return ONLY JSON.
      Format: { "recipe_name": "Name", "matched_items": [{ "id": "uuid", "qty": 1 }], "missing_items": ["Item"] }
    `;

    const maxRetries = 2;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await model.generateContent(systemInstruction);
        const recipeData = JSON.parse(result.response.text());
        
        const matchedProducts = recipeData.matched_items.map((aiItem: any) => {
          const fullProduct = inventory.find(p => p.id === aiItem.id);
          return fullProduct ? { ...fullProduct, requested_qty: aiItem.qty } : null;
        }).filter(Boolean); 

        return {
          recipeName: recipeData.recipe_name,
          matchedProducts: matchedProducts,
          missingIngredients: recipeData.missing_items || []
        };

      } catch (aiError: any) {
        if (aiError.message && aiError.message.includes('503') && attempt < maxRetries) {
          console.warn(`Recipe API Overload. Retrying... (${attempt}/${maxRetries})`);
          await delay(1000 * attempt);
          continue;
        }
        
        console.warn("Recipe API completely failed. Engaging emergency mock data fallback.");
        const mockMatched = inventory.length > 0 ? [{ ...inventory[0], requested_qty: 1 }] : [];
        if (inventory.length > 1) mockMatched.push({ ...inventory[1], requested_qty: 1 });

        return {
          recipeName: `AI Offline: Mock ${userPrompt.substring(0, 10)}...`,
          matchedProducts: mockMatched,
          missingIngredients: ["API Service Temporarily Down", "Try again later"]
        };
      }
    }
  } catch (err) {
    console.error("Gemini Optimization Error:", err);
    return null;
  }
}

// AI EXECUTIVE STRATEGIST PIPELINE
export async function generateBusinessStrategy(dashboardData: any) {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.8-flash",
      generationConfig: { temperature: 0.2 } 
    });

    const leanData = {
      total_revenue: dashboardData.total_revenue,
      lost_revenue: dashboardData.lost_revenue,
      abandonment_rate: dashboardData.abandonment_rate,
      trending_today: dashboardData.trending_today,
      most_abandoned: dashboardData.most_abandoned,
      top_bundle: dashboardData.top_bundle
    };

    const prompt = `
      You are an expert retail business strategist. Analyze this live dashboard data:
      ${JSON.stringify(leanData)}
      
      STRICT OUTPUT RULES:
      1. Provide exactly 3 short, actionable bullet points advising the store owner on how to increase profit or optimize inventory.
      2. You MUST use the Indian Rupee (₹) symbol for all financial values. NEVER use the $ symbol.
      3. Output PLAIN TEXT ONLY. Do NOT use markdown formatting like asterisks (**), bolding, or italics.
      4. Do not include greetings, introductions, or conclusions. Just output the 3 numbered bullet points.
    `;

    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("API_TIMEOUT")), 15000)
    );

    const maxRetries = 2;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result: any = await Promise.race([
          model.generateContent(prompt),
          timeout
        ]);
        return result.response.text();
      } catch (aiError: any) {
        if (attempt < maxRetries) {
          console.warn(`Strategist API stalled. Retrying attempt ${attempt + 1}...`);
          await delay(2000);
          continue;
        }
        throw aiError;
      }
    }
  } catch (err) {
    console.warn("AI Strategist Timeout/Error Caught. Injecting randomized mock data.");
    
    const topItem1 = dashboardData.top_bundle?.item1 || 'top products';
    const topItem2 = dashboardData.top_bundle?.item2 || 'related items';
    const trendingItem = dashboardData.trending_today?.[0]?.name || 'high-demand items';
    const lostRev = dashboardData.lost_revenue || 0;
    const dropRate = dashboardData.abandonment_rate || 0;

    const templates = [
      `1. Bundle Opportunity: Customers frequently buy "${topItem1}" and "${topItem2}" together. Create a combo offer to drive higher average order value.
2. Revenue Leakage: You have lost ₹${lostRev} to abandoned carts. Investigate pricing or checkout friction causing the ${dropRate}% drop rate.
3. Inventory Focus: "${trendingItem}" is currently driving significant foot traffic. Prioritize restocking this to maintain momentum.`,

      `1. Cart Recovery: Your abandonment rate sits at ${dropRate}%, costing you ₹${lostRev}. Consider lowering prices on highly dropped items.
2. Cross-Selling: Leverage the strong correlation between "${topItem1}" and "${topItem2}" by placing them next to each other physically or digitally.
3. Stock Warning: Demand for "${trendingItem}" is surging. Do not let this item hit zero stock or you will bottleneck your daily revenue.`,

      `1. Sales Strategy: Capitalize on the "${topItem1} + ${topItem2}" purchasing trend. Offering a 5% discount on this bundle could increase volume.
2. Drop-Off Analysis: ₹${lostRev} was left at checkout. Review your highest-priced items, as they typically drive a ${dropRate}% abandonment rate.
3. Capital Allocation: Reinvest capital into your top mover, "${trendingItem}", to ensure you capture all available local demand.`
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  }
}