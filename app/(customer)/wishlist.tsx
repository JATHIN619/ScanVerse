import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { useWishlistStore } from '../../store/wishlistStore';
import { useStoreStore } from '../../store/storeStore';
import { useThemeStore } from '../../store/themeStore';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { theme } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function WishlistScreen() {
  const { mode } = useThemeStore();
  const colors = theme.colors[mode];
  
  const user = useAuthStore(state => state.profile);
  const activeStore = useStoreStore(state => state.activeStore);
  
  const allWishlistItems = useWishlistStore(state => state.items);
  const allCustomNotes = useWishlistStore(state => state.customNotes);
  const toggleWishlist = useWishlistStore(state => state.toggleWishlist);
  const addCustomNote = useWishlistStore(state => state.addCustomNote);
  const removeCustomNote = useWishlistStore(state => state.removeCustomNote);
  const toggleNoteCompletion = useWishlistStore(state => state.toggleNoteCompletion);
  const editCustomNote = useWishlistStore(state => state.editCustomNote);
  const addItem = useCartStore(state => state.addItem);

  // Modal State
  const [isModalVisible, setModalVisible] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const dbProducts = allWishlistItems
    .filter((item: any) => item.store_id === activeStore?.id)
    .map(item => ({ ...item, type: 'product' }));

  const storeNotes = activeStore?.id && allCustomNotes[activeStore.id] 
    ? allCustomNotes[activeStore.id].map(note => ({ ...note, type: 'note' }))
    : [];

  const combinedList = [...storeNotes, ...dbProducts];

  const handleOpenAddModal = () => {
    if (!activeStore?.id) return Alert.alert("Error", "Please select a store first.");
    setNoteText('');
    setEditingNoteId(null);
    setModalVisible(true);
  };

  const handleOpenEditModal = (id: string, currentText: string) => {
    setNoteText(currentText);
    setEditingNoteId(id);
    setModalVisible(true);
  };

  const handleSubmitNote = () => {
    if (!activeStore?.id) return;
    if (!noteText.trim()) return;

    if (editingNoteId) {
      editCustomNote(activeStore.id, editingNoteId, noteText.trim());
    } else {
      addCustomNote(activeStore.id, noteText.trim());
    }
    
    setNoteText('');
    setEditingNoteId(null);
    setModalVisible(false);
  };

  const renderItem = ({ item }: { item: any }) => {
    
    // UI FOR CUSTOM TEXT NOTES (To-Do List Style)
    if (item.type === 'note') {
      return (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.primary, borderStyle: 'dashed', opacity: item.isCompleted ? 0.6 : 1 }]}>
          <TouchableOpacity onPress={() => toggleNoteCompletion(activeStore!.id, item.id)} style={{ marginRight: 12 }}>
            <Ionicons name={item.isCompleted ? "checkmark-circle" : "ellipse-outline"} size={28} color={colors.primary} />
          </TouchableOpacity>
          
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.textPrimary, textDecorationLine: item.isCompleted ? 'line-through' : 'none' }]}>
              {item.text}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => handleOpenEditModal(item.id, item.text)}>
              <Ionicons name="create-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => removeCustomNote(activeStore!.id, item.id)}>
              <Ionicons name="trash-outline" size={24} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // UI FOR DATABASE PRODUCTS
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.textPrimary }]}>{item.name}</Text>
          <Text style={{ color: colors.primary, fontWeight: 'bold', marginTop: 4 }}>₹{item.price}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>In Stock: {item.stock_qty}</Text>
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <TouchableOpacity onPress={() => toggleWishlist(item, user?.id)}>
            <Ionicons name="heart" size={28} color="#ef4444" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => addItem(item, user?.id, activeStore?.id)}
          >
            <Ionicons name="cart" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>My Wishlist</Text>
          <Text style={{ color: colors.textSecondary }}>
            {activeStore ? `Browsing ${activeStore.name}` : 'No Store Selected'}
          </Text>
        </View>

        <TouchableOpacity 
          style={[styles.plusBtn, { backgroundColor: colors.primary }]} 
          onPress={handleOpenAddModal}
        >
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {combinedList.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="list-outline" size={64} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, marginTop: 16 }}>
            Your list for this store is empty.
          </Text>
        </View>
      ) : (
        <FlatList
          data={combinedList}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Reusable Note Input Modal (Add / Edit) */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {editingNoteId ? 'Edit Custom Note' : 'Add Custom Note'}
            </Text>
            
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="e.g. Buy 2 liters of milk"
              placeholderTextColor={colors.textSecondary}
              value={noteText}
              onChangeText={setNoteText}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: colors.background }]} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: colors.primary }]} 
                onPress={handleSubmitNote}
              >
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{editingNoteId ? 'Save Changes' : 'Add to List'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 32, fontWeight: 'bold' },
  plusBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12, elevation: 1 },
  name: { fontSize: 18, fontWeight: 'bold' },
  addBtn: { padding: 10, borderRadius: 8 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', padding: 24, borderRadius: 16, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 8, padding: 16, fontSize: 16, marginBottom: 24 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  modalBtn: { flex: 1, padding: 16, borderRadius: 8, alignItems: 'center' }
});