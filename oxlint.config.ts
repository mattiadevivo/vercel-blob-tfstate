import { defineConfig } from 'oxlint';

export default defineConfig({
    categories: {
        correctness: 'error',
        style: 'warn',
        suspicious: 'warn',
    },
    rules: {
        'eslint/eqeqeq': 'error',
        'eslint/id-length': 'error',
        'eslint/no-await-in-loop': 'error',
        'eslint/no-magic-numbers': 'off',
        'eslint/no-shadow': 'error',
        'eslint/no-undefined': 'error',
        'eslint/no-unreachable': 'error',
        'eslint/no-unused-vars': 'error',
        'eslint/prefer-const': 'error',
        'eslint/require-await': 'error',
        'eslint/sort-imports': ['error', { ignoreDeclarationSort: true }],
        'eslint/sort-keys': 'error',
        'import/no-cycle': 'error',
        'unicorn/no-null': 'off',
    },
});
