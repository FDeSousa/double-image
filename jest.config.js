module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.vue$': '@vue/vue3-jest',
    '^.+\\.jsx?$': 'babel-jest', // Handles .js and .jsx files
  },
  moduleFileExtensions: ['vue', 'js', 'json', 'jsx', 'ts', 'tsx', 'node'],
  testMatch: [ // Specifies where to find test files
    '**/tests/unit/**/*.spec.[jt]s?(x)',
    '**/__tests__/*.[jt]s?(x)'
  ],
  // Optional: If you have path aliases in vue.config.js (e.g., '@/*'), map them here
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^canvas$': '<rootDir>/tests/__mocks__/canvas.js',
  },
  testEnvironmentOptions: {
    // "node-addons" was deliberately omitted: when present, jsdom tries to load
    // the native 'canvas' package as a CanvasElement implementation. The native
    // binary may not be available in all CI environments. Instead, the canvas
    // bindings are patched (node_modules/canvas/lib/bindings.js) to degrade
    // gracefully, and tests that need canvas use jest's document.createElement mock.
    customExportConditions: ["node"],
  },
};
