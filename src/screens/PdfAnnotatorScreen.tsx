import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  PanResponder, Dimensions, SafeAreaView, StatusBar,
} from 'react-native';
import Pdf from 'react-native-pdf';
import Svg, { Path } from 'react-native-svg';
import { loadAnnotations, saveAnnotations, clearAnnotations, type Stroke, type Point } from '../lib/annotations';
import { colors, spacing, font } from '../lib/theme';

const { width: W, height: H } = Dimensions.get('window');

const COLORS = ['#F5A623', '#FF0055', '#00E5FF', '#FFFFFF', '#000000'];
const WIDTHS = [2, 4, 8];

export default function PdfAnnotatorScreen({ route, navigation }: any) {
  const { songId, pdfUri, songTitle } = route.params;

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [tool, setTool] = useState<'pen' | 'eraser' | null>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(WIDTHS[0]);
  const [saved, setSaved] = useState(false);
  const [showTools, setShowTools] = useState(true);

  useEffect(() => {
    loadAnnotations(songId).then(setStrokes);
  }, [songId]);

  async function handleSave() {
    await saveAnnotations(songId, strokes);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleClear() {
    Alert.alert('Limpar anotações', 'Remover todas as anotações desta música?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Limpar', style: 'destructive', onPress: async () => {
          await clearAnnotations(songId);
          setStrokes([]);
        }
      }
    ]);
  }

  function strokeToPath(stroke: Stroke): string {
    if (stroke.points.length < 2) return '';
    const [first, ...rest] = stroke.points;
    return `M ${first.x} ${first.y} ` + rest.map(p => `L ${p.x} ${p.y}`).join(' ');
  }

  // PanResponder para desenho
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => tool !== null,
    onMoveShouldSetPanResponder: () => tool !== null,
    onPanResponderGrant: (e) => {
      if (tool === null) return;
      const { locationX, locationY } = e.nativeEvent;
      if (tool === 'pen') {
        setCurrentStroke({ color, width, points: [{ x: locationX, y: locationY }] });
      }
    },
    onPanResponderMove: (e) => {
      if (tool === null) return;
      const { locationX, locationY } = e.nativeEvent;
      if (tool === 'pen' && currentStroke) {
        setCurrentStroke(prev => prev ? {
          ...prev,
          points: [...prev.points, { x: locationX, y: locationY }]
        } : null);
      } else if (tool === 'eraser') {
        const radius = 20;
        setStrokes(prev => prev.filter(s =>
          !s.points.some(p => Math.hypot(p.x - locationX, p.y - locationY) < radius)
        ));
      }
    },
    onPanResponderRelease: () => {
      if (tool === 'pen' && currentStroke && currentStroke.points.length > 1) {
        setStrokes(prev => [...prev, currentStroke]);
      }
      setCurrentStroke(null);
    },
  });

  return (
    <View style={s.container}>
      <StatusBar hidden />

      {/* Header */}
      <SafeAreaView style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{songTitle}</Text>
        <TouchableOpacity
          style={[s.saveBtn, saved && s.savedBtn]}
          onPress={handleSave}
        >
          <Text style={[s.saveBtnText, saved && s.savedBtnText]}>
            {saved ? '✓ Salvo' : 'Salvar'}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* PDF + Canvas */}
      <View style={s.stage} {...(tool === null ? {} : panResponder.panHandlers)}>
        {/* PDF */}
        <Pdf
          source={{ uri: pdfUri, cache: true }}
          style={s.pdf}
          fitPolicy={0}
          onError={() => Alert.alert('Erro', 'Não foi possível carregar o PDF.')}
        />

        {/* SVG Canvas de anotações */}
        <View style={s.canvas} pointerEvents={tool !== null ? 'auto' : 'none'} {...(tool !== null ? panResponder.panHandlers : {})}>
          <Svg width={W} height={H}>
            {strokes.map((stroke, i) => (
              <Path
                key={i}
                d={strokeToPath(stroke)}
                stroke={stroke.color}
                strokeWidth={stroke.width}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ))}
            {currentStroke && (
              <Path
                d={strokeToPath(currentStroke)}
                stroke={currentStroke.color}
                strokeWidth={currentStroke.width}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            )}
          </Svg>
        </View>
      </View>

      {/* Toolbar */}
      <View style={s.toolbar}>
        {/* Caneta */}
        <TouchableOpacity
          style={[s.toolBtn, tool === 'pen' && s.toolBtnActive]}
          onPress={() => setTool(t => t === 'pen' ? null : 'pen')}
        >
          <Text style={s.toolIcon}>✏️</Text>
        </TouchableOpacity>

        {/* Borracha */}
        <TouchableOpacity
          style={[s.toolBtn, tool === 'eraser' && s.toolBtnActive]}
          onPress={() => setTool(t => t === 'eraser' ? null : 'eraser')}
        >
          <Text style={s.toolIcon}>🧹</Text>
        </TouchableOpacity>

        {/* Cores */}
        {tool === 'pen' && COLORS.map(c => (
          <TouchableOpacity
            key={c}
            style={[s.colorBtn, { backgroundColor: c }, color === c && s.colorBtnActive]}
            onPress={() => setColor(c)}
          />
        ))}

        {/* Espessura */}
        {tool === 'pen' && WIDTHS.map(w => (
          <TouchableOpacity
            key={w}
            style={[s.widthBtn, width === w && s.widthBtnActive]}
            onPress={() => setWidth(w)}
          >
            <View style={[s.widthDot, { width: w * 2, height: w * 2, borderRadius: w }]} />
          </TouchableOpacity>
        ))}

        {/* Limpar */}
        <TouchableOpacity style={s.clearBtn} onPress={handleClear}>
          <Text style={s.clearText}>🗑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  backBtn: { padding: 8 },
  backText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  headerTitle: { flex: 1, textAlign: 'center', color: '#fff', fontSize: 14, fontWeight: font.semibold, marginHorizontal: spacing.sm },
  saveBtn: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  savedBtn: { backgroundColor: '#22c55e' },
  saveBtnText: { color: '#fff', fontWeight: font.bold, fontSize: 13 },
  savedBtnText: { color: '#fff' },
  stage: { flex: 1, position: 'relative' },
  pdf: { flex: 1, width: W },
  canvas: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  toolbar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, flexWrap: 'wrap',
  },
  toolBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  toolBtnActive: { backgroundColor: colors.amber },
  toolIcon: { fontSize: 18 },
  colorBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
  colorBtnActive: { borderColor: '#fff', transform: [{ scale: 1.2 }] },
  widthBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)' },
  widthBtnActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  widthDot: { backgroundColor: '#fff' },
  clearBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,0,0,0.2)', alignItems: 'center', justifyContent: 'center' },
  clearText: { fontSize: 18 },
});
