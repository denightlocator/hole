// Capacitor config — wraps this website into a native iOS/Android app
// Docs: https://capacitorjs.com/docs/config
const config = {
  appId: 'com.example.hole',   // <-- change to your own (reverse-domain)
  appName: 'Hole',
  webDir: '.',                 // folder containing index.html (this repo root)
  server: {
    androidScheme: 'https',
  },
};

export default config;
