import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { colors, spacing, radius } from '../lib/theme';

export default function SettingsScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Configurações</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ℹ️ Sobre</Text>
        </View>

        <View style={styles.aboutCard}>
          <Text style={styles.logoLight}>Show</Text>
          <Text style={styles.logoBold}>Prod</Text>
          <Text style={styles.logoSub}>Stage Manager</Text>

          <Text style={styles.aboutText}>
            Desenvolvido pela{' '}
            <Text style={styles.bold}>ATOM Product Lab</Text>
            {' '}para atender a{' '}
            <Text
              style={[styles.bold, styles.link]}
              onPress={() => Linking.openURL('https://www.bandabarbiekills.com.br')}
            >
              Banda Barbie Kills
            </Text>
            .
          </Text>

          <TouchableOpacity onPress={() => Linking.openURL('mailto:atomproductlab@gmail.com')}>
            <Text style={styles.email}>✉ atomproductlab@gmail.com</Text>
          </TouchableOpacity>

          <Text style={styles.version}>Versão 1.0.0 · © 2026 ATOM Product Lab</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 24, fontWeight: '300', color: colors.foreground },
  section: { padding: spacing.md },
  sectionHeader: { marginBottom: spacing.sm },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: colors.mutedForeground, letterSpacing: 1 },
  aboutCard: {
    backgroundColor: colors.card, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, alignItems: 'center',
  },
  logoLight: { fontSize: 28, fontWeight: '300', color: colors.foreground },
  logoBold: { fontSize: 28, fontWeight: '900', color: colors.foreground, marginTop: -8 },
  logoSub: { fontSize: 10, fontWeight: '600', color: colors.mutedForeground, letterSpacing: 2, marginTop: 4, marginBottom: spacing.md },
  aboutText: { fontSize: 14, color: colors.mutedForeground, textAlign: 'center', lineHeight: 22, marginBottom: spacing.md },
  bold: { fontWeight: '600', color: colors.foreground },
  link: { textDecorationLine: 'underline' },
  email: { fontSize: 14, color: colors.mutedForeground, marginBottom: spacing.lg },
  version: { fontSize: 12, color: colors.mutedForeground },
});
