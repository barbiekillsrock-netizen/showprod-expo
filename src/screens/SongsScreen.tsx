import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, Modal, ScrollView,
} from 'react-native';
import { useSongs, songsStore, GENRES, VALID_KEYS, normalizeKey, isValidKey, type Song } from '../data/songs';
import { colors, spacing, radius } from '../lib/theme';
import * as DocumentPicker from 'expo-document-picker';

// ── Add/Edit Song Modal ───────────────────────────────────────────────────
function SongModal({
  visible, onClose, editSong,
}: {
  visible: boolean;
  onClose: () => void;
  editSong?: Song | null;
}) {
  const [title, setTitle] = useState(editSong?.title ?? '');
  const [artist, setArtist] = useState(editSong?.artist ?? '');
  const [key, setKey] = useState(editSong?.key ?? '');
  const [keyError, setKeyError] = useState(false);
  const [bpm, setBpm] = useState(editSong?.bpm ? String(editSong.bpm) : '');
  const [genre, setGenre] = useState(editSong?.genre ?? '');
  const [lyrics, setLyrics] = useState(editSong?.lyrics ?? '');
  const [inputMode, setInputMode] = useState<'pdf' | 'text'>(editSong?.lyrics ? 'text' : 'pdf');
  const [pdfUri, setPdfUri] = useState(editSong?.pdfUri ?? '');
  const [pdfName, setPdfName] = useState(editSong?.pdfName ?? '');
  const [genreOpen, setGenreOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const canSave = title.trim() && artist.trim() && !keyError;

  async function pickPdf() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        setPdfUri(result.assets[0].uri);
        setPdfName(result.assets[0].name);
      }
    } catch {}
  }

  async function handleSave() {
    if (!canSave || saving) return;
    setSaving(true);
    const data = {
      title: title.trim(),
      artist: artist.trim(),
      key: key.trim() ? normalizeKey(key) : '',
      genre: genre || undefined,
      bpm: bpm.trim() ? Number(bpm) : undefined,
      lyrics: inputMode === 'text' ? lyrics.trim() || undefined : undefined,
      pdfUri: inputMode === 'pdf' && pdfUri ? pdfUri : undefined,
      pdfName: inputMode === 'pdf' && pdfName ? pdfName : undefined,
    };
    if (editSong) {
      await songsStore.update(editSong.id, data);
    } else {
      await songsStore.add(data);
    }
    setSaving(false);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelBtn}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{editSong ? 'Editar Música' : 'Nova Música'}</Text>
          <TouchableOpacity onPress={handleSave} disabled={!canSave || saving}>
            <Text style={[styles.saveBtn, (!canSave || saving) && { opacity: 0.4 }]}>
              {saving ? '...' : 'Salvar'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
          {/* Título */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Título</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Nome da música"
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="next"
            />
          </View>

          {/* Artista */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Artista</Text>
            <TextInput
              style={styles.input}
              value={artist}
              onChangeText={setArtist}
              placeholder="Nome do artista"
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="next"
            />
          </View>

          {/* Tom */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Tom <Text style={styles.optional}>(opcional)</Text></Text>
            <TextInput
              style={[styles.input, keyError && { borderColor: colors.destructive }]}
              value={key}
              onChangeText={v => { setKey(v); setKeyError(false); }}
              onBlur={() => {
                if (key.trim() && !isValidKey(key)) setKeyError(true);
                else if (key.trim()) setKey(normalizeKey(key));
              }}
              placeholder="Ex: Am, G, C#"
              placeholderTextColor={colors.mutedForeground}
              maxLength={4}
              autoCapitalize="characters"
            />
            {keyError && <Text style={styles.errorText}>Tom inválido. Ex: Am, C#, Bb</Text>}
          </View>

          {/* BPM */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>BPM <Text style={styles.optional}>(opcional)</Text></Text>
            <TextInput
              style={styles.input}
              value={bpm}
              onChangeText={setBpm}
              placeholder="Ex: 120"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
            />
          </View>

          {/* Estilo */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Estilo <Text style={styles.optional}>(opcional)</Text></Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setGenreOpen(!genreOpen)}
              activeOpacity={0.7}
            >
              <Text style={genre ? styles.inputText : styles.placeholder}>
                {genre || 'Selecione um estilo...'}
              </Text>
            </TouchableOpacity>
            {genreOpen && (
              <View style={styles.dropdown}>
                <TouchableOpacity style={styles.dropdownItem} onPress={() => { setGenre(''); setGenreOpen(false); }}>
                  <Text style={styles.dropdownItemText}>Nenhum</Text>
                </TouchableOpacity>
                {GENRES.map(g => (
                  <TouchableOpacity key={g} style={styles.dropdownItem} onPress={() => { setGenre(g); setGenreOpen(false); }}>
                    <Text style={[styles.dropdownItemText, genre === g && { color: colors.primary, fontWeight: '700' }]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Modo PDF / Texto */}
          <View style={styles.fieldGroup}>
            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[styles.modeBtn, inputMode === 'pdf' && styles.modeBtnActive]}
                onPress={() => setInputMode('pdf')}
              >
                <Text style={[styles.modeBtnText, inputMode === 'pdf' && styles.modeBtnTextActive]}>📄 PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, inputMode === 'text' && styles.modeBtnActive]}
                onPress={() => setInputMode('text')}
              >
                <Text style={[styles.modeBtnText, inputMode === 'text' && styles.modeBtnTextActive]}>✏️ Digitar</Text>
              </TouchableOpacity>
            </View>

            {inputMode === 'pdf' ? (
              <TouchableOpacity style={styles.pdfPicker} onPress={pickPdf}>
                {pdfUri ? (
                  <Text style={styles.pdfName}>{pdfName}</Text>
                ) : (
                  <Text style={styles.pdfPickerText}>Toque para selecionar PDF</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TextInput
                style={styles.textarea}
                value={lyrics}
                onChangeText={setLyrics}
                placeholder={'[G]  [D]\nDigite a letra ou cifra aqui...'}
                placeholderTextColor={colors.mutedForeground}
                multiline
                textAlignVertical="top"
              />
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Song Card ─────────────────────────────────────────────────────────────
function SongCard({ song, onEdit, onDelete }: { song: Song; onEdit: () => void; onDelete: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onEdit} activeOpacity={0.7}>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>{song.title}</Text>
        <Text style={styles.cardArtist} numberOfLines={1}>{song.artist}</Text>
        {song.genre && <Text style={styles.cardGenre}>{song.genre}</Text>}
      </View>
      <View style={styles.cardRight}>
        {song.key ? <View style={styles.keyBadge}><Text style={styles.keyBadgeText}>{song.key}</Text></View> : null}
        {song.bpm ? <Text style={styles.bpmText}>{song.bpm}</Text> : null}
        <TouchableOpacity onPress={() => Alert.alert('Excluir', `Excluir "${song.title}"?`, [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Excluir', style: 'destructive', onPress: onDelete },
        ])}>
          <Text style={styles.deleteBtn}>✕</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ── Songs Screen ──────────────────────────────────────────────────────────
export default function SongsScreen() {
  const songs = useSongs();
  const [showModal, setShowModal] = useState(false);
  const [editSong, setEditSong] = useState<Song | null>(null);
  const [search, setSearch] = useState('');

  const filtered = songs.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.artist.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}><Text style={styles.headerLight}>Show</Text><Text style={styles.headerBold}>Prod</Text></Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => { setEditSong(null); setShowModal(true); }}>
          <Text style={styles.addBtnText}>+ Nova</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar músicas..."
          placeholderTextColor={colors.mutedForeground}
          clearButtonMode="while-editing"
        />
      </View>

      {/* List */}
      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nenhuma música</Text>
          <Text style={styles.emptyText}>Toque em "+ Nova" para adicionar sua primeira música.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={s => s.id}
          renderItem={({ item }) => (
            <SongCard
              song={item}
              onEdit={() => { setEditSong(item); setShowModal(true); }}
              onDelete={() => songsStore.remove(item.id)}
            />
          )}
          contentContainerStyle={styles.list}
        />
      )}

      <SongModal
        visible={showModal}
        onClose={() => { setShowModal(false); setEditSong(null); }}
        editSong={editSong}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 24 },
  headerLight: { fontWeight: '300', color: colors.foreground },
  headerBold: { fontWeight: '900', color: colors.foreground },
  addBtn: {
    backgroundColor: colors.foreground, paddingHorizontal: 16,
    paddingVertical: 8, borderRadius: radius.md,
  },
  addBtnText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  searchContainer: { padding: spacing.md, paddingBottom: spacing.sm },
  searchInput: {
    height: 44, backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md,
    fontSize: 16, color: colors.foreground,
  },
  list: { padding: spacing.md, gap: spacing.sm },
  card: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.md,
  },
  cardContent: { flex: 1, marginRight: spacing.sm },
  cardTitle: { fontSize: 15, fontWeight: '600', color: colors.foreground },
  cardArtist: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
  cardGenre: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  keyBadge: {
    backgroundColor: colors.foreground, paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 6,
  },
  keyBadgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  bpmText: { fontSize: 11, color: colors.mutedForeground },
  deleteBtn: { fontSize: 16, color: colors.mutedForeground, padding: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.foreground, marginBottom: 8 },
  emptyText: { fontSize: 14, color: colors.mutedForeground, textAlign: 'center' },

  // Modal
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: colors.foreground },
  cancelBtn: { fontSize: 16, color: colors.mutedForeground },
  saveBtn: { fontSize: 16, fontWeight: '700', color: colors.primary },
  modalScroll: { flex: 1 },
  fieldGroup: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: colors.foreground, marginBottom: 8 },
  optional: { fontWeight: '400', color: colors.mutedForeground },
  input: {
    height: 52, backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md,
    fontSize: 16, color: colors.foreground, justifyContent: 'center',
  },
  inputText: { fontSize: 16, color: colors.foreground },
  placeholder: { fontSize: 16, color: colors.mutedForeground },
  errorText: { fontSize: 12, color: colors.destructive, marginTop: 4 },
  dropdown: {
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, marginTop: 4,
    maxHeight: 200, overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: spacing.md, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  dropdownItemText: { fontSize: 15, color: colors.foreground },
  modeToggle: {
    flexDirection: 'row', backgroundColor: colors.muted,
    borderRadius: radius.md, padding: 4, marginBottom: spacing.sm,
  },
  modeBtn: { flex: 1, paddingVertical: 8, borderRadius: radius.sm, alignItems: 'center' },
  modeBtnActive: { backgroundColor: colors.white },
  modeBtnText: { fontSize: 14, color: colors.mutedForeground, fontWeight: '500' },
  modeBtnTextActive: { color: colors.foreground, fontWeight: '700' },
  pdfPicker: {
    height: 80, backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  pdfPickerText: { fontSize: 14, color: colors.mutedForeground },
  pdfName: { fontSize: 14, color: colors.foreground, fontWeight: '500' },
  textarea: {
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md,
    fontSize: 14, color: colors.foreground, minHeight: 200,
    fontFamily: 'monospace',
  },
});
