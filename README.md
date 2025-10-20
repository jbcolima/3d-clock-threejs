# 3D Clock (Electron + Three.js)

This small app shows the current date and time as 3D text using Three.js inside an Electron window.

Run locally:

1. Install dependencies:

```powershell
npm install
```

2. Start the app:

```powershell
npm start
```

Notes:
- This project bundles a minimal font JSON in `fonts/helvetiker_regular.typeface.json`. For better typography, replace it with the official `helvetiker_regular.typeface.json` from three.js examples.
- If you see CORS / module loading errors, ensure you're on a recent Node/Electron and that scripts are run as modules (we use `type="module"` in `index.html`).
