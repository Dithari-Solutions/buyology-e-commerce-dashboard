import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiBaseUrl = env.VITE_API_BASE_URL ?? "";

  return {
    plugins: [
      react(),
      svgr({
        svgrOptions: {
          icon: true,
          exportType: "named",
          namedExport: "ReactComponent",
        },
      }),
    ],
    server: {
      proxy: {
        // Proxy /api requests to the backend — avoids CORS in development
        "/api": {
          target: apiBaseUrl,
          changeOrigin: true,
          secure: true,
        },
        // Proxy /story/<uuid>/... asset paths (thumbnails, media)
        // Uses regex to avoid matching the /stories React route
        "^/story/": {
          target: apiBaseUrl,
          changeOrigin: true,
          secure: true,
        },
        // Proxy /product/<uuid>/... asset paths (images, media)
        // Uses regex to avoid matching the /products React route
        "^/product/": {
          target: apiBaseUrl,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  };
});
