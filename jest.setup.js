// AsyncStorage in-memory mock
let mockAsyncStore = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key) => mockAsyncStore[key] ?? null),
  setItem: jest.fn(async (key, value) => { mockAsyncStore[key] = String(value); }),
  removeItem: jest.fn(async (key) => { delete mockAsyncStore[key]; }),
  multiRemove: jest.fn(async (keys) => { keys.forEach(key => { delete mockAsyncStore[key]; }); }),
  clear: jest.fn(async () => { mockAsyncStore = {}; }),
  getAllKeys: jest.fn(async () => Object.keys(mockAsyncStore)),
}));

// Expo module stubs
jest.mock('expo-web-browser', () => ({ openAuthSessionAsync: jest.fn() }));
jest.mock('expo-linking', () => ({ createURL: jest.fn(() => 'exp://localhost') }));
jest.mock('expo-image-picker', () => ({}));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  AntDesign: 'AntDesign',
}));
jest.mock('react-native-url-polyfill/auto', () => {});

beforeEach(() => {
  mockAsyncStore = {};
});
