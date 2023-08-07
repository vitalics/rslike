/* eslint-disable license-header/header */
/* eslint-env node */
module.exports = {
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'license-header'],
  root: true,
  rules: {
    "license-header/header": ["error", "./LICENSE"]
  }
};
