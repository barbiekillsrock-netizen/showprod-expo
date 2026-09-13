import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  PanResponder, Dimensions, StatusBar, Alert,
} from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { colors, spacing, font } from '../lib/theme';
import type { Song } from '../data/songs';
import Pdf from 'react-native-pdf';

const { width: W } = Dimensions.get('window');
const SWIPE_THRESHOLD = 60;

export default function PerformanceScreen({ route, navigation }: any) {
  const { songs, setlistName } = route.params as { songs: Song[]; setlistName: string };

  // Manter tela ligada durante o show
  useKeepAwake();

  const [activeIdx, setActiveIdx] = useState(0);
  const [darkMode, setDarkMode] = useState(true);
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(3);
  const [fontSize, setFontSize] = useState(18);
  const [elapsed, setElapsed] = useState(0);
  const [timerRunning, setTimerRunning] = useState(true);
  const [showControls, setShowControls] = useState(true);

  const scrollRef = useRef<ScrollView>(null);
  const autoScrollRef = useRef<ReturnType<typeof setInterval>>();
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const scrollOffsetRef = useRef(0);

  const activeSong = songs[activeIdx];
  const hasLyrics = !!activeSong?.lyrics && !activeSong?.hasPdf;
  const hasPdf = !!activeSong?.pdfUri;

  // Timer
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  // Auto scroll
  useEffect(() => {
    if (!autoScroll || !hasLyrics) {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);
      return;
    }
    autoScrollRef.current = setInterval(() => {
      scrollOffsetRef.current += scrollSpeed * 0.4;
      scrollRef.current?.scrollTo({ y: scrollOffsetRef.current, animated: false });
    }, 16);
    return () => { if (autoScrollRef.current) clearInterval(autoScrollRef.current); };
  }, [autoScroll, scrollSpeed, hasLyrics]);

  // Reset ao trocar música
  useEffect(() => {
    setAutoScroll(false);
    scrollOffsetRef.current = 0;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [activeIdx]);

  function formatTime(s: number) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  function goPrev() {
    if (activeIdx > 0) setActiveIdx(i => i - 1);
  }

  function goNext() {
    if (activeIdx < songs.length - 1) setActiveIdx(i => i + 1);
  }

  // Swipe para trocar música
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderRelease: (_, g) => {
      if (g.dx < -SWIPE_THRESHOLD) goNext();
      else if (g.dx > SWIPE_THRESHOLD) goPrev();
    },
  });

  const bg = darkMode ? '#0C0B09' : '#FFFFFF';
  const textColor = darkMode ? '#E8E0D0' : '#111111';
  const controlBg = 'rgba(0,0,0,0.6)';

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar hidden />

      {/* Top bar */}
      <View style={styles.topBar}>
        {/* Esquerda: Sair + Timer */}
        <View style={styles.topLeft}>
          <TouchableOpacity
            style={[styles.pill, { backgroundColor: controlBg }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.pillText}>← Sair</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pill, { backgroundColor: controlBg }]}
            onPress={() => setTimerRunning(r => !r)}
          >
            <Text style={styles.pillText}>{formatTime(elapsed)}</Text>
          </TouchableOpacity>
        </View>

        {/* Centro: Música atual */}
        <View style={styles.topCenter}>
          {activeSong?.key && (
            <View style={styles.keyBadge}>
              <Text style={styles.keyBadgeText}>{activeSong.key}</Text>
            </View>
          )}
          <Text style={styles.songTitle} numberOfLines={1}>{activeSong?.title}</Text>
          <Text style={styles.songCount}>{activeIdx + 1}/{songs.length}</Text>
        </View>

        {/* Direita: Dark mode */}
        <View style={styles.topRight}>
          <TouchableOpacity
            style={[styles.pill, { backgroundColor: darkMode ? colors.amber : controlBg }]}
            onPress={() => setDarkMode(d => !d)}
          >
            <Text style={[styles.pillText, darkMode && { color: '#0C0B09' }]}>
              {darkMode ? '🌙' : '☀️'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Controls linha 2 */}
      {hasLyrics && (
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlBtn, autoScroll && styles.controlBtnActive]}
            onPress={() => setAutoScroll(a => !a)}
          >
            <Text style={[styles.controlText, autoScroll && styles.controlTextActive]}>
              {autoScroll ? '⏸ Parar' : '▶ Auto'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlBtn} onPress={() => setScrollSpeed(s => Math.max(1, s - 1))}>
            <Text style={styles.controlText}>↓</Text>
          </TouchableOpacity>
          <Text style={styles.speedText}>{scrollSpeed}</Text>
          <TouchableOpacity style={styles.controlBtn} onPress={() => setScrollSpeed(s => Math.min(10, s + 1))}>
            <Text style={styles.controlText}>↑</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlBtn} onPress={() => setFontSize(s => Math.max(12, s - 2))}>
            <Text style={styles.controlText}>A-</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlBtn} onPress={() => setFontSize(s => Math.min(40, s + 2))}>
            <Text style={styles.controlText}>A+</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Stage */}
      <View style={styles.stage} {...(hasLyrics ? {} : panResponder.panHandlers)}>
        {hasLyrics ? (
          <ScrollView
            ref={scrollRef}
            style={[styles.lyricsScroll, { backgroundColor: bg }]}
            onScrollBeginDrag={() => autoScroll && setAutoScroll(false)}
            onScroll={e => { scrollOffsetRef.current = e.nativeEvent.contentOffset.y; }}
            scrollEventThrottle={16}
            {...panResponder.panHandlers}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => setAutoScroll(a => !a)}>
              <Text style={[styles.lyricsText, { fontSize, color: textColor, lineHeight: fontSize * 1.6 }]}>
                {activeSong?.lyrics}
              </Text>
              <View style={{ height: 400 }} />
            </TouchableOpacity>
          </ScrollView>
        ) : hasPdf ? (
          <View style={{ flex: 1 }}>
            <Pdf
              source={{ uri: activeSong.pdfUri, cache: true }}
              style={styles.pdf}
              fitPolicy={0}
              horizontal
              enablePaging
              renderActivityIndicator={() => (
                <View style={styles.pdfLoading}>
                  <Text style={{ color: '#fff' }}>Carregando PDF...</Text>
                </View>
              )}
              onError={() => Alert.alert('Erro', 'Não foi possível carregar o PDF.')}
            />
            {darkMode && (
              <View
                style={styles.pdfDarkOverlay}
                pointerEvents="none"
              />
            )}
          </View>
        ) : (
          <View style={styles.noContent}>
            <Text style={{ color: colors.darkMuted, fontSize: 16 }}>Nenhum conteúdo</Text>
            <Text style={{ color: colors.darkMuted, fontSize: 13, marginTop: 8 }}>
              Adicione um PDF ou texto à música
            </Text>
          </View>
        )}
      </View>

      {/* Próxima música */}
      <View style={styles.nextSong}>
        {activeIdx < songs.length - 1 ? (
          <>
            <Text style={styles.nextLabel}>A seguir: </Text>
            <Text style={styles.nextTitle} numberOfLines={1}>{songs[activeIdx + 1].title}</Text>
            <Text style={styles.nextArtist}> — {songs[activeIdx + 1].artist}</Text>
          </>
        ) : (
          <Text style={styles.nextLabel}>✕ Última música do show</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.sm,
  },
  topLeft: { flexDirection: 'row', gap: spacing.sm, flex: 1 },
  topCenter: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 2, justifyContent: 'center' },
  topRight: { flex: 1, alignItems: 'flex-end' },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  pillText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: font.medium },
  keyBadge: { backgroundColor: colors.amber, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  keyBadgeText: { color: '#0C0B09', fontSize: 11, fontWeight: font.bold },
  songTitle: { fontSize: 13, fontWeight: font.medium, color: 'rgba(255,255,255,0.9)', maxWidth: 140 },
  songCount: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  controls: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingBottom: spacing.sm, flexWrap: 'wrap',
  },
  controlBtn: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  controlBtnActive: { backgroundColor: colors.amber, borderColor: colors.amber },
  controlText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: font.medium },
  controlTextActive: { color: '#0C0B09', fontWeight: font.bold },
  speedText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, width: 16, textAlign: 'center' },
  stage: { flex: 1 },
  lyricsScroll: { flex: 1 },
  lyricsText: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, fontFamily: 'monospace' },
  pdf: { flex: 1, width: W },
  pdfLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  noContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pdfDarkOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    // Escurece o PDF no modo escuro
  },
  nextSong: {
    position: 'absolute', bottom: spacing.md, right: spacing.md,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: 8, maxWidth: 260,
  },
  nextLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  nextTitle: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: font.medium, maxWidth: 140 },
  nextArtist: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
});
