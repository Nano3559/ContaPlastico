import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { entriesApi, rawMaterialsApi, suppliersApi, getErrorMessage } from '../services/api';
import { colors, radius, spacing } from '../theme';
import type { RawMaterial, RootStackParamList, Supplier } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'EntryScreen'>;

export default function EntryScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [quantityKg, setQuantityKg] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [qualityCertificate, setQualityCertificate] = useState(true);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      rawMaterialsApi.getAll(),
      suppliersApi.getAll(),
    ])
      .then(([m, s]) => {
        setMaterials(m);
        setSuppliers(s);
      })
      .catch(() => {})
      .finally(() => setIsLoadingData(false));
  }, []);

  const selectedMaterial = materials.find((m) => m.id === selectedMaterialId);

  const handleSubmit = async () => {
    setError(null);

    if (!selectedMaterialId) {
      setError('Selecciona una materia prima.');
      return;
    }
    if (!selectedSupplierId) {
      setError('Selecciona un proveedor.');
      return;
    }
    if (!batchNumber.trim()) {
      setError('Ingresa el número de lote del proveedor.');
      return;
    }
    const qty = parseFloat(quantityKg);
    if (isNaN(qty) || qty <= 0) {
      setError('Ingresa una cantidad válida en KG.');
      return;
    }
    if (!invoiceNumber.trim()) {
      setError('Ingresa el número de factura.');
      return;
    }
    if (!location.trim()) {
      setError('Ingresa la ubicación del silo o almacén.');
      return;
    }

    setIsSubmitting(true);
    try {
      await entriesApi.create({
        materialId: selectedMaterialId,
        supplierId: selectedSupplierId,
        supplierBatchNumber: batchNumber.trim(),
        quantityKg: qty,
        invoiceNumber: invoiceNumber.trim(),
        qualityCertificate,
        siloOrWarehouseLocation: location.trim(),
        operatorNotes: notes.trim(),
      });
      Alert.alert(
        'Entrada registrada',
        'La entrada de materia prima se registró correctamente.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingData) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando datos...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Materia Prima</Text>
          <Text style={styles.label}>Seleccionar material</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {materials.map((m) => {
              const active = selectedMaterialId === m.id;
              return (
                <Pressable
                  key={m.id}
                  style={({ pressed }) => [
                    styles.chip,
                    active && styles.chipActive,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => {
                    setSelectedMaterialId(m.id);
                    if (m.siloLocation) setLocation(m.siloLocation);
                  }}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {m.code}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {selectedMaterial && (
            <Text style={styles.hint}>
              {selectedMaterial.name} — Stock actual: {selectedMaterial.currentStockKg} KG
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Proveedor</Text>
          <Text style={styles.label}>Seleccionar proveedor</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {suppliers.map((s) => {
              const active = selectedSupplierId === s.id;
              return (
                <Pressable
                  key={s.id}
                  style={({ pressed }) => [
                    styles.chip,
                    active && styles.chipActive,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => setSelectedSupplierId(s.id)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {s.code}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {selectedSupplierId && (
            <Text style={styles.hint}>
              {suppliers.find((s) => s.id === selectedSupplierId)?.name}
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del lote</Text>

          <Text style={styles.label}>Número de lote del proveedor</Text>
          <TextInput
            style={styles.input}
            placeholder="LOTE-BRASKEM-8849"
            placeholderTextColor={colors.textMuted}
            value={batchNumber}
            onChangeText={setBatchNumber}
            autoCapitalize="characters"
            editable={!isSubmitting}
          />

          <Text style={styles.label}>Cantidad (KG)</Text>
          <TextInput
            style={styles.input}
            placeholder="5000"
            placeholderTextColor={colors.textMuted}
            value={quantityKg}
            onChangeText={setQuantityKg}
            keyboardType="numeric"
            editable={!isSubmitting}
          />

          <Text style={styles.label}>Número de factura</Text>
          <TextInput
            style={styles.input}
            placeholder="FAC-2026-9901"
            placeholderTextColor={colors.textMuted}
            value={invoiceNumber}
            onChangeText={setInvoiceNumber}
            autoCapitalize="characters"
            editable={!isSubmitting}
          />

          <View style={styles.switchRow}>
            <Text style={styles.label}>Certificado de calidad</Text>
            <Switch
              value={qualityCertificate}
              onValueChange={setQualityCertificate}
              trackColor={{ false: colors.surfaceLight, true: colors.primary }}
              thumbColor={qualityCertificate ? colors.background : colors.textMuted}
              disabled={isSubmitting}
            />
          </View>

          <Text style={styles.label}>Ubicación silo / almacén</Text>
          <TextInput
            style={styles.input}
            placeholder="Silo A-01"
            placeholderTextColor={colors.textMuted}
            value={location}
            onChangeText={setLocation}
            editable={!isSubmitting}
          />

          <Text style={styles.label}>Notas del operador (opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Inspección visual conforme, libre de humedad"
            placeholderTextColor={colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            editable={!isSubmitting}
          />
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.submitButton,
            pressed && styles.submitButtonPressed,
            isSubmitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.submitButtonText}>Registrar entrada</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 13,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  chipScroll: {
    marginBottom: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.background,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  input: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  textArea: {
    minHeight: 80,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  errorBox: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: colors.success,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitButtonPressed: {
    opacity: 0.8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
});
