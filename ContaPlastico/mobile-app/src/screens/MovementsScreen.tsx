import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { movementsApi, getErrorMessage } from '../services/api';
import { colors, radius, spacing } from '../theme';
import type { Movement, MovementType } from '../types';

const TYPE_FILTERS: Array<MovementType | null> = [
  null,
  'ENTRADA',
  'SALIDA',
  'CONSUMO',
  'MERMA',
];

const TYPE_LABELS: Record<MovementType, string> = {
  ENTRADA: 'Entrada',
  SALIDA: 'Salida',
  CONSUMO: 'Consumo',
  MERMA: 'Merma',
};

const TYPE_COLORS: Record<MovementType, string> = {
  ENTRADA: colors.success,
  SALIDA: colors.danger,
  CONSUMO: colors.warning,
  MERMA: colors.danger,
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatKg = (value: number) =>
  new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);

function MovementCard({ item }: { item: Movement }) {
  const color = TYPE_COLORS[item.type];
  const positive = item.type === 'ENTRADA';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.typeBadge, { backgroundColor: `${color}1F`, borderColor: color }]}>
          <Text style={[styles.typeBadgeText, { color }]}>{TYPE_LABELS[item.type]}</Text>
        </View>
        <Text
          style={[
            styles.quantity,
            { color: positive ? colors.success : colors.textPrimary },
          ]}
        >
          {positive ? '+' : '-'}{formatKg(item.quantityKg)} KG
        </Text>
      </View>

      <Text style={styles.materialName}>
        {item.material.code} — {item.material.name}
      </Text>

      <Text style={styles.notes} numberOfLines={2}>
        {item.notes || 'Sin notas'}
      </Text>

      <View style={styles.cardFooter}>
        {item.productionRequest?.orderCode && (
          <Text style={styles.footerText}>OP: {item.productionRequest.orderCode}</Text>
        )}
        <Text style={styles.footerText}>
          {item.user.name} · {formatDate(item.createdAt)}
        </Text>
      </View>
    </View>
  );
}

export default function MovementsScreen() {
  const insets = useSafeAreaInsets();

  const [movements, setMovements] = useState<Movement[]>([]);
  const [typeFilter, setTypeFilter] = useState<MovementType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMovements = useCallback(async () => {
    setError(null);
    try {
      const data = await movementsApi.getAll({ type: typeFilter ?? undefined });
      setMovements(data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [typeFilter]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    loadMovements().finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [loadMovements]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadMovements();
    setIsRefreshing(false);
  }, [loadMovements]);

  const summary = useMemo(() => {
    const inflows = movements
      .filter((m) => m.type === 'ENTRADA')
      .reduce((acc, m) => acc + m.quantityKg, 0);
    const outflows = movements
      .filter((m) => m.type !== 'ENTRADA')
      .reduce((acc, m) => acc + m.quantityKg, 0);
    return { inflows, outflows };
  }, [movements]);

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyTitle}>Sin movimientos</Text>
        <Text style={styles.emptyText}>
          No hay movimientos de inventario registrados con los filtros aplicados.
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.filtersWrap, { paddingTop: insets.top + spacing.sm }]}>
        <FlatList
          horizontal
          data={TYPE_FILTERS}
          keyExtractor={(item) => item ?? 'todos'}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          renderItem={({ item }) => {
            const isActive = typeFilter === item;
            const label = item === null ? 'Todos' : TYPE_LABELS[item];
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

      {!isLoading && !error && movements.length > 0 && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>
            {movements.length} {movements.length === 1 ? 'movimiento' : 'movimientos'}
          </Text>
          <Text style={styles.summaryIn}>+{formatKg(summary.inflows)} KG entradas</Text>
          <Text style={styles.summaryOut}>-{formatKg(summary.outflows)} KG salidas</Text>
        </View>
      )}

      {error ? (
        <View style={styles.stateBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            style={({ pressed }) => [styles.retryButton, pressed && { opacity: 0.8 }]}
            onPress={handleRefresh}
          >
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : isLoading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando movimientos...</Text>
        </View>
      ) : (
        <FlatList
          data={movements}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + spacing.xl },
          ]}
          renderItem={({ item }) => <MovementCard item={item} />}
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
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
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
  summaryIn: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.success,
  },
  summaryOut: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.danger,
  },
  listContent: {
    padding: spacing.lg,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  quantity: {
    fontSize: 15,
    fontWeight: '800',
  },
  materialName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  notes: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  footerText: {
    fontSize: 11,
    color: colors.textMuted,
    flexShrink: 1,
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
