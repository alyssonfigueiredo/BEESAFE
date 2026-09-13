const { colors, fonts } = require("./src/theme/tokens");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors,
      fontFamily: {
        wordmark: [fonts.wordmark],
        display: [fonts.display],
        heading: [fonts.heading],
        body: [fonts.body],
        "body-medium": [fonts.bodyMedium],
        "body-bold": [fonts.bodyBold],
      },
    },
  },
  plugins: [],
};
