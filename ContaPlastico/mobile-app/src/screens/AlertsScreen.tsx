import React, { useCallback, useEffect, useState } from 'react';
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

import { alertsApi, getErrorMessage } from '../services/api';
import { colors, radius, spacing } from '../theme';
import type { StockAlert, AlertSeverity } from '../types';
import { ALERT_SEVERITY_LABELS } from '../types';

const severityColors: Record<AlertSeverity, string> = {
  WARNING: colors.warning,
  CRITICAL: colors.danger,
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatKg = (value: number) =>
  new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);

function AlertCard({ item }: { item: StockAlert }) {
  const color = severityColors[item.severity];
  const gap = item.minStockKg - item.currentStockKg;

  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.severityBadge, { backgroundColor: `${color}1F`, borderColor: color }]}>
          <View style={[styles.severityDot, { backgroundColor: color }]} />
          <Text style={[styles.severityText, { color }]}>
            {ALERT_SEVERITY_LABELS[item.severity]}
          </Text>
        </View>
      </View>

      <Text style={styles.materialName}>{item.materialName}</Text>

      <View style={styles.stockRow}>
        <View style={styles.stockCol}>
          <Text style={styles.stockLabel}>Actual</Text>
          <Text style={[styles.stockValue, { color }]}>
            {formatKg(item.currentStockKg)} KG
          </Text>
        </View>
        <View style={styles.stockCol}>
          <Text style={styles.stockLabel}>Mínimo</Text>
          <Text style={styles.stockValue}>
            {formatKg(item.minStockKg)} KG
          </Text>
        </View>
        <View style={styles.stockCol}>
          <Text style={styles.stockLabel}>Déficit</Text>
          <Text style={[styles.stockValue, { color: colors.danger }]}>
            -{formatKg(gap)} KG
          </Text>
        </View>
      </View>

      <Text style={styles.dateText}>
        Detectado: {formatDate(item.triggeredAt)}
      </Text>
    </View>
  );
}

export default function AlertsScreen() {
  const insets = useSafeAreaInsets();

  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAlerts = useCallback(async () => {
    setError(null);
    try {
      const data = await alertsApi.getAll();
      setAlerts(data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    loadAlerts().finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [loadAlerts]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadAlerts();
    setIsRefreshing(false);
  }, [loadAlerts]);

  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL').length;
  const warningCount = alerts.filter((a) => a.severity === 'WARNING').length;

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyTitle}>Sin alertas</Text>
        <Text style={styles.emptyText}>
          Todas las materias primas están por encima de su stock mínimo.
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {!isLoading && !error && alerts.length > 0 && (
        <View style={[styles.summaryRow, { paddingTop: insets.top + spacing.sm }]}>
          <Text style={styles.summaryText}>
            {alerts.length} {alerts.length === 1 ? 'alerta' : 'alertas'}
          </Text>
          {criticalCount > 0 && (
            <Text style={[styles.summaryCount, { color: colors.danger }]}>
              {criticalCount} críticas
            </Text>
          )}
          {warningCount > 0 && (
            <Text style={[styles.summaryCount, { color: colors.warning }]}>
              {warningCount} advertencias
            </Text>
          )}
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
          <Text style={styles.loadingText}>Cargando alertas...</Text>
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + spacing.xl },
          ]}
          renderItem={({ item }) => <AlertCard item={item} />}
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
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  summaryCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: spacing.sm,
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  severityDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  materialName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  stockCol: {
    alignItems: 'center',
  },
  stockLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
    marginBottom: 2,
  },
  stockValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dateText: {
    fontSize: 11,
    color: colors.textMuted,
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
