/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        neon: {
          purple: "#7A5FFF",
          blue: "#01CDFA",
          pink: "#FF4DDE"
        },
        bg: {
          dark: "#0b0f1a",
          card: "#0f1526"
        }
      },
      boxShadow: {
        neon: "0 0 10px rgba(122,95,255,0.8), 0 0 20px rgba(1,205,250,0.6)"
      }
    }
  },
  plugins: []
};


