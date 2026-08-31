/**
 * AsyncStorage is a native module, so importing anything that touches it throws
 * under Jest. The package ships an official in-memory mock for exactly this;
 * registering it here keeps individual tests from each having to repeat it.
 */
jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
