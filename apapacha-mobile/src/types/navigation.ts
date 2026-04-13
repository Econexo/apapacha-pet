export type RootStackParamList = {
  Login: undefined;
  ClientVerification: undefined;
  MainTabs: undefined;
  SearchModal: undefined;
  SpaceDetail: { id: string };
  VisiterDetail: { id: string };
  Checkout: { id: string; type: 'space' | 'visiter' };
  CheckIn: { bookingId: string };
  ChatDetail: { id: string };
  AddPetModal: undefined;
  HostOnboarding: undefined;
  TrustAndSafety: undefined;
  HostDashboard: undefined;
};
