const React = require('react');
const {render, screen, waitFor, renderHook, act, cleanup} = require('@testing-library/react');
const {MemoryRouter} = require('react-router-dom');

let mockAuthCallback;
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth, callback) => { mockAuthCallback = callback; return () => {}; },
}));
const mockAuth = {};
const mockInvitations = {};
const mockServices = {
  auth: {getAuth: jest.fn(), setActiveGroup: jest.fn(), setActiveCampaign: jest.fn()},
  user: {getUserProfile: jest.fn(), getGroupUserProfile: jest.fn()},
  group: {getGroups: jest.fn()},
  campaign: {getCampaigns: jest.fn()},
};
jest.mock('core/services/firebase', () => ({__esModule: true, default: mockServices}));
jest.mock('features/user-management/auth/hooks/useAuth', () => ({useAuth: () => mockAuth}));
jest.mock('features/user-management/groups/hooks/useInvitations', () => ({useInvitations: () => mockInvitations}));
const EmailLinkPage = require('features/user-management/auth/pages/EmailLinkPage').default;
const {FirebaseProvider, useFirebaseContext} = require('features/user-management/auth/context/FirebaseContext');

function page(query, pending = {email: 'new@example.test', rememberMe: false}) {
  Object.assign(mockAuth, {
    isSignInLink: () => true,
    getPendingEmailSignIn: () => pending,
    completeSignInLink: jest.fn().mockResolvedValue({user: {uid: 'new-user'}, isNewUser: true}),
    deleteFreshAccount: jest.fn().mockResolvedValue(undefined),
    reloadUserContext: jest.fn().mockResolvedValue(undefined),
    lookUpDeviceSignIn: jest.fn().mockResolvedValue('new@example.test'),
    approveDeviceSignIn: jest.fn().mockResolvedValue('123456'),
  });
  return () => render(React.createElement(MemoryRouter, {initialEntries: [`/auth/link${query}`]}, React.createElement(EmailLinkPage)));
}
afterEach(() => {cleanup(); jest.clearAllMocks();});

test('a lost response after a successful invitation commit causes Auth-account cleanup', async () => {
  const mount = page('?groupId=g1&token=token1&username=NewUser');
  let committed = false;
  mockInvitations.joinGroupWithToken = jest.fn(async () => {
    committed = true; // Fault model: server committed, callable response never reached client.
    throw Object.assign(new Error('Response lost after commit'), {code: 'functions/unavailable'});
  });
  mount();
  await waitFor(() => expect(mockAuth.deleteFreshAccount).toHaveBeenCalledTimes(1));
  expect(committed).toBe(true);
  expect(screen.getByRole('alert')).toHaveTextContent('Response lost after commit');
});

test('unrelated pending email prevents cross-device approval and offers no email correction', async () => {
  const mount = page('?device=laptop-request', {email: 'stale@example.test', rememberMe: true});
  mockAuth.completeSignInLink.mockRejectedValue(Object.assign(new Error('Wrong address'), {code: 'auth/invalid-email'}));
  mockInvitations.joinGroupWithToken = jest.fn();
  mount();
  await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  expect(mockAuth.completeSignInLink).toHaveBeenCalledWith('stale@example.test', window.location.href, true);
  expect(mockAuth.lookUpDeviceSignIn).not.toHaveBeenCalled();
  expect(mockAuth.approveDeviceSignIn).not.toHaveBeenCalled();
  expect(screen.queryByRole('textbox')).toBeNull();
});

test('an old auth callback repopulates private profile and group context after signout', async () => {
  let resolveProfile;
  const pendingProfile = new Promise(resolve => {resolveProfile = resolve;});
  mockServices.user.getUserProfile.mockReturnValue(pendingProfile);
  mockServices.user.getGroupUserProfile.mockResolvedValue({userId: 'old-user', username: 'OldUser', role: 'admin', activeCampaignId: 'c1'});
  mockServices.group.getGroups.mockResolvedValue([{id: 'g1', name: 'Old group'}]);
  mockServices.campaign.getCampaigns.mockResolvedValue([{id: 'c1', groupId: 'g1', name: 'Old campaign'}]);
  const wrapper = ({children}) => React.createElement(FirebaseProvider, null, children);
  const {result} = renderHook(() => useFirebaseContext(), {wrapper});
  let oldLoad;
  act(() => {oldLoad = mockAuthCallback({uid: 'old-user'});});
  await act(async () => {await mockAuthCallback(null);});
  expect(result.current.user).toBeNull();
  expect(result.current.userProfile).toBeNull();
  await act(async () => {
    resolveProfile({id: 'old-user', groups: ['g1'], activeGroupId: 'g1'});
    await oldLoad;
  });
  expect(result.current.user).toBeNull();
  expect(result.current.userProfile.id).toBe('old-user');
  expect(result.current.activeGroupId).toBe('g1');
  expect(result.current.activeGroupUserProfile.userId).toBe('old-user');
  expect(result.current.activeCampaignId).toBe('c1');
});
