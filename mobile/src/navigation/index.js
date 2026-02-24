import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text, ActivityIndicator, View } from 'react-native';

import { useApp } from '../context/AppContext';

// Screens
import AuthScreen from '../screens/AuthScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ChatScreen from '../screens/ChatScreen';
import MealPlanScreen from '../screens/MealPlanScreen';
import RecipeDetailScreen from '../screens/RecipeDetailScreen';
import RecipeGeneratorScreen from '../screens/RecipeGeneratorScreen';
import SavedRecipesScreen from '../screens/SavedRecipesScreen';
import FoodLogScreen from '../screens/FoodLogScreen';
import FoodSearchScreen from '../screens/FoodSearchScreen';
import BarcodeScreen from '../screens/BarcodeScreen';
import GroceryScreen from '../screens/GroceryScreen';
import ProgressScreen from '../screens/ProgressScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function TabIcon({ name, focused, color }) {
  const icons = {
    Dashboard: focused ? '🏠' : '🏠',
    Chat: focused ? '💬' : '💬',
    Meals: focused ? '🍽️' : '🍽️',
    Log: focused ? '📝' : '📝',
    Progress: focused ? '📊' : '📊',
  };
  return <Text style={{ fontSize: 20 }}>{icons[name] || '●'}</Text>;
}

function MealsStack({ theme }) {
  return (
    <Stack.Navigator screenOptions={{
      headerStyle: { backgroundColor: theme.card },
      headerTintColor: theme.text,
      headerTitleStyle: { fontWeight: '700' },
    }}>
      <Stack.Screen name="MealPlan" component={MealPlanScreen} options={{ title: 'Meal Plan' }} />
      <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} options={{ title: 'Recipe' }} />
      <Stack.Screen name="RecipeGenerator" component={RecipeGeneratorScreen} options={{ title: 'AI Chef' }} />
      <Stack.Screen name="SavedRecipes" component={SavedRecipesScreen} options={{ title: 'My Recipes' }} />
    </Stack.Navigator>
  );
}

function LogStack({ theme }) {
  return (
    <Stack.Navigator screenOptions={{
      headerStyle: { backgroundColor: theme.card },
      headerTintColor: theme.text,
      headerTitleStyle: { fontWeight: '700' },
    }}>
      <Stack.Screen name="FoodLog" component={FoodLogScreen} options={{ title: 'Food Log' }} />
      <Stack.Screen name="FoodSearch" component={FoodSearchScreen} options={{ title: 'Search Food' }} />
      <Stack.Screen name="Barcode" component={BarcodeScreen} options={{ title: 'Scan Barcode' }} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const { theme } = useApp();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: theme.card },
        headerTintColor: theme.text,
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarIcon: ({ focused, color }) => (
          <TabIcon name={route.name} focused={focused} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Today' }} />
      <Tab.Screen name="Chat" component={ChatScreen} options={{ title: 'Nutritionist' }} />
      <Tab.Screen name="Meals" options={{ title: 'Meal Plan', headerShown: false }}>
        {() => <MealsStack theme={theme} />}
      </Tab.Screen>
      <Tab.Screen name="Log" options={{ title: 'Food Log', headerShown: false }}>
        {() => <LogStack theme={theme} />}
      </Tab.Screen>
      <Tab.Screen name="Progress" component={ProgressScreen} options={{ title: 'Progress' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { session, profile, loading, theme } = useApp();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg }}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>🥦</Text>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : !profile ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{
                headerShown: true,
                title: 'Settings',
                headerStyle: { backgroundColor: theme.card },
                headerTintColor: theme.text,
                presentation: 'modal',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
