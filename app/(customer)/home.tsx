import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView, FlatList } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useThemeStore } from '../../store/themeStore';
import { useStoreStore } from '../../store/storeStore';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { theme } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { generateRecipeAndMatchCart } from '../../services/gemini';
import { supabase } from '../../services/supabase';
import AIRecommendations from '../../components/AIRecommendations';

export default function Home() {
  const { mode } = useThemeStore();
  const colors = theme.colors[mode];
  
  const user = useAuthStore(state => state.profile);
  const activeStore = useStoreStore((state) => state.activeStore);
  const { itemCount, totalPrice, addItem, fetchPromotions, activePromotions } = useCartStore();
  
  const cartItems = useCartStore((state: any) => state.items || []);
  const lastScannedProductId = cartItems.length > 0 ? cartItems[cartItems.length - 1].productId : null;

  const [prompt, setPrompt] = useState('');
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [recipeResult, setRecipeResult] = useState<any>(null);

  const [trendingProducts, setTrendingProducts] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchStoreData = async () => {
    if (!activeStore?.id) return;
    setLoadingData(true);
    try {
      await fetchPromotions(activeStore.id);
      const { data: trending } = await supabase.rpc('get_global_trending_products', { target_store_id: activeStore.id, limit_cnt: 5 });
      const { data: allItems } = await supabase.from('products').select('*').eq('store_id', activeStore.id).order('name');

      if (trending) setTrendingProducts(trending);
      if (allItems) setAllProducts(allItems);
    } catch (err) { console.error(err); } finally { setLoadingData(false); }
  };

  useFocusEffect(useCallback(() => { fetchStoreData(); }, [activeStore]));

  const handleGenerateRecipe = async () => {
    if (!prompt.trim()) return Alert.alert("Empty Prompt", "Tell the AI what you want to eat first.");
    if (!activeStore) return Alert.alert("No Store", "You must select a store before generating a recipe.");
    setLoadingRecipe(true); setRecipeResult(null);
    const result = await generateRecipeAndMatchCart(prompt, activeStore.id);
    if (!result) Alert.alert("API Error", "The AI failed to process the recipe.");
    else setRecipeResult(result);
    setLoadingRecipe(false);
  };

  const handleAddAllToCart = async () => {
    if (!recipeResult || !user || !activeStore || recipeResult.matchedProducts.length === 0) return;
    let successCount = 0;
    for (const item of recipeResult.matchedProducts) {
      if (await addItem(item, user.id, activeStore.id)) successCount++;
    }
    Alert.alert("Cart Updated", `Added ${successCount} items to cart.`, [{ text: "OK", style: "cancel" }]);
  };

  // MULTI-ITEM BUNDLE INJECTOR
  const handleAddBundle = async (requiredItems: any[]) => {
    // Check Stock First
    for (const req of requiredItems) {
      const p = allProducts.find(prod => prod.name === req.name);
      if (!p) return Alert.alert("Unavailable", `"${req.name}" is no longer sold here.`);
      if (p.stock_qty < req.qty) return Alert.alert("Out of Stock", `Not enough "${req.name}" in stock for this deal.`);
    }
    // Add all required quantities to cart
    for (const req of requiredItems) {
      const p = allProducts.find(prod => prod.name === req.name);
      for(let i=0; i < req.qty; i++) await addItem(p, user!.id, activeStore!.id);
    }
    Alert.alert("Deal Applied", "Bundle added! Discount will be reflected in your cart total.");
  };

  const renderHorizontalCard = ({ item }: { item: any }) => {
    const isOutOfStock = item.stock_qty <= 0;
    return (
      <View style={[styles.horizontalCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: isOutOfStock ? 0.6 : 1 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.productName, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
          {item.category && item.category.trim() !== '' && <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{item.category}</Text>}
          <Text style={{ color: isOutOfStock ? '#ef4444' : colors.primary, fontWeight: 'bold', marginTop: 4 }}>
            {isOutOfStock ? 'OUT OF STOCK' : `₹${item.price}`}
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.smallAddBtn, { backgroundColor: isOutOfStock ? colors.border : colors.primary }]}
          onPress={() => {
            if (isOutOfStock) return Alert.alert("Out of Stock", "This item is currently unavailable.");
            addItem(item, user?.id, activeStore?.id);
            Alert.alert("Added", `${item.name} added to cart`);
          }}
          disabled={isOutOfStock}
        >
          <Ionicons name="cart" size={18} color={isOutOfStock ? colors.textSecondary : "#FFF"} />
        </TouchableOpacity>
      </View>
    );
  };

  const filteredProducts = allProducts.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      
      <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 'bold', letterSpacing: 1 }}>CURRENTLY SHOPPING AT</Text>
        <Text style={[styles.storeName, { color: colors.primary }]}>{activeStore ? activeStore.name : 'No Store Selected'}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{activeStore ? activeStore.address : 'Go to Account to select a store.'}</Text>
      </View>

      <TouchableOpacity style={[styles.cartPill, { backgroundColor: colors.primary }]} onPress={() => router.push('/(customer)/cart')} activeOpacity={0.9}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name="cart" size={28} color="#FFF" />
          <View>
            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '600', opacity: 0.9 }}>Cart Total</Text>
            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}>{itemCount} Items</Text>
          </View>
        </View>
        <Text style={{ color: '#FFF', fontSize: 24, fontWeight: 'bold' }}>₹{totalPrice.toFixed(2)}</Text>
      </TouchableOpacity>

      {/* DYNAMIC BUNDLE DEALS */}
      {activePromotions && activePromotions.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#ef4444' }]}>🔥 Hot Deals</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16 }}>
            {activePromotions.map((promo, idx) => {
              const dealText = promo.discount_type === 'percentage' ? `${promo.discount_value}% OFF` : `Combo @ ₹${promo.discount_value}`;
              return (
                <View key={idx} style={[styles.promoCard, { backgroundColor: 'rgba(239, 68, 68, 0.05)', borderColor: '#ef4444' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 16 }}>{dealText}</Text>
                    <Ionicons name="pricetag" size={20} color="#ef4444" />
                  </View>
                  <Text style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>{promo.bundle_name}</Text>
                  
                  <View style={{ marginBottom: 16 }}>
                    {promo.required_items.map((req: any, i: number) => (
                      <Text key={i} style={{ color: colors.textSecondary, fontSize: 12 }}>• {req.qty}x {req.name}</Text>
                    ))}
                  </View>

                  <TouchableOpacity 
                    style={[styles.smallAddBtn, { backgroundColor: '#ef4444', width: '100%', alignItems: 'center', marginTop: 'auto' }]}
                    onPress={() => handleAddBundle(promo.required_items)}
                  >
                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Add Bundle to Cart</Text>
                  </TouchableOpacity>
                </View>
              )
            })}
          </ScrollView>
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>AI Recipe Builder</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
          placeholder="What are you craving? e.g., Biryani"
          placeholderTextColor={colors.textSecondary}
          value={prompt}
          onChangeText={setPrompt}
          multiline
        />
        <TouchableOpacity style={[styles.generateBtn, { backgroundColor: colors.primary, opacity: loadingRecipe ? 0.7 : 1 }]} onPress={handleGenerateRecipe} disabled={loadingRecipe}>
          {loadingRecipe ? <ActivityIndicator color="#FFF" /> : (
            <>
              <Ionicons name="sparkles" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.generateBtnText}>Generate Recipe</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {recipeResult && (
        <View style={styles.resultSection}>
          <Text style={[styles.recipeTitle, { color: colors.primary }]}>{recipeResult.recipeName}</Text>
          <Text style={{ color: colors.textSecondary, fontWeight: 'bold', marginBottom: 12 }}>AVAILABLE IN STORE:</Text>
          {recipeResult.matchedProducts.map((item: any, index: number) => (
            <View key={index} style={[styles.ingredientCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.productName, { color: colors.textPrimary }]}>{item.name}</Text>
              <Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>₹{item.price}</Text>
            </View>
          ))}
          <TouchableOpacity style={[styles.generateBtn, { backgroundColor: '#111', marginTop: 12 }]} onPress={handleAddAllToCart}>
            <Ionicons name="cart" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.generateBtnText}>Add Available to Cart</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        {lastScannedProductId ? (
          <AIRecommendations currentProductId={lastScannedProductId} />
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>You might also like</Text>
            <View style={[styles.recPlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="sparkles" size={24} color={colors.textSecondary} style={{ marginBottom: 8 }} />
              <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>Scan an item to see AI recommendations.</Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>🔥 Trending Near You</Text>
        {loadingData ? <ActivityIndicator color={colors.primary} /> : (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={trendingProducts}
            keyExtractor={item => `trending-${item.id}`}
            renderItem={renderHorizontalCard}
            contentContainerStyle={{ paddingRight: 16 }}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>All Store Products</Text>
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput style={{ flex: 1, color: colors.textPrimary, fontSize: 16 }} placeholder="Search inventory..." placeholderTextColor={colors.textSecondary} value={searchQuery} onChangeText={setSearchQuery} />
        </View>

        {loadingData ? <ActivityIndicator color={colors.primary} /> : (
          filteredProducts.map(item => {
            const isOutOfStock = item.stock_qty <= 0;
            return (
              <View key={`all-${item.id}`} style={[styles.verticalCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: isOutOfStock ? 0.6 : 1 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.productName, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
                  {item.category && item.category.trim() !== '' && <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{item.category}</Text>}
                  <Text style={{ color: isOutOfStock ? '#ef4444' : colors.primary, fontWeight: 'bold', marginTop: 4 }}>
                    {isOutOfStock ? 'OUT OF STOCK' : `₹${item.price}`}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={[styles.smallAddBtn, { backgroundColor: isOutOfStock ? colors.border : colors.primary }]}
                  onPress={() => {
                    if (isOutOfStock) return Alert.alert("Out of Stock", "This item is currently unavailable.");
                    addItem(item, user?.id, activeStore?.id);
                    Alert.alert("Added", `${item.name} added to cart`);
                  }}
                  disabled={isOutOfStock}
                >
                  <Ionicons name="cart" size={18} color={isOutOfStock ? colors.textSecondary : "#FFF"} />
                </TouchableOpacity>
              </View>
            );
          })
        )}
        {filteredProducts.length === 0 && !loadingData && <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 16 }}>No items match your search.</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 60 },
  headerCard: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 24 },
  storeName: { fontSize: 24, fontWeight: 'bold', marginVertical: 6 },
  cartPill: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderRadius: 16, marginBottom: 24 },
  promoCard: { width: 220, minHeight: 200, padding: 16, borderRadius: 16, borderWidth: 1, marginRight: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 16, minHeight: 80, textAlignVertical: 'top', marginBottom: 12 },
  generateBtn: { flexDirection: 'row', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  generateBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  resultSection: { marginBottom: 24, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  recipeTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  ingredientCard: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderWidth: 1, borderRadius: 12, marginBottom: 8 },
  recPlaceholder: { padding: 32, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  horizontalCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderWidth: 1, borderRadius: 12, width: 220, marginRight: 16 },
  verticalCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderWidth: 1, borderRadius: 12, marginBottom: 12, width: '100%' },
  productName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  smallAddBtn: { padding: 10, borderRadius: 8, marginLeft: 12 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderRadius: 12, marginBottom: 16 }
});