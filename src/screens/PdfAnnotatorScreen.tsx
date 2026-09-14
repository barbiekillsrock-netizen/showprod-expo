import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  PanResponder, Dimensions, SafeAreaView, StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { loadAnnotations, saveAnnotations, clearAnnotations, type Stroke } from '../lib/annotations';
import { colors, spacing, font } from '../lib/theme';

const { width: W, height: H } = Dimensions.get('window');
const COLORS = ['#F5A623', '#FF0055', '#00E5FF', '#000000', '#FFFFFF'];
const WIDTHS = [2, 4, 8];

export default function PdfAnnotatorScreen({ route, navigation }: any) {
  const { songId, pdfUri, songTitle } = route.params;

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const strokesRef = useRef<Stroke[]>([]);
  const [currentPoints, setCurrentPoints] = useState<{x: number; y: number}[]>([]);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [color, setColor] = useState(COLORS[0]);
  const [penWidth, setPenWidth] = useState(WIDTHS[0]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadAnnotations(songId).then(s => {
      setStrokes(s);
      strokesRef.current = s;
    });
  }, [songId]);

  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  useEffect(() => {
    return () => { saveAnnotations(songId, strokesRef.current); };
  }, [songId]);

  async function handleSave() {
    await saveAnnotations(songId, strokesRef.current);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const { locationX, locationY } = e.nativeEvent;
      setCurrentPoints([{ x: locationX, y: locationY }]);
    },
    onPanResponderMove: (e) => {
      const { locationX, locationY } = e.nativeEvent;
      if (tool === 'eraser') {
        const r = 30;
        setStrokes(prev => {
          const next = prev.filter(s =>
            !s.points.some(p => Math.hypot(p.x - locationX, p.y - locationY) < r)
          );
          strokesRef.current = next;
          return next;
        });
        return;
      }
      setCurrentPoints(prev => [...prev, { x: locationX, y: locationY }]);
    },
    onPanResponderRelease: () => {
      if (tool === 'pen' && currentPoints.length > 1) {
        const newStroke: Stroke = { color, width: penWidth, points: currentPoints };
        setStrokes(prev => {
          const next = [...prev, newStroke];
          strokesRef.current = next;
          return next;
        });
      }
      setCurrentPoints([]);
    },
  });

  function renderStrokes() {
    const allStrokes = [
      ...strokes,
      ...(currentPoints.length > 1 ? [{ color, width: penWidth, points: currentPoints }] : []),
    ];

    return allStrokes.flatMap((stroke, si) =>
      stroke.points.slice(1).map((pt, i) => {
        const prev = stroke.points[i];
        const dx = pt.x - prev.x;
        const dy = pt.y - prev.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1) return null;
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        return (
          <View
            key={`${si}-${i}`}
            style={{
              position: 'absolute',
              left: prev.x,
              top: prev.y - stroke.width / 2,
              width: len,
              height: stroke.width,
              backgroundColor: stroke.color,
              borderRadius: stroke.width,
              transform: [{ rotate: `${angle}deg` }],
            }}
          />
        );
      }).filter(Boolean)
    );
  }

  return (
    <View style={s.container}>
      <StatusBar hidden />

      {/* Header */}
      <SafeAreaView style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={s.title} numberOfLines={1}>✏️ {songTitle}</Text>
        <TouchableOpacity style={[s.saveBtn, saved && s.savedBtn]} onPress={handleSave}>
          <Text style={s.saveBtnText}>{saved ? '✓ Salvo' : 'Salvar'}</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* PDF + Canvas sobrepostos */}
      <View style={s.stage}>
        {/* PDF por baixo */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <WebView
            source={{ uri: pdfUri }}
            style={s.pdf}
            originWhitelist={['*']}
            startInLoadingState
          />
        </View>

        {/* Canvas de anotações por cima */}
        <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
          {renderStrokes()}
        </View>
      </View>

      {/* Toolbar */}
      <View style={s.toolbar}>
        <TouchableOpacity
          style={[s.toolBtn, tool === 'pen' && s.toolActive]}
          onPress={() => setTool('pen')}
        >
          <Text style={s.toolIcon}>✏️</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.toolBtn, tool === 'eraser' && s.toolActive]}
          onPress={() => setTool('eraser')}
        >
          <Text style={s.toolIcon}>🧹</Text>
        </TouchableOpacity>

        {COLORS.map(c => (
          <TouchableOpacity
            key={c}
            onPress={() => setColor(c)}
            style={[s.colorBtn, { backgroundColor: c }, color === c && s.colorActive]}
          />
        ))}

        {WIDTHS.map(w => (
          <TouchableOpacity
            key={w}
            style={[s.widthBtn, penWidth === w && s.toolActive]}
            onPress={() => setPenWidth(w)}
          >
            <View style={{ width: w * 2, height: w * 2, borderRadius: w, backgroundColor: '#fff' }} />
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={s.clearBtn}
          onPress={() => Alert.alert('Limpar', 'Remover todas as anotações?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Limpar', style: 'destructive', onPress: () => {
              setStrokes([]);
              strokesRef.current = [];
              clearAnnotations(songId);
            }},
          ])}
        >
          <Text style={s.toolIcon}>🗑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  backBtn: { padding: 8 },
  backText: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  title: {
    flex: 1, textAlign: 'center', color: '#fff',
    fontSize: 14, fontWeight: font.semibold, marginHorizontal: spacing.sm,
  },
  saveBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  savedBtn: { backgroundColor: '#22c55e' },
  saveBtnText: { color: '#fff', fontWeight: font.bold, fontSize: 13 },
  stage: { flex: 1, position: 'relative' },
  pdf: { flex: 1, width: W },
  toolbar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, flexWrap: 'wrap',
  },
  toolBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  toolActive: { backgroundColor: colors.amber },
  toolIcon: { fontSize: 18 },
  colorBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
  colorActive: { borderColor: '#fff', transform: [{ scale: 1.2 }] },
  widthBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  clearBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,0,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
});
