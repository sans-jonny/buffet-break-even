import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";
import { fileURLToPath } from "node:url";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    uni(),
    {
      name: "project-source-alias",
      enforce: "post",
      // uni installs its own @ alias for UNI_INPUT_DIR; keep ours at src/.
      config: () => ({
        resolve: {
          alias: [{ find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) }],
        },
      }),
    },
  ],
});
