/**
 * Navigation type definitions
 * AGENT-APP-DRIVER
 */

import type { NavigatorScreenParams } from '@react-navigation/native';

export type HomeStackParamList = {
  Home: undefined;
  DeliveryDetails: { deliveryId: string };
  Arrived: { deliveryId: string; arrivedAt: string };
  PhotoMarchandise: { deliveryId: string };
  PhotoBL: { deliveryId: string };
  Confirmation: { deliveryId: string; durationSeconds: number };
  Problem: { deliveryId: string };
};

export type RootTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  ProfileTab: undefined;
};
