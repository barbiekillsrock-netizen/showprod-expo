import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Switch, SafeAreaView } from 'react-native';
import { colors, spacing, radius, font } from '../lib/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DARK_MODE_KEY = 'showprod:pref:darkMode';

export default function SettingsScreen() {
  const [darkModeDefault, setDarkModeDefault] = useState(true);

  React.useEffect(() => {
    AsyncStorage.getItem(DARK_MODE_KEY).then(v => {
      if (v !== null) setDarkModeDefault(v === 'true');
    });
  }, []);

  function toggleDarkMode(val: boolean) {
    setDarkModeDefault(val);
    AsyncStorage.setItem(DARK_MODE_KEY, String(val));
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView>
        <View style={s.header}>
          <Text style={s.title}>Configurações</Text>
        </View>

        {/* Preferências do show */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>SHOW</Text>

          <View style={s.row}>
            <View style={s.rowInfo}>
              <Text style={s.rowLabel}>🌙 Modo escuro no show</Text>
              <Text style={s.rowSub}>PDF com fundo preto ao iniciar o show</Text>
            </View>
            <Switch
              value={darkModeDefault}
              onValueChange={toggleDarkMode}
              trackColor={{ false: colors.border, true: colors.foreground }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        {/* Sobre */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>SOBRE</Text>
          <View style={s.aboutCard}>
            <Text style={s.logoWrap}>
              <Text style={s.logoLight}>Show</Text>
              <Text style={s.logoBold}>Prod</Text>
            </Text>
            <Text style={s.logoSub}>STAGE MANAGER</Text>

            <Text style={s.aboutText}>
              Desenvolvido pela{' '}
              <Text style={s.bold}>ATOM Product Lab</Text>
              {' '}para atender a{' '}
              <Text
                style={[s.bold, s.link]}
                onPress={() => Linking.openURL('https://www.bandabarbiekills.com.br')}
              >
                Banda Barbie Kills
              </Text>
              .
            </Text>

            <TouchableOpacity onPress={() => Linking.openURL('mailto:atomproductlab@gmail.com')}>
              <Text style={s.email}>✉ atomproductlab@gmail.com</Text>
            </TouchableOpacity>

            <Text style={s.version}>Versão 1.0.0 · © 2026 ATOM Product Lab</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight ?? 24 : 0 },
  header: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 24, fontWeight: font.light, color: colors.foreground },
  section: { padding: spacing.md, gap: spacing.sm },
  sectionTitle: { fontSize: 11, fontWeight: font.bold, color: colors.mutedForeground, letterSpacing: 1.5, marginBottom: 4 },
  row: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', padding: spacing.md },
  rowInfo: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: font.medium, color: colors.foreground },
  rowSub: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  aboutCard: { backgroundColor: colors.card, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, alignItems: 'center' },
  logoWrap: { fontSize: 28 },
  logoLight: { fontWeight: font.light, color: colors.foreground },
  logoBold: { fontWeight: font.black, color: colors.foreground },
  logoSub: { fontSize: 10, fontWeight: font.bold, color: colors.mutedForeground, letterSpacing: 2, marginTop: 2, marginBottom: spacing.md },
  aboutText: { fontSize: 14, color: colors.mutedForeground, textAlign: 'center', lineHeight: 22, marginBottom: spacing.md },
  bold: { fontWeight: font.semibold, color: colors.foreground },
  link: { textDecorationLine: 'underline' },
  email: { fontSize: 14, color: colors.mutedForeground, marginBottom: spacing.lg },
  version: { fontSize: 12, color: colors.mutedForeground },
});
