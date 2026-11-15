import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Dimensions, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { router, useFocusEffect } from 'expo-router';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { theme } from '../../constants/theme';
import { supabase } from '../../services/supabase';
import { generateBusinessStrategy } from '../../services/gemini';
import { Ionicons } from '@expo/vector-icons';

const screenWidth = Dimensions.get('window').width - 32;

interface AdvancedStats {
  total_revenue: number;
  lost_revenue: number;
  abandonment_rate: number;
  trending_today: { name: string; hits: number }[];
  most_abandoned: { name: string; drop_count: number }[];
  revenue_chart: { day: string; daily_revenue: number }[];
  top_bundles: { item1: string; item2: string; times_bought_together: number }[];
}

export default function OwnerDashboard() {
  const { mode } = useThemeStore();
  const colors = theme.colors[mode];
  const user = useAuthStore((state) => state.profile); 
  
  const [ownerStore, setOwnerStore] = useState<any>(null);
  const [stats, setStats] = useState<AdvancedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [aiStrategy, setAiStrategy] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Modal State
  const [promoModalVisible, setPromoModalVisible] = useState(false);
  const [promoItems, setPromoItems] = useState({ item1: '', item2: '' });
  const [promoType, setPromoType] = useState<'percentage' | 'fixed_price'>('percentage');
  const [promoValue, setPromoValue] = useState('');

  const fetchDashboardData = async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      const { data: storeData } = await supabase.from('stores').select('*').eq('owner_id', user.id).limit(1).single();
      if (storeData) {
        setOwnerStore(storeData);
        const { data: statsData } = await supabase.rpc('get_advanced_dashboard', { target_store_id: storeData.id });
        if (statsData) setStats(statsData);
      }
    } catch (err) { console.error(err); } 
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchDashboardData(); }, [user]));
  const onRefresh = () => { setRefreshing(true); fetchDashboardData(); };

  const handleGenerateStrategy = async () => {
    if (!stats) return;
    setLoadingAi(true);
    try {
      const strategy = await generateBusinessStrategy(stats);
      setAiStrategy(strategy || "AI Strategist is currently offline.");
    } catch (error) {
      setAiStrategy("AI Strategist is currently offline.");
    } finally {
      setLoadingAi(false);
    }
  };

  const handleOpenPromoModal = (item1: string, item2: string) => {
    setPromoItems({ item1, item2 });
    setPromoType('percentage');
    setPromoValue('');
    setPromoModalVisible(true);
  };

  const handleActivateBundle = async () => {
    const val = parseFloat(promoValue);
    if (isNaN(val) || val <= 0) return Alert.alert("Invalid Input", "Please enter a valid number greater than 0.");
    if (promoType === 'percentage' && val > 100) return Alert.alert("Invalid Input", "Percentage cannot exceed 100.");

    const { error } = await supabase.from('store_promotions').insert({
      store_id: ownerStore.id,
      item1_name: promoItems.item1,
      item2_name: promoItems.item2,
      discount_type: promoType,
      discount_value: val
    });

    if (error) {
      if (error.code === '23505') Alert.alert("Already Active", "This exact combo is already running.");
      else Alert.alert("Error", error.message);
    } else {
      Alert.alert("Success", "Combo activated! Customers will now see this deal.");
      setPromoModalVisible(false);
    }
  };

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  
  if (!ownerStore) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: 24 }]}>
        <Ionicons name="storefront-outline" size={80} color={colors.textSecondary} style={{ marginBottom: 16 }} />
        <Text style={{ color: colors.textPrimary, fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>Welcome to ScanVerse</Text>
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: 32 }}>Register your store to access the analytics dashboard.</Text>
        <TouchableOpacity style={{ backgroundColor: colors.primary, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }} onPress={() => router.push('/(owner)/register-store')}>
          <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>Register Your Store</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const chartLabels = stats?.revenue_chart?.length ? stats.revenue_chart.map(d => d.day) : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const chartData = stats?.revenue_chart?.length ? stats.revenue_chart.map(d => d.daily_revenue) : [0, 0, 0, 0, 0];
  const barLabels = stats?.trending_today?.length ? stats.trending_today.map(t => t.name.substring(0, 8)) : ['N/A'];
  const barData = stats?.trending_today?.length ? stats.trending_today.map(t => t.hits) : [0];

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Business Analytics</Text>
          <Text style={{ color: colors.textSecondary }}>{ownerStore.name}</Text>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={[styles.aiBtn, { backgroundColor: '#111' }]} onPress={handleGenerateStrategy} disabled={loadingAi}>
            {loadingAi ? <ActivityIndicator color="#FFF" /> : (
              <>
                <Ionicons name="sparkles" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>Generate AI Strategy</Text>
              </>
            )}
          </TouchableOpacity>

          {aiStrategy && (
            <View style={[styles.aiResultCard, { backgroundColor: 'rgba(30, 142, 90, 0.05)', borderColor: colors.primary }]}>
              <Text style={{ color: colors.primary, fontWeight: 'bold', marginBottom: 8, fontSize: 12, letterSpacing: 1 }}>AI CONSULTANT REPORT</Text>
              <Text style={{ color: colors.textPrimary, lineHeight: 22 }}>{aiStrategy}</Text>
            </View>
          )}
        </View>

        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 'bold' }}>TOTAL REVENUE</Text>
            <Text style={[styles.metricValue, { color: colors.primary }]}>₹{stats?.total_revenue || 0}</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 'bold' }}>CART DROP RATE</Text>
            <Text style={[styles.metricValue, { color: '#ef4444' }]}>{stats?.abandonment_rate || 0}%</Text>
          </View>
        </View>

        <View style={[styles.alertCard, { backgroundColor: 'rgba(239, 68, 68, 0.05)', borderColor: '#ef4444' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="trending-down" size={24} color="#ef4444" style={{ marginRight: 8 }} />
            <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 16 }}>Lost Revenue</Text>
          </View>
          <Text style={{ color: colors.textPrimary, fontSize: 24, fontWeight: 'bold' }}>₹{stats?.lost_revenue || 0}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>Value of items scanned but deleted from carts.</Text>
        </View>

        {stats?.top_bundles && stats.top_bundles.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Frequently Bought Together</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16 }}>
              {stats.top_bundles.map((bundle, index) => (
                <View key={index} style={[styles.bundleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <View style={[styles.bundlePill, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Text style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 12 }} numberOfLines={1}>{bundle.item1}</Text>
                    </View>
                    <Ionicons name="add" size={20} color={colors.textSecondary} style={{ marginHorizontal: 8 }} />
                    <View style={[styles.bundlePill, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Text style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 12 }} numberOfLines={1}>{bundle.item2}</Text>
                    </View>
                  </View>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, flex: 1 }}>Paired in {bundle.times_bought_together} orders</Text>
                    <TouchableOpacity 
                      style={{ backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
                      onPress={() => handleOpenPromoModal(bundle.item1, bundle.item2)}
                    >
                      <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>Activate Deal</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>7-Day Sales Volume</Text>
          <View style={[styles.chartBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <LineChart data={chartLabels.map((label, index) => ({ value: chartData[index], label }))} width={screenWidth - 60} height={200} color={colors.primary} thickness={3} dataPointsColor={colors.primary} yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }} xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 10 }} hideRules isAnimated />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Trending Today</Text>
          <View style={[styles.chartBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <BarChart data={barLabels.map((label, index) => ({ value: barData[index], label }))} width={screenWidth - 60} height={200} frontColor="#3b82f6" borderRadius={4} yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }} xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 10 }} hideRules isAnimated showValuesAsTopLabel topLabelTextStyle={{ color: colors.textPrimary, fontSize: 10, fontWeight: 'bold', marginBottom: 4 }} />
          </View>
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Promotion Config Modal */}
      <Modal visible={promoModalVisible} transparent={true} animationType="fade" onRequestClose={() => setPromoModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Configure Combo Deal</Text>
            <Text style={{ color: colors.textSecondary, marginBottom: 16 }}>{promoItems.item1} + {promoItems.item2}</Text>
            
            <View style={{ flexDirection: 'row', marginBottom: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: 'hidden' }}>
              <TouchableOpacity 
                style={{ flex: 1, padding: 12, backgroundColor: promoType === 'percentage' ? colors.primary : colors.surface, alignItems: 'center' }}
                onPress={() => setPromoType('percentage')}
              >
                <Text style={{ fontWeight: 'bold', color: promoType === 'percentage' ? '#FFF' : colors.textSecondary }}>% OFF</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ flex: 1, padding: 12, backgroundColor: promoType === 'fixed_price' ? colors.primary : colors.surface, alignItems: 'center' }}
                onPress={() => setPromoType('fixed_price')}
              >
                <Text style={{ fontWeight: 'bold', color: promoType === 'fixed_price' ? '#FFF' : colors.textSecondary }}>Fixed Price</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
              keyboardType="numeric"
              placeholder={promoType === 'percentage' ? "e.g. 15 for 15% off" : "e.g. 200 for ₹200 combo price"}
              placeholderTextColor={colors.textSecondary}
              value={promoValue}
              onChangeText={setPromoValue}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.background }]} onPress={() => setPromoModalVisible(false)}>
                <Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={handleActivateBundle}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Launch Deal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, padding: 16, paddingTop: 60 },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  aiBtn: { flexDirection: 'row', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  aiResultCard: { marginTop: 12, padding: 16, borderRadius: 12, borderWidth: 1 },
  metricsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  metricCard: { flex: 0.48, padding: 16, borderRadius: 12, borderWidth: 1, elevation: 1 },
  metricValue: { fontSize: 24, fontWeight: 'bold', marginTop: 8 },
  alertCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  bundleCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 24, width: 300, marginRight: 16 },
  bundlePill: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  chartBox: { padding: 16, borderRadius: 16, borderWidth: 1, overflow: 'hidden', alignItems: 'center' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', padding: 24, borderRadius: 16, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 8, padding: 16, fontSize: 18, marginBottom: 24, textAlign: 'center' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  modalBtn: { flex: 1, padding: 16, borderRadius: 8, alignItems: 'center' }
});