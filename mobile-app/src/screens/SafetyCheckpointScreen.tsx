import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AlertTriangle,
  Camera as CameraIcon,
  CheckCircle2,
  FlipHorizontal,
  Lock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Upload,
  XCircle,
} from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { visionApi, getErrorMessage } from '../services/api';
import { colors, radius, spacing } from '../theme';
import type { RootStackParamList, VerifyEppResult } from '../types';

type Navigation = NativeStackNavigationProp<RootStackParamList, 'SafetyCheckpoint'>;
type Route = RouteProp<RootStackParamList, 'SafetyCheckpoint'>;

export default function SafetyCheckpointScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const { user } = useAuth();

  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<VerifyEppResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Intentar cargar expo-camera condicionalmente para evitar crash si no está compilado nativamente
  let CameraComponent: any = null;
  let useCameraPermissionsHook: any = null;
  try {
    const ExpoCam = require('expo-camera');
    CameraComponent = ExpoCam.CameraView || ExpoCam.Camera;
    useCameraPermissionsHook = ExpoCam.useCameraPermissions;
  } catch (e) {
    // Expo Camera no disponible en este entorno
  }

  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissionsHook
    ? useCameraPermissionsHook()
    : [null, () => {}];

  const handleScanFromCamera = async () => {
    setErrorMsg(null);
    if (!cameraRef.current) {
      setErrorMsg('La cámara no está lista. Intenta de nuevo.');
      return;
    }

    try {
      setIsAnalyzing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true,
      });

      if (photo?.base64) {
        setCapturedImage(photo.uri || `data:image/jpeg;base64,${photo.base64}`);
        const verification = await visionApi.verifyEpp({
          imageBase64: photo.base64,
        });
        setResult(verification);
      } else {
        setErrorMsg('No se pudo capturar la foto en alta resolución.');
      }
    } catch (err) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePickFromGallery = async () => {
    setErrorMsg(null);
    try {
      const ImagePicker = require('expo-image-picker');
      const pickResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });

      if (!pickResult.canceled && pickResult.assets?.[0]?.base64) {
        const asset = pickResult.assets[0];
        setCapturedImage(asset.uri);
        setIsAnalyzing(true);
        const verification = await visionApi.verifyEpp({
          imageBase64: asset.base64,
        });
        setResult(verification);
      }
    } catch (err) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSimulateTestImage = async () => {
    setErrorMsg(null);
    setIsAnalyzing(true);
    try {
      const testUrl =
        'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800';
      setCapturedImage(testUrl);
      const verification = await visionApi.verifyEpp({
        imageUrl: testUrl,
      });
      setResult(verification);
    } catch (err) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleProceed = () => {
    const returnTo = route.params?.returnTo;
    if (returnTo) {
      navigation.replace(returnTo as any);
    } else {
      navigation.replace('Main');
    }
  };

  const handleReset = () => {
    setCapturedImage(null);
    setResult(null);
    setErrorMsg(null);
  };

  const isApproved = result?.accessGranted === true;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header Superior */}
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <View style={styles.badgeSafety}>
            <ShieldAlert size={14} color={colors.warning} />
            <Text style={styles.badgeSafetyText}>CONTROL DE SEGURIDAD INDUSTRIAL</Text>
          </View>
        </View>
        <Text style={styles.headerTitle}>Verificación de EPP</Text>
        <Text style={styles.headerSubtitle}>
          El operario debe portar obligatoriamente Casco, Lentes y Chaleco reflectivo para acceder al control de almacén.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Visor de Cámara / Imagen Capturada */}
        <View style={styles.viewfinderContainer}>
          {capturedImage ? (
            <View style={styles.imageWrapper}>
              <Image source={{ uri: capturedImage }} style={styles.previewImage} resizeMode="cover" />
              <Pressable style={styles.retakeFloatingButton} onPress={handleReset}>
                <RefreshCw size={16} color={colors.textPrimary} />
                <Text style={styles.retakeFloatingText}>Volver a escanear</Text>
              </Pressable>
            </View>
          ) : CameraComponent && permission?.granted ? (
            <View style={styles.cameraWrapper}>
              <CameraComponent
                ref={cameraRef}
                style={styles.camera}
                facing={facing}
              >
                {/* Guía de silueta para encuadre */}
                <View style={styles.silhouetteGuide}>
                  <View style={styles.guideHeadCircle} />
                  <View style={styles.guideShoulders} />
                  <Text style={styles.guideText}>Ubique rostro y hombros en el marco</Text>
                </View>
              </CameraComponent>

              <Pressable
                style={styles.flipButton}
                onPress={() => setFacing((prev) => (prev === 'front' ? 'back' : 'front'))}
              >
                <FlipHorizontal size={20} color={colors.textPrimary} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.noCameraFallback}>
              <CameraIcon size={44} color={colors.textMuted} />
              <Text style={styles.fallbackTitle}>Cámara no iniciada</Text>
              <Text style={styles.fallbackText}>
                {permission && !permission.granted
                  ? 'Se requieren permisos para usar la cámara.'
                  : 'Modo simulación o selección de archivo disponible.'}
              </Text>
              {permission && !permission.granted && (
                <Pressable style={styles.permissionButton} onPress={requestPermission}>
                  <Text style={styles.permissionButtonText}>Conceder Permisos</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Overlay de Carga */}
          {isAnalyzing && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Procesando con IA (Roboflow YOLO)...</Text>
              <Text style={styles.loadingSubtext}>Detectando casco, lentes y chaleco</Text>
            </View>
          )}
        </View>

        {/* Tarjetas de Implementos de Seguridad */}
        <View style={styles.checklistSection}>
          <Text style={styles.sectionHeading}>Implementos Requeridos</Text>

          <View style={styles.eppCardsGrid}>
            {/* Casco */}
            <View
              style={[
                styles.eppCard,
                result && (result.status.helmet ? styles.eppCardSuccess : styles.eppCardDanger),
              ]}
            >
              <View style={styles.eppCardIcon}>
                <Text style={styles.eppEmoji}>🪖</Text>
              </View>
              <View style={styles.eppCardInfo}>
                <Text style={styles.eppCardTitle}>Casco de Seguridad</Text>
                <Text style={styles.eppCardStatus}>
                  {result
                    ? result.status.helmet
                      ? `Verificado (${result.confidenceSummary.helmet || 0}%)`
                      : 'Faltante / No detectado'
                    : 'Pendiente de escaneo'}
                </Text>
              </View>
              <View style={styles.eppCardBadge}>
                {result ? (
                  result.status.helmet ? (
                    <CheckCircle2 size={20} color={colors.success} />
                  ) : (
                    <XCircle size={20} color={colors.danger} />
                  )
                ) : (
                  <View style={styles.statusDotIdle} />
                )}
              </View>
            </View>

            {/* Lentes */}
            <View
              style={[
                styles.eppCard,
                result && (result.status.goggles ? styles.eppCardSuccess : styles.eppCardDanger),
              ]}
            >
              <View style={styles.eppCardIcon}>
                <Text style={styles.eppEmoji}>👓</Text>
              </View>
              <View style={styles.eppCardInfo}>
                <Text style={styles.eppCardTitle}>Lentes de Protección</Text>
                <Text style={styles.eppCardStatus}>
                  {result
                    ? result.status.goggles
                      ? `Verificado (${result.confidenceSummary.goggles || 0}%)`
                      : 'Faltante / No detectado'
                    : 'Pendiente de escaneo'}
                </Text>
              </View>
              <View style={styles.eppCardBadge}>
                {result ? (
                  result.status.goggles ? (
                    <CheckCircle2 size={20} color={colors.success} />
                  ) : (
                    <XCircle size={20} color={colors.danger} />
                  )
                ) : (
                  <View style={styles.statusDotIdle} />
                )}
              </View>
            </View>

            {/* Chaleco */}
            <View
              style={[
                styles.eppCard,
                result && (result.status.vest ? styles.eppCardSuccess : styles.eppCardDanger),
              ]}
            >
              <View style={styles.eppCardIcon}>
                <Text style={styles.eppEmoji}>🦺</Text>
              </View>
              <View style={styles.eppCardInfo}>
                <Text style={styles.eppCardTitle}>Chaleco Reflectivo</Text>
                <Text style={styles.eppCardStatus}>
                  {result
                    ? result.status.vest
                      ? `Verificado (${result.confidenceSummary.vest || 0}%)`
                      : 'Faltante / No detectado'
                    : 'Pendiente de escaneo'}
                </Text>
              </View>
              <View style={styles.eppCardBadge}>
                {result ? (
                  result.status.vest ? (
                    <CheckCircle2 size={20} color={colors.success} />
                  ) : (
                    <XCircle size={20} color={colors.danger} />
                  )
                ) : (
                  <View style={styles.statusDotIdle} />
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Mensajes de Error y Resultado */}
        {errorMsg && (
          <View style={styles.alertError}>
            <AlertTriangle size={18} color={colors.danger} />
            <Text style={styles.alertErrorText}>{errorMsg}</Text>
          </View>
        )}

        {result && (
          <View style={isApproved ? styles.resultCardSuccess : styles.resultCardDanger}>
            {isApproved ? (
              <>
                <ShieldCheck size={28} color={colors.success} />
                <View style={styles.resultTextCol}>
                  <Text style={styles.resultSuccessTitle}>¡ACCESO CONCEDIDO!</Text>
                  <Text style={styles.resultSuccessBody}>
                    Todos los implementos reglamentarios han sido verificados satisfactoriamente.
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Lock size={28} color={colors.danger} />
                <View style={styles.resultTextCol}>
                  <Text style={styles.resultDangerTitle}>ACCESO BLOQUEADO</Text>
                  <Text style={styles.resultDangerBody}>
                    Faltan: {result.missing.join(', ')}. Por normativa de planta, colóquese el equipo para continuar.
                  </Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* Botonera de Acciones */}
        <View style={styles.actionsContainer}>
          {isApproved ? (
            <Pressable style={styles.proceedButton} onPress={handleProceed}>
              <Text style={styles.proceedButtonText}>Ingresar al Sistema de Almacén</Text>
            </Pressable>
          ) : (
            <>
              {CameraComponent && permission?.granted && !capturedImage ? (
                <Pressable
                  style={[styles.scanButton, isAnalyzing && styles.buttonDisabled]}
                  onPress={handleScanFromCamera}
                  disabled={isAnalyzing}
                >
                  <CameraIcon size={20} color={colors.background} />
                  <Text style={styles.scanButtonText}>
                    {isAnalyzing ? 'Analizando...' : 'Escanear con Cámara'}
                  </Text>
                </Pressable>
              ) : null}

              <View style={styles.secondaryButtonsRow}>
                <Pressable
                  style={[styles.secondaryButton, isAnalyzing && styles.buttonDisabled]}
                  onPress={handlePickFromGallery}
                  disabled={isAnalyzing}
                >
                  <Upload size={16} color={colors.primary} />
                  <Text style={styles.secondaryButtonText}>Subir Foto</Text>
                </Pressable>

                <Pressable
                  style={[styles.secondaryButton, isAnalyzing && styles.buttonDisabled]}
                  onPress={handleSimulateTestImage}
                  disabled={isAnalyzing}
                >
                  <RefreshCw size={16} color={colors.primary} />
                  <Text style={styles.secondaryButtonText}>Foto de Prueba</Text>
                </Pressable>
              </View>
            </>
          )}

          {/* Opción de anulación de emergencia para Administradores */}
          {user?.role === 'ADMIN' && !isApproved && (
            <Pressable
              style={styles.adminOverrideButton}
              onPress={() => {
                Alert.alert(
                  'Anulación de Supervisor',
                  'Como Administrador puedes autorizar el acceso manual en caso de contingencia. ¿Deseas anular el bloqueo?',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Autorizar Entrada', onPress: handleProceed },
                  ],
                );
              }}
            >
              <Text style={styles.adminOverrideText}>Anulación manual de Administrador</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  badgeSafety: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  badgeSafetyText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.warning,
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  viewfinderContainer: {
    width: '100%',
    height: 270,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
    position: 'relative',
  },
  cameraWrapper: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  silhouetteGuide: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 15, 29, 0.25)',
  },
  guideHeadCircle: {
    width: 100,
    height: 120,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'rgba(56, 189, 248, 0.6)',
    borderStyle: 'dashed',
  },
  guideShoulders: {
    width: 200,
    height: 50,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(56, 189, 248, 0.6)',
    borderStyle: 'dashed',
    marginTop: 6,
  },
  guideText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  flipButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrapper: {
    flex: 1,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  retakeFloatingButton: {
    position: 'absolute',
    bottom: spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retakeFloatingText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  noCameraFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  fallbackTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  fallbackText: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  permissionButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  permissionButtonText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: '700',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 15, 25, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loadingText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  loadingSubtext: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  checklistSection: {
    marginTop: spacing.lg,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  eppCardsGrid: {
    gap: spacing.sm,
  },
  eppCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eppCardSuccess: {
    borderColor: colors.success,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  eppCardDanger: {
    borderColor: colors.danger,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  eppCardIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  eppEmoji: {
    fontSize: 18,
  },
  eppCardInfo: {
    flex: 1,
  },
  eppCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  eppCardStatus: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  eppCardBadge: {
    marginLeft: spacing.sm,
  },
  statusDotIdle: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.textMuted,
  },
  alertError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderWidth: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  alertErrorText: {
    color: colors.danger,
    fontSize: 13,
    flex: 1,
  },
  resultCardSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: colors.success,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginTop: spacing.md,
  },
  resultSuccessTitle: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '800',
  },
  resultSuccessBody: {
    color: colors.textPrimary,
    fontSize: 12,
    marginTop: 2,
  },
  resultCardDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: colors.danger,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginTop: spacing.md,
  },
  resultDangerTitle: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '800',
  },
  resultDangerBody: {
    color: colors.textPrimary,
    fontSize: 12,
    marginTop: 2,
  },
  resultTextCol: {
    flex: 1,
  },
  actionsContainer: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.lg,
  },
  scanButtonText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '700',
  },
  proceedButton: {
    backgroundColor: colors.success,
    paddingVertical: 15,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  proceedButtonText: {
    color: '#022c22',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  adminOverrideButton: {
    marginTop: spacing.sm,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  adminOverrideText: {
    color: colors.textMuted,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
