import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { useFonts } from 'expo-font';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from './src/theme';
import IOSTabBar from './src/components/IOSTabBar';
import './src/core/typography';

import DashboardScreen from './src/screens/DashboardScreen';
import DutyCalculatorScreen from './src/screens/DutyCalculatorScreen';
import LiteracyScreen from './src/screens/LiteracyScreen';
import TradeMatchScreen from './src/screens/TradeMatchScreen';
import TruckingScreen from './src/screens/TruckingScreen';
import PaymentScreen from './src/screens/PaymentScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CommandCentreScreen from './src/screens/CommandCentreScreen';
import LiveTrackingScreen from './src/screens/LiveTrackingScreen';
import TicketingScreen from './src/screens/TicketingScreen';
import CustomsScreen from './src/screens/CustomsScreen';
import EstimatesScreen from './src/screens/EstimatesScreen';
import WarehouseScreen from './src/screens/WarehouseScreen';
import SayItScreen from './src/screens/SayItScreen';
import MarketStatusScreen from './src/screens/MarketStatusScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function DashboardStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="DashboardHome"
        component={DashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Market"
        component={MarketStatusScreen}
        options={{ title: 'Market & News' }}
      />
    </Stack.Navigator>
  );
}

function TradeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="SayIt"
        component={SayItScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TradeList"
        component={TradeMatchScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Trucking"
        component={TruckingScreen}
        options={{ title: 'Trucks & Cargo' }}
      />
      <Stack.Screen
        name="Payment"
        component={PaymentScreen}
        options={{
          title: 'Secure Payment',
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: Colors.textOnPrimary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
    </Stack.Navigator>
  );
}

function OperationsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="CommandCentre"
        component={CommandCentreScreen}
        options={{ title: 'Command Centre' }}
      />
      <Stack.Screen
        name="LiveTracking"
        component={LiveTrackingScreen}
        options={{ title: 'Live Tracking' }}
      />
      <Stack.Screen
        name="Ticketing"
        component={TicketingScreen}
        options={{ title: 'Ticketing' }}
      />
      <Stack.Screen
        name="Customs"
        component={CustomsScreen}
        options={{ title: 'Customs Clearing' }}
      />
      <Stack.Screen
        name="Estimates"
        component={EstimatesScreen}
        options={{ title: 'Estimates' }}
      />
      <Stack.Screen
        name="Warehouse"
        component={WarehouseScreen}
        options={{ title: 'Warehousing' }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts(
    Platform.OS === 'ios' ? {} : { Inter: require('./assets/fonts/InterVariable.ttf') }
  );
  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" backgroundColor={Colors.primaryDark} />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerStyle: { backgroundColor: Colors.primary },
            headerTintColor: Colors.textOnPrimary,
            headerTitleStyle: { fontWeight: '700' },
          })}
          tabBar={(props: any) => <IOSTabBar {...props} />}
        >
          <Tab.Screen
            name="Dashboard"
            component={DashboardStack}
            options={{ title: 'Ushawama' }}
          />
          <Tab.Screen
            name="Duty"
            component={DutyCalculatorScreen}
            options={{ title: 'Duty Check' }}
          />
          <Tab.Screen
            name="Learn"
            component={LiteracyScreen}
            options={{ title: 'Learn to Read' }}
          />
          <Tab.Screen
            name="Trade"
            component={TradeStack}
            options={{ title: 'Marketplace' }}
          />
          <Tab.Screen
            name="Ops"
            component={OperationsStack}
            options={{ title: 'Command Centre' }}
          />
          <Tab.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ title: 'My Profile' }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
