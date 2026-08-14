import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
    "./src/features/**/*.{ts,tsx}",
  ],
  theme: {
    screens: {
      // Mirrors ResponsiveHelper breakpoints from the Flutter app
      sm: "0px",       // mobile: < 600px
      md: "600px",     // tablet: < 800px
      lg: "800px",     // desktop: < 1200px
      xl: "1200px",
      "2xl": "1600px",  // largeDesktop: >= 1600px
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // VAT status thresholds — mirrors AppConstants
        status: {
          safe: "#16A34A",
          warning: "#D97706",
          exceeded: "#DC2626",
        },
        // Brand palette — project theme
        brand: {
          green: "#81c06c",
          lime: "#93c145",
          navy: "#29378c",
          skyLight: "#98c6e5",
          tealGreen: "#63bb8a",
          blue: "#2666ac",
          paleMint: "#dbede2",
          teal: "#2db0b6",
          sky: "#279dd7",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
