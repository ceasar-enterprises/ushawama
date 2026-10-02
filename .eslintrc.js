// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: 'expo',
  ignorePatterns: ['/dist/*', '/node_modules/*', '/.expo/*'],
  overrides: [
    {
      // These run in Node (CommonJS), not in the React Native runtime, so they
      // need the Node globals the `expo` config does not declare.
      files: [
        'src/api/**/*.js',
        'src/core/**/*.js',
        'src/literacy/**/*.js',
        'tests/**/*.js',
        '*.config.js',
        '.eslintrc.js',
      ],
      env: { node: true },
      rules: {
        // Metro only inlines *static* process.env.EXPO_PUBLIC_* references, so
        // the expo config flags dynamic access. These files are server-side
        // only (required by src/api/server.js and the route modules) and run
        // under plain Node, where process.env[name] resolves normally. The one
        // bundle-side env access, src/voice/engine.ts, is static.
        'expo/no-dynamic-env-var': 'off',
      },
    },
  ],
};
