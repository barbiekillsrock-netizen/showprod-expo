import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, Modal, ScrollView, SafeAreaView,
} from 'react-native';
import { useSongs, songsStore, GENRES, normalizeKey, isValidKey, type Song } from '../data/songs';
import { colors, spacing, radius, font } from '../lib/theme';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';

function SongModal({ visible, onClose, editSong }: { visible: boolean; onClose: () => void; editSong?: Song | null }) {
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
  const navigation = useNavigation<any>();

  React.useEffect(() => {
    setTitle(editSong?.title ?? '');
    setArtist(editSong?.artist ?? '');
    setKey(editSong?.key ?? '');
    setBpm(editSong?.bpm ? String(editSong.bpm) : '');
    setGenre(editSong?.genre ?? '');
    setLyrics(editSong?.lyrics ?? '');
    setInputMode(editSong?.lyrics ? 'text' : 'pdf');
    setPdfUri(editSong?.pdfUri ?? '');
    setPdfName(editSong?.pdfName ?? '');
    setKeyError(false);
    setGenreOpen(false);
  }, [editSong, visible]);

  const canSave = title.trim() && artist.trim() && !keyError;

  async function pickPdf() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
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
      title: title.trim(), artist: artist.trim(),
      key: key.trim() ? normalizeKey(key) : '',
      genre: genre || undefined,
      bpm: bpm.trim() ? Number(bpm) : undefined,
      lyrics: inputMode === 'text' ? lyrics.trim() || undefined : undefined,
      pdfUri: inputMode === 'pdf' && pdfUri ? pdfUri : undefined,
      pdfName: inputMode === 'pdf' && pdfName ? pdfName : undefined,
    };
    if (editSong) await songsStore.update(editSong.id, data);
    else await songsStore.add(data);
    setSaving(false);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={m.container}>
        <View style={m.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={m.cancel}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={m.title}>{editSong ? 'Editar Música' : 'Nova Música'}</Text>
          <TouchableOpacity onPress={handleSave} disabled={!canSave || saving}>
            <Text style={[m.save, (!canSave || saving) && m.disabled]}>{saving ? '...' : 'Salvar'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={m.scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={m.field}>
            <Text style={m.label}>Título</Text>
            <TextInput style={m.input} value={title} onChangeText={setTitle} placeholderTextColor={colors.mutedForeground} returnKeyType="next" />
          </View>
          <View style={m.field}>
            <Text style={m.label}>Artista</Text>
            <TextInput style={m.input} value={artist} onChangeText={setArtist} placeholderTextColor={colors.mutedForeground} returnKeyType="next" />
          </View>
          <View style={m.fieldRow}>
            <View style={{ flex: 1 }}>
              <Text style={m.label}>Tom <Text style={m.optional}>(opcional)</Text></Text>
              <TextInput
                style={[m.input, keyError && m.inputError]}
                value={key}
                onChangeText={v => { setKey(v); setKeyError(false); }}
                onBlur={() => { if (key.trim() && !isValidKey(key)) setKeyError(true); else if (key.trim()) setKey(normalizeKey(key)); }}
                maxLength={4} autoCapitalize="characters"
                placeholderTextColor={colors.mutedForeground}
              />
              {keyError && <Text style={m.errorText}>Tom inválido</Text>}
            </View>
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={m.label}>BPM <Text style={m.optional}>(opcional)</Text></Text>
              <TextInput style={m.input} value={bpm} onChangeText={setBpm} keyboardType="number-pad" placeholderTextColor={colors.mutedForeground} />
            </View>
          </View>

          <View style={m.field}>
            <Text style={m.label}>Estilo <Text style={m.optional}>(opcional)</Text></Text>
            <TouchableOpacity style={[m.input, m.picker]} onPress={() => setGenreOpen(!genreOpen)}>
              <Text style={genre ? m.pickerText : m.pickerPlaceholder}>{genre || 'Selecione...'}</Text>
              <Text style={m.chevron}>{genreOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {genreOpen && (
              <View style={m.dropdown}>
                <TouchableOpacity style={m.dropItem} onPress={() => { setGenre(''); setGenreOpen(false); }}>
                  <Text style={m.dropText}>Nenhum</Text>
                </TouchableOpacity>
                {GENRES.map(g => (
                  <TouchableOpacity key={g} style={m.dropItem} onPress={() => { setGenre(g); setGenreOpen(false); }}>
                    <Text style={[m.dropText, genre === g && m.dropTextActive]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={m.field}>
            <View style={m.modeRow}>
              <TouchableOpacity style={[m.modeBtn, inputMode === 'pdf' && m.modeBtnActive]} onPress={() => setInputMode('pdf')}>
                <Text style={[m.modeBtnText, inputMode === 'pdf' && m.modeBtnTextActive]}>📄 PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[m.modeBtn, inputMode === 'text' && m.modeBtnActive]} onPress={() => setInputMode('text')}>
                <Text style={[m.modeBtnText, inputMode === 'text' && m.modeBtnTextActive]}>✏️ Digitar</Text>
              </TouchableOpacity>
            </View>
            {inputMode === 'pdf' ? (
              <TouchableOpacity style={m.pdfArea} onPress={pickPdf}>
                {pdfUri ? <Text style={m.pdfName}>{pdfName}</Text> : <Text style={m.pdfPlaceholder}>Toque para selecionar PDF</Text>}
              </TouchableOpacity>
            ) : (
              <TextInput style={m.textarea} value={lyrics} onChangeText={setLyrics} multiline textAlignVertical="top" placeholderTextColor={colors.mutedForeground} />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function SongCard({ song, onEdit, onDelete, onAnnotate }: {
  song: Song; onEdit: () => void; onDelete: () => void; onAnnotate: () => void;
}) {
  return (
    <View style={s.card}>
      <TouchableOpacity style={s.cardMain} onPress={onEdit} activeOpacity={0.7}>
        <View style={s.cardBody}>
          <Text style={s.cardTitle} numberOfLines={1}>{song.title}</Text>
          <Text style={s.cardArtist} numberOfLines={1}>{song.artist}</Text>
          {song.genre ? <Text style={s.cardGenre}>{song.genre}</Text> : null}
        </View>
        <View style={s.cardRight}>
          {song.key ? <View style={s.badge}><Text style={s.badgeText}>{song.key}</Text></View> : null}
          {song.bpm ? <Text style={s.bpm}>{song.bpm}</Text> : null}
        </View>
      </TouchableOpacity>
      <View style={s.cardActions}>
        {song.hasPdf && (
          <TouchableOpacity style={s.annotateBtn} onPress={onAnnotate} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.annotateText}>✏️ PDF</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => Alert.alert('Excluir', `Excluir "${song.title}"?`, [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Excluir', style: 'destructive', onPress: onDelete },
        ])} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={s.del}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function SongsScreen() {
  const navigation = useNavigation<any>();
  const songs = useSongs();
  const [showModal, setShowModal] = useState(false);
  const [editSong, setEditSong] = useState<Song | null>(null);
  const [search, setSearch] = useState('');

  const filtered = songs.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.artist.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.logo}><Text style={s.logoLight}>Show</Text><Text style={s.logoBold}>Prod</Text></Text>
        <TouchableOpacity style={s.addBtn} onPress={() => { setEditSong(null); setShowModal(true); }}>
          <Text style={s.addBtnText}>+ Nova música</Text>
        </TouchableOpacity>
      </View>

      <View style={s.searchWrap}>
        <TextInput style={s.search} value={search} onChangeText={setSearch}
          placeholder="Buscar músicas..." placeholderTextColor={colors.mutedForeground} clearButtonMode="while-editing" />
      </View>

      {filtered.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>{search ? 'Nenhum resultado' : 'Nenhuma música'}</Text>
          <Text style={s.emptyText}>{search ? 'Tente outra busca.' : 'Toque em "+ Nova música" para começar.'}</Text>
        </View>
      ) : (
        <FlatList data={filtered} keyExtractor={s => s.id} contentContainerStyle={s.list}
          renderItem={({ item }) => (
            <SongCard
              song={item}
              onEdit={() => { setEditSong(item); setShowModal(true); }}
              onDelete={() => songsStore.remove(item.id)}
              onAnnotate={() => navigation.navigate('PdfAnnotator', {
                songId: item.id,
                pdfUri: item.pdfUri,
                songTitle: item.title,
              })}
            />
          )} />
      )}

      <SongModal visible={showModal} onClose={() => { setShowModal(false); setEditSong(null); }} editSong={editSong} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  logo: { fontSize: 22 },
  logoLight: { fontWeight: font.light, color: colors.foreground },
  logoBold: { fontWeight: font.black, color: colors.foreground },
  addBtn: { backgroundColor: colors.foreground, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.md },
  addBtnText: { color: colors.white, fontWeight: font.bold, fontSize: 13 },
  searchWrap: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  search: { height: 44, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, fontSize: 15, color: colors.foreground },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.sm },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center' },
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 12 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingRight: spacing.md },
  annotateBtn: { backgroundColor: colors.muted, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  annotateText: { fontSize: 12, fontWeight: font.medium, color: colors.foreground },
  cardBody: { flex: 1, marginRight: spacing.sm },
  cardTitle: { fontSize: 15, fontWeight: font.semibold, color: colors.foreground },
  cardArtist: { fontSize: 13, color: colors.mutedForeground, marginTop: 1 },
  cardGenre: { fontSize: 11, color: colors.mutedForeground, marginTop: 1 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: { backgroundColor: colors.foreground, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: font.bold },
  bpm: { fontSize: 11, color: colors.mutedForeground },
  del: { fontSize: 15, color: colors.mutedForeground, padding: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyTitle: { fontSize: 17, fontWeight: font.semibold, color: colors.foreground, marginBottom: 8 },
  emptyText: { fontSize: 14, color: colors.mutedForeground, textAlign: 'center' },
});

const m = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 16, fontWeight: font.semibold, color: colors.foreground },
  cancel: { fontSize: 15, color: colors.mutedForeground },
  save: { fontSize: 15, fontWeight: font.bold, color: colors.foreground },
  disabled: { opacity: 0.4 },
  scroll: { flex: 1 },
  field: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  fieldRow: { flexDirection: 'row', paddingHorizontal: spacing.md, paddingTop: spacing.md },
  label: { fontSize: 13, fontWeight: font.semibold, color: colors.foreground, marginBottom: 6 },
  optional: { fontWeight: font.regular, color: colors.mutedForeground },
  input: { height: 50, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, fontSize: 15, color: colors.foreground },
  inputError: { borderColor: colors.destructive },
  errorText: { fontSize: 12, color: colors.destructive, marginTop: 4 },
  picker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerText: { fontSize: 15, color: colors.foreground },
  pickerPlaceholder: { fontSize: 15, color: colors.mutedForeground },
  chevron: { fontSize: 11, color: colors.mutedForeground },
  dropdown: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginTop: 4, maxHeight: 320, overflow: 'hidden' },
  dropItem: { paddingHorizontal: spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  dropText: { fontSize: 14, color: colors.foreground },
  dropTextActive: { fontWeight: font.bold, color: colors.primary },
  modeRow: { flexDirection: 'row', backgroundColor: colors.muted, borderRadius: radius.md, padding: 4, marginBottom: spacing.sm },
  modeBtn: { flex: 1, paddingVertical: 8, borderRadius: radius.sm, alignItems: 'center' },
  modeBtnActive: { backgroundColor: colors.white },
  modeBtnText: { fontSize: 13, color: colors.mutedForeground, fontWeight: font.medium },
  modeBtnTextActive: { color: colors.foreground, fontWeight: font.bold },
  pdfArea: { height: 80, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  pdfName: { fontSize: 13, color: colors.foreground, fontWeight: font.medium },
  pdfPlaceholder: { fontSize: 13, color: colors.mutedForeground },
  textarea: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, fontSize: 13, color: colors.foreground, minHeight: 200, fontFamily: 'monospace' },
  annotateBtn: { backgroundColor: colors.foreground, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center', marginTop: spacing.sm },
  annotateBtnText: { color: colors.white, fontWeight: font.bold, fontSize: 14 },
});
