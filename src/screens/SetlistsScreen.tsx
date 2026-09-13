import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Platform, StatusBar as RNStatusBar, FlatList, TouchableOpacity,
  TextInput, Alert, Modal, ScrollView,
} from 'react-native';
import { useSetlists, setlistsStore, type Setlist } from '../data/setlists';
import { useSongs, type Song } from '../data/songs';
import { colors, spacing, radius } from '../lib/theme';
import { useNavigation } from '@react-navigation/native';

export default function SetlistsScreen() {
  const setlists = useSetlists();
  const songs = useSongs();
  const navigation = useNavigation<any>();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const newNameRef = React.useRef('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSongs, setEditingSongs] = useState(false);
  const [currentSetlist, setCurrentSetlist] = useState<Setlist | null>(null);

  async function handleCreate() {
    const name = newNameRef.current.trim() || newName.trim();
    if (!name) {
      Alert.alert('Nome obrigatório', 'Digite um nome para o setlist.');
      return;
    }
    await setlistsStore.create(name);
    setNewName('');
    newNameRef.current = '';
    setCreating(false);
  }

  function getSongName(id: string) {
    return songs.find(s => s.id === id)?.title ?? 'Música removida';
  }

  function startShow(setlist: Setlist) {
    if (setlist.songIds.length === 0) {
      Alert.alert('Setlist vazio', 'Adicione músicas antes de iniciar o show.');
      return;
    }
    const setlistSongs = setlist.songIds.map(id => songs.find(s => s.id === id)).filter(Boolean) as Song[];
    navigation.navigate('Performance', { songs: setlistSongs, setlistName: setlist.name });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Setlists</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setCreating(true)}>
          <Text style={styles.addBtnText}>+ Novo</Text>
        </TouchableOpacity>
      </View>

      {/* Create form */}
      {creating && (
        <View style={styles.createForm}>
          <TextInput
            style={styles.createInput}
            value={newName}
            onChangeText={v => { setNewName(v); newNameRef.current = v; }}
            placeholder="Nome do setlist..."
            placeholderTextColor={colors.mutedForeground}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCreate}
          />
          <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
            <Text style={styles.createBtnText}>Criar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setCreating(false)}>
            <Text style={styles.cancelBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={setlists}
        keyExtractor={s => s.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nenhum setlist</Text>
            <Text style={styles.emptyText}>Crie um setlist para organizar seu show.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardMeta}>{item.songIds.length} músicas</Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => { setCurrentSetlist(item); setEditingSongs(true); }}
                >
                  <Text style={styles.editBtnText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.showBtn}
                  onPress={() => startShow(item)}
                >
                  <Text style={styles.showBtnText}>▶ Show</Text>
                </TouchableOpacity>
              </View>
            </View>
            {item.songIds.slice(0, 3).map((id, i) => (
              <Text key={id} style={styles.songPreview}>
                {i + 1}. {getSongName(id)}
              </Text>
            ))}
            {item.songIds.length > 3 && (
              <Text style={styles.moreSongs}>+{item.songIds.length - 3} mais...</Text>
            )}
            <TouchableOpacity
              onPress={() => Alert.alert('Excluir', `Excluir "${item.name}"?`, [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Excluir', style: 'destructive', onPress: () => setlistsStore.remove(item.id) },
              ])}
            >
              <Text style={styles.deleteText}>Excluir setlist</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Edit Songs Modal */}
      <SetlistEditorModal
        visible={editingSongs}
        setlist={currentSetlist}
        songs={songs}
        onClose={() => { setEditingSongs(false); setCurrentSetlist(null); }}
      />
    </View>
  );
}

function SetlistEditorModal({
  visible, setlist, songs, onClose,
}: {
  visible: boolean;
  setlist: Setlist | null;
  songs: Song[];
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(setlist?.songIds ?? []);
  const [search, setSearch] = useState('');

  React.useEffect(() => {
    setSelected(setlist?.songIds ?? []);
  }, [setlist]);

  const filtered = songs.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.artist.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSave() {
    if (setlist) {
      await setlistsStore.setSongs(setlist.id, selected);
    }
    onClose();
  }

  function toggle(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const next = [...selected];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    setSelected(next);
  }

  function moveDown(index: number) {
    if (index === selected.length - 1) return;
    const next = [...selected];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    setSelected(next);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={editorStyles.container}>
        <View style={editorStyles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={editorStyles.cancel}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={editorStyles.title}>{setlist?.name}</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={editorStyles.save}>Salvar</Text>
          </TouchableOpacity>
        </View>

        {/* Roteiro atual */}
        {selected.length > 0 && (
          <View style={editorStyles.section}>
            <Text style={editorStyles.sectionTitle}>ROTEIRO DO SHOW</Text>
            {selected.map((id, i) => {
              const song = songs.find(s => s.id === id);
              return (
                <View key={id} style={editorStyles.setlistItem}>
                  <Text style={editorStyles.setlistNum}>{i + 1}</Text>
                  <Text style={editorStyles.setlistTitle} numberOfLines={1}>
                    {song?.title ?? 'Música removida'}
                  </Text>
                  <View style={editorStyles.setlistActions}>
                    <TouchableOpacity onPress={() => moveUp(i)} style={editorStyles.arrowBtn}>
                      <Text style={editorStyles.arrowText}>↑</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => moveDown(i)} style={editorStyles.arrowBtn}>
                      <Text style={editorStyles.arrowText}>↓</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => toggle(id)} style={editorStyles.removeBtn}>
                      <Text style={editorStyles.removeText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Repertório */}
        <View style={editorStyles.section}>
          <Text style={editorStyles.sectionTitle}>MEU REPERTÓRIO</Text>
          <TextInput
            style={editorStyles.search}
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar..."
            placeholderTextColor={colors.mutedForeground}
          />
          <ScrollView style={{ maxHeight: 300 }}>
            {filtered.map(song => (
              <TouchableOpacity
                key={song.id}
                style={[editorStyles.songItem, selected.includes(song.id) && editorStyles.songItemSelected]}
                onPress={() => toggle(song.id)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={editorStyles.songTitle}>{song.title}</Text>
                  <Text style={editorStyles.songArtist}>{song.artist}</Text>
                </View>
                {selected.includes(song.id) && <Text style={editorStyles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight ?? 24 : 0 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontSize: 24, fontWeight: '300', color: colors.foreground },
  addBtn: { backgroundColor: colors.foreground, paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.md },
  addBtnText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  createForm: { flexDirection: 'row', padding: spacing.md, gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  createInput: { flex: 1, height: 44, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, fontSize: 16, color: colors.foreground },
  createBtn: { backgroundColor: colors.foreground, paddingHorizontal: spacing.md, borderRadius: radius.md, justifyContent: 'center' },
  createBtnText: { color: colors.white, fontWeight: '700' },
  cancelBtn: { justifyContent: 'center', padding: 8 },
  cancelBtnText: { color: colors.mutedForeground, fontSize: 16 },
  list: { padding: spacing.md, gap: spacing.md },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.foreground },
  cardMeta: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: spacing.sm },
  editBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  editBtnText: { fontSize: 13, color: colors.foreground },
  showBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.sm, backgroundColor: colors.foreground },
  showBtnText: { fontSize: 13, color: colors.white, fontWeight: '700' },
  songPreview: { fontSize: 13, color: colors.mutedForeground, paddingVertical: 2 },
  moreSongs: { fontSize: 12, color: colors.mutedForeground, marginTop: 4 },
  deleteText: { fontSize: 12, color: colors.destructive, marginTop: spacing.sm },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.foreground, marginBottom: 8 },
  emptyText: { fontSize: 14, color: colors.mutedForeground, textAlign: 'center' },
});

const editorStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight ?? 24 : 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 16, fontWeight: '600', color: colors.foreground },
  cancel: { fontSize: 16, color: colors.mutedForeground },
  save: { fontSize: 16, fontWeight: '700', color: colors.primary },
  section: { padding: spacing.md },
  sectionTitle: { fontSize: 11, fontWeight: '600', color: colors.mutedForeground, letterSpacing: 1, marginBottom: spacing.sm },
  setlistItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.xs, borderWidth: 1, borderColor: colors.border },
  setlistNum: { fontSize: 14, fontWeight: '700', color: colors.mutedForeground, width: 24 },
  setlistTitle: { flex: 1, fontSize: 14, color: colors.foreground },
  setlistActions: { flexDirection: 'row', gap: 4 },
  arrowBtn: { padding: 8 },
  arrowText: { fontSize: 16, color: colors.foreground },
  removeBtn: { padding: 8 },
  removeText: { fontSize: 14, color: colors.destructive },
  search: { height: 40, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, fontSize: 14, color: colors.foreground, marginBottom: spacing.sm },
  songItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, marginBottom: 4, backgroundColor: colors.card },
  songItemSelected: { borderColor: colors.foreground, backgroundColor: colors.muted },
  songTitle: { fontSize: 14, fontWeight: '500', color: colors.foreground },
  songArtist: { fontSize: 12, color: colors.mutedForeground },
  checkmark: { fontSize: 16, color: colors.foreground, fontWeight: '700' },
});
