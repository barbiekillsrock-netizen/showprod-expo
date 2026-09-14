import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  SafeAreaView, StatusBar, Dimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { loadAnnotations, saveAnnotations, clearAnnotations, type Stroke } from '../lib/annotations';
import { colors, spacing, font } from '../lib/theme';

const { width: W } = Dimensions.get('window');

const COLORS = ['#F5A623', '#FF0055', '#00E5FF', '#000000', '#FFFFFF'];
const WIDTHS = [2, 4, 8];

function buildHtml(pdfUri: string, strokes: Stroke[], color: string, width: number): string {
  const strokesJson = JSON.stringify(strokes);
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #fff; overflow: hidden; }
  #pdf-frame {
    position: absolute; top: 0; left: 0;
    width: 100%; height: 100%;
    border: none;
  }
  #canvas {
    position: absolute; top: 0; left: 0;
    width: 100%; height: 100%;
    touch-action: none;
  }
</style>
</head>
<body>
  <iframe id="pdf-frame" src="${pdfUri}"></iframe>
  <canvas id="canvas"></canvas>
<script>
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  let drawing = false;
  let currentStroke = [];
  let strokes = ${strokesJson};
  let currentColor = '${color}';
  let currentWidth = ${width};
  let tool = 'pen';

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    redraw();
  }

  function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokes.forEach(s => {
      if (s.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(s.points[0].x, s.points[0].y);
      s.points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    });
    if (currentStroke.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = currentWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
      currentStroke.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    }
  }

  canvas.addEventListener('pointerdown', e => {
    drawing = true;
    currentStroke = [{ x: e.offsetX, y: e.offsetY }];
  });

  canvas.addEventListener('pointermove', e => {
    if (!drawing) return;
    if (tool === 'eraser') {
      const r = 30;
      strokes = strokes.filter(s =>
        !s.points.some(p => Math.hypot(p.x - e.offsetX, p.y - e.offsetY) < r)
      );
      redraw();
    } else {
      currentStroke.push({ x: e.offsetX, y: e.offsetY });
      redraw();
    }
  });

  canvas.addEventListener('pointerup', e => {
    if (tool === 'pen' && currentStroke.length > 1) {
      strokes.push({ color: currentColor, width: currentWidth, points: currentStroke });
    }
    currentStroke = [];
    drawing = false;
    redraw();
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'strokes', data: strokes }));
  });

  window.addEventListener('message', e => {
    const msg = JSON.parse(e.data);
    if (msg.type === 'setTool') tool = msg.value;
    if (msg.type === 'setColor') { currentColor = msg.value; }
    if (msg.type === 'setWidth') { currentWidth = msg.value; }
    if (msg.type === 'clear') { strokes = []; redraw(); window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'strokes', data: [] })); }
  });

  window.addEventListener('resize', resize);
  resize();
</script>
</body>
</html>`;
}

export default function PdfAnnotatorScreen({ route, navigation }: any) {
  const { songId, pdfUri, songTitle } = route.params;

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [color, setColor] = useState(COLORS[0]);
  const [penWidth, setPenWidth] = useState(WIDTHS[0]);
  const [saved, setSaved] = useState(false);
  const webViewRef = useRef<any>(null);
  const strokesRef = useRef<Stroke[]>([]);

  useEffect(() => {
    loadAnnotations(songId).then(s => {
      setStrokes(s);
      strokesRef.current = s;
    });
  }, [songId]);

  useEffect(() => {
    return () => { saveAnnotations(songId, strokesRef.current); };
  }, [songId]);

  function sendToWebView(msg: object) {
    webViewRef.current?.injectJavaScript(
      `window.dispatchEvent(new MessageEvent('message', { data: '${JSON.stringify(msg).replace(/'/g, "\\'")}' })); true;`
    );
  }

  function handleToolChange(t: 'pen' | 'eraser') {
    setTool(t);
    sendToWebView({ type: 'setTool', value: t });
  }

  function handleColorChange(c: string) {
    setColor(c);
    sendToWebView({ type: 'setColor', value: c });
  }

  function handleWidthChange(w: number) {
    setPenWidth(w);
    sendToWebView({ type: 'setWidth', value: w });
  }

  function handleClear() {
    Alert.alert('Limpar', 'Remover todas as anotações?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Limpar', style: 'destructive', onPress: () => {
        sendToWebView({ type: 'clear' });
        clearAnnotations(songId);
      }},
    ]);
  }

  async function handleSave() {
    await saveAnnotations(songId, strokesRef.current);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function onMessage(event: any) {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'strokes') {
        strokesRef.current = msg.data;
        setStrokes(msg.data);
      }
    } catch {}
  }

  return (
    <View style={s.container}>
      <StatusBar hidden />
      <SafeAreaView style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={s.title} numberOfLines={1}>✏️ {songTitle}</Text>
        <TouchableOpacity style={[s.saveBtn, saved && s.savedBtn]} onPress={handleSave}>
          <Text style={s.saveBtnText}>{saved ? '✓ Salvo' : 'Salvar'}</Text>
        </TouchableOpacity>
      </SafeAreaView>

      <WebView
        ref={webViewRef}
        source={{ html: buildHtml(pdfUri, strokes, color, penWidth) }}
        style={s.webview}
        originWhitelist={['*']}
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        mixedContentMode="always"
        onMessage={onMessage}
        javaScriptEnabled
        scrollEnabled={false}
      />

      <View style={s.toolbar}>
        <TouchableOpacity style={[s.toolBtn, tool === 'pen' && s.toolActive]} onPress={() => handleToolChange('pen')}>
          <Text style={s.toolIcon}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.toolBtn, tool === 'eraser' && s.toolActive]} onPress={() => handleToolChange('eraser')}>
          <Text style={s.toolIcon}>🧹</Text>
        </TouchableOpacity>
        {COLORS.map(c => (
          <TouchableOpacity key={c} onPress={() => handleColorChange(c)}
            style={[s.colorBtn, { backgroundColor: c }, color === c && s.colorActive]} />
        ))}
        {WIDTHS.map(w => (
          <TouchableOpacity key={w} style={[s.widthBtn, penWidth === w && s.toolActive]} onPress={() => handleWidthChange(w)}>
            <View style={{ width: w * 2, height: w * 2, borderRadius: w, backgroundColor: '#fff' }} />
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={s.clearBtn} onPress={handleClear}>
          <Text style={s.toolIcon}>🗑</Text>
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
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  backBtn: { padding: 8 },
  backText: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  title: { flex: 1, textAlign: 'center', color: '#fff', fontSize: 14, fontWeight: font.semibold, marginHorizontal: spacing.sm },
  saveBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  savedBtn: { backgroundColor: '#22c55e' },
  saveBtnText: { color: '#fff', fontWeight: font.bold, fontSize: 13 },
  webview: { flex: 1 },
  toolbar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, flexWrap: 'wrap',
  },
  toolBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  toolActive: { backgroundColor: colors.amber },
  toolIcon: { fontSize: 18 },
  colorBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
  colorActive: { borderColor: '#fff' },
  widthBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  clearBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
});
