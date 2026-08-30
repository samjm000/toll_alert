import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from './types';
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { UlezIntroScreen } from '../screens/onboarding/UlezIntroScreen';
import { HowItWorksScreen } from '../screens/onboarding/HowItWorksScreen';
import { DisclaimerScreen } from '../screens/onboarding/DisclaimerScreen';
import { PermissionsScreen } from '../screens/onboarding/PermissionsScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="UlezIntro" component={UlezIntroScreen} />
      <Stack.Screen name="HowItWorks" component={HowItWorksScreen} />
      <Stack.Screen name="Disclaimer" component={DisclaimerScreen} />
      <Stack.Screen name="Permissions" component={PermissionsScreen} />
    </Stack.Navigator>
  );
}
