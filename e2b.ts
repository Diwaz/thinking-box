import { defaultBuildLogger, Template, waitForPort } from "@e2b/code-interpreter";

const template = Template().
fromNodeImage("20")
.aptInstall(["curl"])
.setWorkdir("/home/user")
.runCmd("npx create vite@latest . -- --template react && \
    npm install")
.runCmd("echo import { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react'\n\nexport default defineConfig({\n  plugins: [react()],\n  server: {\n    host: true, allowedHosts: true}\n})")
.setStartCmd("npm run dev >> log.txt 2>&1 ",waitForPort(5173));

async function main() {
  await Template.build(template, {
    alias: "thinking-instance",
    cpuCount: 1,
    memoryMB: 1024,
    onBuildLogs: defaultBuildLogger(),
  });
}

main().catch(console.error);