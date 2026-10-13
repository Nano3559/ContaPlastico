import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  rawMaterialsApi,
  getErrorMessage,
} from '../services/api';
import { colors, radius, spacing } from '../theme';
import {
  MATERIAL_TYPE_LABELS,
  PROCESS_LABELS,
  STOCK_STATUS_LABELS,
  type MaterialType,
  type RawMaterial,
  type StockStatus,
} from '../types';

const TYPE_FILTERS: Array<MaterialType | null> = [
  null,
  'RESINA',
  'MASTERBATCH',
  'ADITIVO',
  'RECUPERADO',
];

const statusColors: Record<StockStatus, string> = {
  OPTIMO: colors.success,
  BAJO: colors.warning,
  CRITICO: colors.danger,
};

const formatKg = (value: number) =>
  new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);

function StatusPill({ status }: { status: StockStatus }) {
  const color = statusColors[status];
  return (
    <View style={[styles.statusPill, { backgroundColor: `${color}1F`, borderColor: color }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusPillText, { color }]}>
        {STOCK_STATUS_LABELS[status]}
      </Text>
    </View>
  );
}

function MaterialCard({ item }: { item: RawMaterial }) {
  const ratio = item.maxCapacityKg > 0
    ? Math.min(item.currentStockKg / item.maxCapacityKg, 1)
    : 0;
  const statusColor = statusColors[item.status];
  const initials = item.code.slice(0, 2).toUpperCase();

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.cardBadgeText}>{initials}</Text>
        </View>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardCode}>{item.code}</Text>
          <Text style={styles.cardName} numberOfLines={2}>
            {item.name}
          </Text>
        </View>
        <StatusPill status={item.status} />
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.max(ratio * 100, 2)}%`, backgroundColor: statusColor },
          ]}
        />
      </View>

      <View style={styles.stockRow}>
        <Text style={styles.stockCurrent}>
          {formatKg(item.currentStockKg)}{' '}
          <Text style={styles.stockUnit}>/ {formatKg(item.maxCapacityKg)} KG</Text>
        </Text>
        <Text style={styles.stockMin}>
          Mínimo: {formatKg(item.minStockKg)} KG
        </Text>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.footerChip}>
          <Text style={styles.footerChipText}>{item.siloLocation}</Text>
        </View>
        <View style={styles.footerChip}>
          <Text style={styles.footerChipText}>
            {MATERIAL_TYPE_LABELS[item.type] ?? item.type} ·{' '}
            {PROCESS_LABELS[item.category] ?? item.category}
          </Text>
        </View>
        {item.supplier?.name && (
          <Text style={styles.supplierName} numberOfLines={1}>
            {item.supplier.name}
          </Text>
        )}
      </View>
    </View>
  );
}

export default function StockScreen() {
  const insets = useSafeAreaInsets();

  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [searchText, setSearchText] = useState('');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<MaterialType | null>(null);
  const [onlyAlerts, setOnlyAlerts] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(searchText.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  const loadMaterials = useCallback(async () => {
    setError(null);
    try {
      const data = await rawMaterialsApi.getAll({
        search: query || undefined,
        type: typeFilter ?? undefined,
        minStockAlert: onlyAlerts || undefined,
      });
      setMaterials(data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [query, typeFilter, onlyAlerts]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    loadMaterials().finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [loadMaterials]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadMaterials();
    setIsRefreshing(false);
  }, [loadMaterials]);

  const summary = useMemo(() => {
    const totalKg = materials.reduce(
      (acc, material) => acc + material.currentStockKg,
      0,
    );
    const alertCount = materials.filter(
      (material) => material.status !== 'OPTIMO',
    ).length;
    return { totalKg, alertCount };
  }, [materials]);

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyTitle}>Sin resultados</Text>
        <Text style={styles.emptyText}>
          No hay materias primas que coincidan con la búsqueda o los filtros
          aplicados.
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.filtersWrap, { paddingTop: insets.top + spacing.sm }]}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por código o nombre..."
          placeholderTextColor={colors.textMuted}
          value={searchText}
          onChangeText={setSearchText}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />

        <View>
          <FlatList
            horizontal
            data={TYPE_FILTERS}
            keyExtractor={(item) => item ?? 'todos'}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
            renderItem={({ item }) => {
              const isActive = typeFilter === item;
              const label = item === null ? 'Todos' : MATERIAL_TYPE_LABELS[item];
              return (
                <Pressable
                  style={({ pressed }) => [
                    styles.filterChip,
                    isActive && styles.filterChipActive,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() =>
                    setTypeFilter((prev) => (prev === item ? null : item))
                  }
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      isActive && styles.filterChipTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.alertToggle,
            onlyAlerts && styles.alertToggleActive,
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => setOnlyAlerts((prev) => !prev)}
        >
          <Text
            style={[
              styles.alertToggleText,
              onlyAlerts && styles.alertToggleTextActive,
            ]}
          >
            Solo stock bajo / crítico
          </Text>
        </Pressable>
      </View>

      {!isLoading && !error && materials.length > 0 && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>
            {materials.length}{' '}
            {materials.length === 1 ? 'materia prima' : 'materias primas'}
          </Text>
          <Text style={styles.summaryText}>
            Total: {formatKg(summary.totalKg)} KG
          </Text>
          {summary.alertCount > 0 && (
            <Text style={styles.summaryAlert}>
              {summary.alertCount} en alerta
            </Text>
          )}
        </View>
      )}

      {error ? (
        <View style={styles.stateBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            style={({ pressed }) => [
              styles.retryButton,
              pressed && { opacity: 0.8 },
            ]}
            onPress={handleRefresh}
          >
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : isLoading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando inventario...</Text>
        </View>
      ) : (
        <FlatList
          data={materials}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <MaterialCard item={item} />}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filtersWrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  searchInput: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingRight: spacing.lg,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.background,
  },
  alertToggle: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  alertToggleActive: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  alertToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  alertToggleTextActive: {
    color: colors.danger,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  summaryAlert: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.danger,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardBadge: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBadgeText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '800',
  },
  cardTitleWrap: {
    flex: 1,
    marginRight: spacing.xs,
  },
  cardCode: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  cardName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceLight,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: spacing.sm,
  },
  stockCurrent: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  stockUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  stockMin: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  footerChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  footerChipText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  supplierName: {
    flex: 1,
    minWidth: 80,
    fontSize: 11,
    fontStyle: 'italic',
    color: colors.textMuted,
    textAlign: 'right',
  },
  stateBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 13,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
});
