/** @type {import('jest').Config} */
const transformIgnorePatterns = [
  'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-svg|d3-.*|topojson-client)',
];

module.exports = {
  testTimeout: 60000,
  projects: [
    {
      displayName: 'app',
      preset: 'jest-expo/ios',
      testMatch: ['<rootDir>/src/**/*.test.ts?(x)'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
      transformIgnorePatterns,
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
    },
    {
      displayName: 'content',
      preset: 'jest-expo/node',
      testMatch: ['<rootDir>/tests/content/**/*.test.ts'],
      transformIgnorePatterns,
    },
    {
      displayName: 'db',
      preset: 'jest-expo/node',
      testMatch: ['<rootDir>/tests/db/**/*.test.ts'],
      globalSetup: '<rootDir>/tests/db/support/global-setup.ts',
      globalTeardown: '<rootDir>/tests/db/support/global-teardown.ts',
      transformIgnorePatterns,
    },
  ],
};
