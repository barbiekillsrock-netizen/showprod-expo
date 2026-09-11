import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, ScrollView,
} from 'react-native';
import { useSongs, songsStore, normalizeKey, isValidKey, type Song } from '../data/songs';
import { colors, spacing, radius } from '../lib/theme';

function SongEditor({ song, onBack }: { song: Song | null; onBack: () => void }) {
  const isNew = song === null;
  const [title, setTitle] = useState(song?.title ?? '');
  const [artist, setArtist] = useState(song?.artist ?? '');
  const [key, setKey] = useState(song?.key ?? '');
  const [keyError, setKeyError] = useState(false);
  const [bpm, setBpm] = useState(song?.bpm ? String(song.bpm) : '');
  const [lyrics, setLyrics] = useState(song?.lyrics ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const canSave = title.trim().length > 0 && !keyError;

  async function handleSave() {
    if (!canSave || saving) return;
    setSaving(true);
    const data = {
      title: title.trim(),
      artist: artist.trim(),
      key: key.trim() ? normalizeKey(key) : '',
      bpm: bpm.trim() ? Number(bpm) : undefined,
      lyrics: lyrics.trim() || undefined,
    };
    if (isNew) {
      await songsStore.add(data);
    } else {
      await songsStore.update(song!.id, data);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    if (isNew) onBack();
  }

  return (
    <View style={edStyles.container}>
      <View style={edStyles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={edStyles.back}>← Voltar</Text>
        </TouchableOpacity>
        <View style={edStyles.headerMeta}>
          <TextInput
            style={edStyles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Título da música..."
            placeholderTextColor={colors.mutedForeground}
          />
          <TextInput
            style={edStyles.artistInput}
            value={artist}
            onChangeText={setArtist}
            placeholder="Artista"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>
        <View style={edStyles.headerRight}>
          <TextInput
            style={[edStyles.keyInput, keyError && { borderColor: colors.destructive }]}
            value={key}
            onChangeText={v => { setKey(v); setKeyError(false); }}
            onBlur={() => {
              if (key.trim() && !isValidKey(key)) setKeyError(true);
              else if (key.trim()) setKey(normalizeKey(key));
            }}
            placeholder="Tom"
            maxLength={4}
            autoCapitalize="characters"
          />
          <TouchableOpacity
            style={[edStyles.saveBtn, saved && { backgroundColor: '#22c55e' }]}
            onPress={handleSave}
            disabled={!canSave || saving}
          >
            <Text style={edStyles.saveBtnText}>{saved ? '✓' : 'Salvar'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TextInput
        style={edStyles.textarea}
        value={lyrics}
        onChangeText={setLyrics}
        placeholder={'[G]           [D]\nWish you were here\n[Em]          [C]\nWe\'re just two lost souls...'}
        placeholderTextColor={colors.mutedForeground}
        multiline
        textAlignVertical="top"
        scrollEnabled
        spellCheck={false}
      />

      <View style={edStyles.footer}>
        <Text style={edStyles.footerText}>
          {lyrics.split('\n').length} linhas · {lyrics.length} caracteres
        </Text>
        <Text style={edStyles.footerHint}>Suporta cifras [G], letras e anotações</Text>
      </View>
    </View>
  );
}

export default function EditorScreen() {
  const songs = useSongs();
  const [editing, setEditing] = useState<Song | 'new' | null>(null);
  const textSongs = songs.filter(s => s.lyrics);

  if (editing === 'new') {
    return <SongEditor song={null} onBack={() => setEditing(null)} />;
  }
  if (editing) {
    return <SongEditor song={editing} onBack={() => setEditing(null)} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Editor</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setEditing('new')}>
          <Text style={styles.addBtnText}>+ Nova</Text>
        </TouchableOpacity>
      </View>
      {textSongs.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nenhuma música ainda</Text>
          <Text style={styles.emptyText}>Escreva letras, cifras e anotações diretamente no app.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => setEditing('new')}>
            <Text style={styles.emptyBtnText}>Escrever primeira música</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={textSongs}
          keyExtractor={s => s.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => setEditing(item)}>
              <View style={{ flex: 1 }}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  {item.key && <View style={styles.keyBadge}><Text style={styles.keyBadgeText}>{item.key}</Text></View>}
                </View>
                <Text style={styles.cardArtist}>{item.artist}</Text>
                <Text style={styles.cardPreview} numberOfLines={2}>{item.lyrics}</Text>
              </View>
              <Text style={styles.cardLines}>{item.lyrics?.split('\n').length} linhas</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 24, fontWeight: '300', color: colors.foreground },
  addBtn: { backgroundColor: colors.foreground, paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.md },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  list: { padding: spacing.md, gap: spacing.sm },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, flexDirection: 'row', alignItems: 'flex-start' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: colors.foreground },
  keyBadge: { backgroundColor: colors.foreground, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  keyBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  cardArtist: { fontSize: 13, color: colors.mutedForeground },
  cardPreview: { fontSize: 11, color: colors.mutedForeground, marginTop: 4, fontFamily: 'monospace' },
  cardLines: { fontSize: 11, color: colors.mutedForeground },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.foreground, marginBottom: 8 },
  emptyText: { fontSize: 14, color: colors.mutedForeground, textAlign: 'center', marginBottom: spacing.lg },
  emptyBtn: { backgroundColor: colors.foreground, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.lg },
  emptyBtnText: { color: '#fff', fontWeight: '700' },
});

const edStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { fontSize: 14, color: colors.mutedForeground, padding: 8 },
  headerMeta: { flex: 1 },
  titleInput: { fontSize: 16, fontWeight: '600', color: colors.foreground },
  artistInput: { fontSize: 13, color: colors.mutedForeground },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  keyInput: { width: 56, height: 36, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 8, fontSize: 13, fontWeight: '700', color: colors.foreground, textAlign: 'center' },
  saveBtn: { backgroundColor: colors.foreground, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  textarea: { flex: 1, padding: spacing.md, fontSize: 14, color: colors.foreground, fontFamily: 'monospace', lineHeight: 24 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  footerText: { fontSize: 11, color: colors.mutedForeground },
  footerHint: { fontSize: 11, color: colors.mutedForeground },
});
