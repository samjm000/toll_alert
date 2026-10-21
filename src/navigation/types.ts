export type OnboardingStackParamList = {
  Welcome: undefined;
  AlertPreview: undefined;
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
  Diagnostics: undefined;
};
