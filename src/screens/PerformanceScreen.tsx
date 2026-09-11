import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, PanResponder, Dimensions, StatusBar,
} from 'react-native';
import { colors, spacing } from '../lib/theme';
import type { Song } from '../data/songs';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 80;

export default function PerformanceScreen({ route, navigation }: any) {
  const { songs, setlistName } = route.params as { songs: Song[]; setlistName: string };
  const [activeIdx, setActiveIdx] = useState(0);
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(3);
  const [darkMode, setDarkMode] = useState(true);
  const [fontSize, setFontSize] = useState(18);
  const [elapsed, setElapsed] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const autoScrollRef = useRef<ReturnType<typeof setInterval>>();

  const activeSong = songs[activeIdx];
  const hasLyrics = !!activeSong?.lyrics && !activeSong?.hasPdf;

  // Timer
  React.useEffect(() => {
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Auto scroll
  React.useEffect(() => {
    if (!autoScroll || !hasLyrics) {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);
      return;
    }
    let offset = 0;
    autoScrollRef.current = setInterval(() => {
      offset += scrollSpeed * 0.5;
      scrollRef.current?.scrollTo({ y: offset, animated: false });
    }, 16);
    return () => { if (autoScrollRef.current) clearInterval(autoScrollRef.current); };
  }, [autoScroll, scrollSpeed, hasLyrics]);

  // Reset ao trocar música
  React.useEffect(() => {
    setAutoScroll(false);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [activeIdx]);

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  // Swipe para trocar de música
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderRelease: (_, g) => {
      if (g.dx < -SWIPE_THRESHOLD && activeIdx < songs.length - 1) {
        setActiveIdx(i => i + 1);
      } else if (g.dx > SWIPE_THRESHOLD && activeIdx > 0) {
        setActiveIdx(i => i - 1);
      }
    },
  });

  const bg = darkMode ? colors.darkBg : '#FFFFFF';
  const textColor = darkMode ? colors.darkText : colors.foreground;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar hidden />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.exitBtn}>
          <Text style={styles.exitText}>← Sair</Text>
        </TouchableOpacity>

        <View style={styles.songInfo}>
          {activeSong?.key && (
            <View style={styles.keyBadge}><Text style={styles.keyBadgeText}>{activeSong.key}</Text></View>
          )}
          <Text style={styles.songTitle} numberOfLines={1}>{activeSong?.title}</Text>
          <Text style={styles.songCount}>{activeIdx + 1}/{songs.length}</Text>
        </View>

        <View style={styles.topRight}>
          <Text style={styles.timer}>{formatTime(elapsed)}</Text>
          <TouchableOpacity onPress={() => setDarkMode(d => !d)} style={styles.iconBtn}>
            <Text style={styles.iconText}>{darkMode ? '🌙' : '☀️'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {hasLyrics && (
          <>
            <TouchableOpacity
              style={[styles.controlBtn, autoScroll && styles.controlBtnActive]}
              onPress={() => setAutoScroll(a => !a)}
            >
              <Text style={[styles.controlBtnText, autoScroll && styles.controlBtnTextActive]}>
                {autoScroll ? '⏸ Parar' : '▶ Auto'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setScrollSpeed(s => Math.max(1, s - 1))}>
              <Text style={styles.iconText}>↓</Text>
            </TouchableOpacity>
            <Text style={styles.speedText}>{scrollSpeed}</Text>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setScrollSpeed(s => Math.min(10, s + 1))}>
              <Text style={styles.iconText}>↑</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setFontSize(s => Math.max(12, s - 2))}>
              <Text style={styles.iconText}>A-</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setFontSize(s => Math.min(40, s + 2))}>
              <Text style={styles.iconText}>A+</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Content */}
      <View style={styles.stage} {...panResponder.panHandlers}>
        {hasLyrics ? (
          <ScrollView
            ref={scrollRef}
            style={styles.lyricsScroll}
            onTouchStart={() => autoScroll && setAutoScroll(false)}
          >
            <Text style={[styles.lyricsText, { fontSize, color: textColor }]}>
              {activeSong?.lyrics}
            </Text>
            <View style={{ height: 400 }} />
          </ScrollView>
        ) : activeSong?.pdfUri ? (
          <View style={styles.pdfPlaceholder}>
            <Text style={{ color: '#fff', fontSize: 16 }}>PDF: {activeSong.pdfName}</Text>
            <Text style={{ color: colors.darkMuted, fontSize: 12, marginTop: 8 }}>
              Visualizador de PDF em desenvolvimento
            </Text>
          </View>
        ) : (
          <View style={styles.pdfPlaceholder}>
            <Text style={{ color: colors.darkMuted }}>Nenhum conteúdo</Text>
          </View>
        )}
      </View>

      {/* Próxima música */}
      {activeIdx < songs.length - 1 ? (
        <View style={styles.nextSong}>
          <Text style={styles.nextSongLabel}>A seguir: </Text>
          <Text style={styles.nextSongTitle}>{songs[activeIdx + 1].title}</Text>
          <Text style={styles.nextSongArtist}> — {songs[activeIdx + 1].artist}</Text>
        </View>
      ) : (
        <View style={styles.nextSong}>
          <Text style={styles.nextSongLabel}>✕ Última música do show</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  exitBtn: { paddingVertical: 8, paddingRight: spacing.sm },
  exitText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  songInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'center' },
  keyBadge: { backgroundColor: colors.amber, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  keyBadgeText: { color: colors.darkBg, fontSize: 11, fontWeight: '700' },
  songTitle: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.9)', maxWidth: 160 },
  songCount: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  timer: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontVariant: ['tabular-nums'] },
  iconBtn: { padding: 8 },
  iconText: { fontSize: 16, color: 'rgba(255,255,255,0.7)' },
  controls: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingBottom: spacing.sm,
  },
  controlBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  controlBtnActive: { backgroundColor: colors.amber, borderColor: colors.amber },
  controlBtnText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  controlBtnTextActive: { color: colors.darkBg, fontWeight: '700' },
  speedText: { fontSize: 12, color: 'rgba(255,255,255,0.5)', width: 16, textAlign: 'center' },
  stage: { flex: 1 },
  lyricsScroll: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  lyricsText: { fontFamily: 'monospace', lineHeight: 28 },
  pdfPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nextSong: {
    flexDirection: 'row', alignItems: 'center',
    position: 'absolute', bottom: spacing.md, right: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: 8, maxWidth: 280,
  },
  nextSongLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  nextSongTitle: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  nextSongArtist: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
});
