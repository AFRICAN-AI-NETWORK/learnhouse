import unusedImports from "eslint-plugin-unused-imports";
import nextConfig from "eslint-config-next";
import js from "@eslint/js";

const config = [
    js.configs.recommended,
    ...nextConfig,
    {
        plugins: {
            "unused-imports": unusedImports,
        },
        rules: {
            "react/no-unescaped-entities": "off",
            "@next/next/no-page-custom-font": "off",
            "@next/next/no-img-element": "off",
            "unused-imports/no-unused-imports": "warn",
            "no-unused-vars": "off",
            "no-undef": "off",
            "no-redeclare": "off",
            "no-console": "warn",
        },
    },
];

export default config;
