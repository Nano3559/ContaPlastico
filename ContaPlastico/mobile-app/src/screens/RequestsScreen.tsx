import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { productionRequestsApi, getErrorMessage } from '../services/api';
import { colors, radius, spacing } from '../theme';
import {
  PROCESS_LABELS,
  REQUEST_STATUS_LABELS,
  type ProductionRequest,
  type RequestStatus,
  type RootStackParamList,
} from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'RequestsScreen'>;

const statusColors: Record<RequestStatus, string> = {
  PENDIENTE: colors.warning,
  APROBADA: colors.success,
  RECHAZADA: colors.danger,
  COMPLETADA: colors.primary,
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

function StatusPill({ status }: { status: RequestStatus }) {
  const color = statusColors[status];
  return (
    <View style={[styles.statusPill, { backgroundColor: `${color}1F`, borderColor: color }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusPillText, { color }]}>
        {REQUEST_STATUS_LABELS[status]}
      </Text>
    </View>
  );
}

function RequestCard({
  request,
  onApprove,
  isProcessing,
}: {
  request: ProductionRequest;
  onApprove: (id: string) => void;
  isProcessing: boolean;
}) {
  const pending = request.status === 'PENDIENTE';
  const totalKg = request.materials.reduce((acc, m) => acc + m.quantityKg, 0);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.orderCode}>{request.orderCode}</Text>
          <Text style={styles.targetProduct} numberOfLines={1}>
            {request.targetProduct}
          </Text>
        </View>
        <StatusPill status={request.status} />
      </View>

      <View style={styles.metaRow}>
        <View style={styles.footerChip}>
          <Text style={styles.footerChipText}>
            {request.line}
          </Text>
        </View>
        <View style={styles.footerChip}>
          <Text style={styles.footerChipText}>
            {PROCESS_LABELS[request.processType] ?? request.processType}
          </Text>
        </View>
        <View style={styles.footerChip}>
          <Text style={styles.footerChipText}>
            {request.materials.length} {request.materials.length === 1 ? 'material' : 'materiales'} ·{' '}
            {formatKg(totalKg)} KG
          </Text>
        </View>
      </View>

      <View style={styles.materialsBox}>
        {request.materials.map((item) => (
          <View key={item.id} style={styles.materialRow}>
            <View style={styles.materialInfo}>
              <Text style={styles.materialCode}>{item.material.code}</Text>
              <Text style={styles.materialName} numberOfLines={1}>
                {item.material.name}
              </Text>
            </View>
            <Text style={styles.materialQty}>{formatKg(item.quantityKg)} KG</Text>
          </View>
        ))}
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.dateText}>
          Solicitada por {request.requestedBy.name} · {formatDate(request.createdAt)}
        </Text>
        {pending && (
          <Pressable
            style={({ pressed }) => [
              styles.approveButton,
              pressed && { opacity: 0.8 },
              isProcessing && { opacity: 0.6 },
            ]}
            onPress={() => onApprove(request.id)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color={colors.background} size="small" />
            ) : (
              <Text style={styles.approveButtonText}>Aprobar y despachar</Text>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function RequestsScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const [requests, setRequests] = useState<ProductionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setError(null);
    try {
      const data = await productionRequestsApi.getAll();
      setRequests(data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    loadRequests().finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [loadRequests]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadRequests();
    setIsRefreshing(false);
  }, [loadRequests]);

  const handleApprove = (id: string) => {
    const request = requests.find((r) => r.id === id);
    if (!request) return;

    Alert.alert(
      'Aprobar y despachar',
      `¿Confirmas el despacho de los materiales de la orden ${request.orderCode}?\nSe descontará del inventario el total solicitado.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprobar',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(id);
            setError(null);
            try {
              await productionRequestsApi.approve(id);
              await loadRequests();
              Alert.alert('Despacho registrado', `La orden ${request.orderCode} fue aprobada y los materiales fueron descontados del inventario.`);
            } catch (err) {
              setError(getErrorMessage(err));
            } finally {
              setProcessingId(null);
            }
          },
        },
      ],
    );
  };

  const pendingCount = requests.filter((r) => r.status === 'PENDIENTE').length;

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyTitle}>Sin solicitudes</Text>
        <Text style={styles.emptyText}>
          No hay solicitudes de materia prima registradas por producción.
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {!isLoading && !error && requests.length > 0 && (
        <View style={[styles.summaryRow, { paddingTop: insets.top + spacing.sm }]}>
          <Text style={styles.summaryText}>
            {requests.length} {requests.length === 1 ? 'solicitud' : 'solicitudes'}
          </Text>
          {pendingCount > 0 && (
            <Text style={[styles.summaryCount, { color: colors.warning }]}>
              {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
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
          <Text style={styles.loadingText}>Cargando solicitudes...</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + spacing.xl },
          ]}
          renderItem={({ item }) => (
            <RequestCard
              request={item}
              onApprove={handleApprove}
              isProcessing={processingId === item.id}
            />
          )}
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
    color: colors.warning,
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
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardTitleWrap: {
    flex: 1,
  },
  orderCode: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  targetProduct: {
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
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  materialsBox: {
    marginTop: spacing.md,
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  materialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  materialInfo: {
    flex: 1,
  },
  materialCode: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  materialName: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  materialQty: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  cardFooter: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  dateText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  approveButton: {
    backgroundColor: colors.success,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  approveButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '700',
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
