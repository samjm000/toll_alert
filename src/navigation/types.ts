export type OnboardingStackParamList = {
  Welcome: undefined;
  UlezIntro: undefined;
  HowItWorks: undefined;
  Disclaimer: undefined;
  Permissions: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  CrossingDetail: { eventId: string };
  Subscription: undefined;
  Settings: undefined;
};
