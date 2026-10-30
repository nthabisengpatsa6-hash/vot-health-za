import { rolldown } from "rolldown";
import { fileURLToPath } from "node:url";

// Vite's installed bundler compiles JSX in memory. React stays external so
// hooks and server rendering share the same instance. No test build files.
export async function loadComponent(path) {
  const bundle = await rolldown({
    input: fileURLToPath(new URL(path, import.meta.url)), platform: "node",
    transform: { jsx: { runtime: "automatic" } },
    plugins: [{ name: "test-react", resolveId(source) {
      if (source === "react" || source.startsWith("react/")) return { id: import.meta.resolve(source), external: true };
    } }],
  });
  try {
    const { output } = await bundle.generate({ format: "esm" });
    return await import(`data:text/javascript;base64,${Buffer.from(output[0].code).toString("base64")}`);
  } finally { await bundle.close(); }
}
