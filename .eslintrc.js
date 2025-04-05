module.exports = {
  parser: "@typescript-eslint/parser",
  extends: [
    "eslint:recommended",
    "plugin:import/recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  settings: {
    "import/resolver": {
      alias: {
        map: [
          ["@config", "./src/config"],
          ["@routes", "./src/routes"],
          ["@utils", "./src/utils"],
          ["@libs", "./src/lib"],
          ["@schemas", "./src/schemas"],
          ["@root", "./src"],
        ],
        extensions: [".ts", ".js", ".jsx", ".json"],
      },
    },
  },
  plugins: ["import", "@typescript-eslint"],
};
