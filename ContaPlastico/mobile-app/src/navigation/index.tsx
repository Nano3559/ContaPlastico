import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import {
  DarkTheme,
  NavigationContainer,
  type Theme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  Home,
  Package,
  AlertTriangle,
  User,
  ArrowLeftRight,
} from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import type { MainTabParamList, RootStackParamList } from '../types';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import StockScreen from '../screens/StockScreen';
import AlertsScreen from '../screens/AlertsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EntryScreen from '../screens/EntryScreen';
import RequestsScreen from '../screens/RequestsScreen';
import MovementsScreen from '../screens/MovementsScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const MainTabs = createBottomTabNavigator<MainTabParamList>();

const navTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    primary: colors.primary,
  },
};

function MainTabNavigator() {
  return (
    <MainTabs.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.textPrimary, fontWeight: '700' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <MainTabs.Screen
        name="Inicio"
        component={HomeScreen}
        options={{
          title: 'PlastControl',
          tabBarIcon: ({ color, size }) => (
            <Home size={size} color={color} />
          ),
        }}
      />
      <MainTabs.Screen
        name="Stock"
        component={StockScreen}
        options={{
          title: 'Inventario',
          tabBarIcon: ({ color, size }) => (
            <Package size={size} color={color} />
          ),
        }}
      />
      <MainTabs.Screen
        name="Movimientos"
        component={MovementsScreen}
        options={{
          title: 'Movimientos',
          tabBarIcon: ({ color, size }) => (
            <ArrowLeftRight size={size} color={color} />
          ),
        }}
      />
      <MainTabs.Screen
        name="Alertas"
        component={AlertsScreen}
        options={{
          title: 'Alertas',
          tabBarIcon: ({ color, size }) => (
            <AlertTriangle size={size} color={color} />
          ),
        }}
      />
      <MainTabs.Screen
        name="Perfil"
        component={ProfileScreen}
        options={{
          title: 'Mi Perfil',
          tabBarIcon: ({ color, size }) => (
            <User size={size} color={color} />
          ),
        }}
      />
    </MainTabs.Navigator>
  );
}

export function AppNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <RootStack.Screen name="Main" component={MainTabNavigator} />
            <RootStack.Screen
              name="EntryScreen"
              component={EntryScreen}
              options={{
                headerShown: true,
                headerStyle: { backgroundColor: colors.surface },
                headerTitleStyle: { color: colors.textPrimary, fontWeight: '700' },
                headerTintColor: colors.primary,
                title: 'Registrar Entrada',
              }}
            />
            <RootStack.Screen
              name="RequestsScreen"
              component={RequestsScreen}
              options={{
                headerShown: true,
                headerStyle: { backgroundColor: colors.surface },
                headerTitleStyle: { color: colors.textPrimary, fontWeight: '700' },
                headerTintColor: colors.primary,
                title: 'Solicitudes de Producción',
              }}
            />
          </>
        ) : (
          <RootStack.Screen name="Login" component={LoginScreen} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
