// eslint.config.js
export default [
  {
    ignores: ['node_modules/**', '.git/**'],
  },
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        // Node.js globals
        process: 'readonly',
        console: 'readonly',
        module: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
    rules: {
      // Error prevention
      'no-undef': 'error',
      'no-unused-vars': 'warn',
      
      // Style consistency
      'indent': ['error', 2],
      'linebreak-style': ['error', 'unix'],
      'quotes': ['error', 'single', { 'allowTemplateLiterals': true }],
      'semi': ['error', 'always'],
      
      // Allow console statements (since this is a Node.js CLI app)
      'no-console': 'off',
    },
  },
]; 