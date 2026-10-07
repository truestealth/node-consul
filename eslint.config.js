import javascript from "@eslint/js";
import globals from "globals";

export default [
  {
    files: [
      "lib/**/*.js",
      "lib/**/*.mjs",
      "test/**/*.js",
      "scripts/**/*.js",
      "eslint.config.js",
    ],
    languageOptions: {
      globals: globals.nodeBuiltin,
    },
    rules: {
      ...javascript.configs.recommended.rules,
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-prototype-builtins": "off",
      "no-unused-vars": ["error", { caughtErrors: "none" }],
      "no-use-before-define": "error",
    },
  },
  {
    files: ["test/**/*.js"],
    languageOptions: {
      globals: globals.mocha,
    },
  },
];
