import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ChatScreen } from './src/screens/ChatScreen';
import { ModelScreen } from './src/screens/ModelScreen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

import { LlamaProvider } from './src/context/LlamaContext';

const Stack = createStackNavigator();

const App = () => {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <LlamaProvider>
          <NavigationContainer>
            <Stack.Navigator 
              initialRouteName="Chat"
              screenOptions={{
                headerShown: false,
              }}
            >
              <Stack.Screen name="Chat" component={ChatScreen} />
              <Stack.Screen 
                name="Models" 
                component={ModelScreen} 
                options={{ 
                  headerShown: true,
                  title: 'Settings',
                  headerBackTitle: 'Chat'
                }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </LlamaProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default App;
