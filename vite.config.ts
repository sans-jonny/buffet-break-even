import {defineConfig} from "vite";
import uni from "@dcloudio/vite-plugin-uni";
import {fileURLToPath} from "node:url";
import AutoImport from "unplugin-auto-import/vite";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        uni(),
        AutoImport({
            imports: [{"@/ui/useRequired": ["useRequired"]}],
            dts: false,
        }),
        {
            name: "project-source-alias",
            enforce: "post",
            // uni installs its own @ alias for UNI_INPUT_DIR; keep ours at src/.
            config: () => ({
                resolve: {
                    alias: [{find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url))}],
                },
            }),
        },
    ],
});
