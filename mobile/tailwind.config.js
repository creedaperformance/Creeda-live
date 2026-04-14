/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("nativewind/preset")],
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "../src/components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#04070A',
        'background-elevated': '#0A0A0E',
        'background-glass': 'rgba(10, 10, 14, 0.4)',
        saffron: '#FF5F1F',
        'saffron-light': '#FF8C5A',
        'chakra-neon': '#00E5FF',
        'chakra-glow': 'rgba(0, 229, 255, 0.5)',
        border: 'rgba(255, 255, 255, 0.04)',
        primary: {
          DEFAULT: '#ffffff',
          foreground: '#040404',
        },
        muted: {
          DEFAULT: 'rgba(255, 255, 255, 0.4)',
          foreground: 'rgba(255, 255, 255, 0.7)',
        },
      },
    },
  },
  plugins: [],
}
