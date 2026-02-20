/**
 * GERVIFRAIS Driver App — Root Component
 * AGENT-APP-DRIVER
 *
 * Sets up:
 *   - Redux Provider (store)
 *   - react-navigation NavigationContainer
 *   - Bottom tab bar: Home, Profile
 *   - Stack navigator within HomeTab
 */

import React, { useEffect } from 'react';
import { StatusBar, Text, useColorScheme } from 'react-native';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { store } from './redux/store';
import type { AppDispatch, RootState } from './redux/store';
import type { HomeStackParamList, RootTabParamList } from './types/navigation';
import { loadCachedDriver } from './redux/driversSlice';
import { loadCachedDeliveries, fetchDeliveries } from './redux/deliveriesSlice';
import { loadCachedRoute, fetchRoute } from './redux/routeSlice';
import { initOfflineService } from './services/offlineService';
import { postDeliveryEvent } from './services/api';
import { uploadProofPhotos } from './services/s3Service';
import type { QueuedDeliveryEvent, QueuedPhotoUpload } from './services/offlineService';

import HomeScreen from './screens/HomeScreen';
import DeliveryDetailsScreen from './screens/DeliveryDetailsScreen';
import ArrivedScreen from './screens/ArrivedScreen';
import PhotoMarchandiseScreen from './screens/PhotoMarchandiseScreen';
import PhotoBLScreen from './screens/PhotoBLScreen';
import ConfirmationScreen from './screens/ConfirmationScreen';
import ProblemScreen from './screens/ProblemScreen';
import ProfileScreen from './screens/ProfileScreen';

import {
  PRIMARY, BG_DARK, BG_DARK_CARD, BG_LIGHT, BG_LIGHT_CARD, TEXT_MUTED,
} from './utils/colors';

const Stack = createNativeStackNavigator<HomeStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

function HomeStack() {
  const colorScheme = useColorScheme();
  const bgColor = colorScheme === 'dark' ? BG_DARK : BG_LIGHT;
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: bgColor }, animation: 'slide_from_right' }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="DeliveryDetails" component={DeliveryDetailsScreen} />
      <Stack.Screen name="Arrived" component={ArrivedScreen} />
      <Stack.Screen name="PhotoMarchandise" component={PhotoMarchandiseScreen} />
      <Stack.Screen name="PhotoBL" component={PhotoBLScreen} />
      <Stack.Screen name="Confirmation" component={ConfirmationScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="Problem" component={ProblemScreen} options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
    </Stack.Navigator>
  );
}

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  return <Text style={{ fontSize: 22, opacity: color === TEXT_MUTED ? 0.5 : 1 }}>{emoji}</Text>;
}

function AppTabs() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: isDark ? BG_DARK_CARD : BG_LIGHT_CARD, borderTopColor: isDark ? '#334155' : '#E2E8F0', height: 60, paddingBottom: 8 },
        tabBarActiveTintColor: PRIMARY,
        tabBarInactiveTintColor: TEXT_MUTED,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tab.Screen name="HomeTab" component={HomeStack} options={{ title: 'Tournée', tabBarIcon: ({ color }) => <TabIcon emoji="🚚" color={color} /> }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Profil', tabBarIcon: ({ color }) => <TabIcon emoji="👤" color={color} /> }} />
    </Tab.Navigator>
  );
}

function AppBootstrap() {
  const dispatch = useDispatch<AppDispatch>();
  const { current: driver } = useSelector((s: RootState) => s.driver);

  useEffect(() => {
    void (async () => {
      await dispatch(loadCachedDriver());
      await dispatch(loadCachedRoute());
      await dispatch(loadCachedDeliveries());
    })();
  }, [dispatch]);

  useEffect(() => {
    if (!driver?.id) return;
    void (async () => {
      try {
        const routeResult = await dispatch(fetchRoute(driver.id)).unwrap();
        if (routeResult?.id) {
          await dispatch(fetchDeliveries(routeResult.id));
        }
      } catch { /* offline */ }
    })();
  }, [dispatch, driver?.id]);

  useEffect(() => {
    const syncEvent = async (event: QueuedDeliveryEvent) => {
      await postDeliveryEvent(event.deliveryId, event.eventType, {
        driver_id: event.driverId,
        route_id: event.routeId,
        latitude: event.latitude,
        longitude: event.longitude,
        notes: event.notes,
      });
    };
    const syncPhoto = async (photo: QueuedPhotoUpload): Promise<string> => {
      const result = await uploadProofPhotos(photo.deliveryId, photo.uri, photo.uri);
      return photo.type === 'marchandise' ? result.marchandise_url : result.bl_url;
    };
    initOfflineService(syncEvent, syncPhoto);
  }, []);

  return null;
}

export default function App() {
  const colorScheme = useColorScheme();
  const navTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const theme = {
    ...navTheme,
    colors: { ...navTheme.colors, background: colorScheme === 'dark' ? BG_DARK : BG_LIGHT, card: colorScheme === 'dark' ? BG_DARK_CARD : BG_LIGHT_CARD, primary: PRIMARY },
  };
  return (
    <Provider store={store}>
      <NavigationContainer theme={theme}>
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colorScheme === 'dark' ? BG_DARK : BG_LIGHT} />
        <AppBootstrap />
        <AppTabs />
      </NavigationContainer>
    </Provider>
  );
}
