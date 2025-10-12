import { Sandbox } from '@e2b/code-interpreter'

const viteScript = `
  npm create vite@latest vite-app --y
  cd vite-app
  npm install
  npm run build
  npm install serve --save-dev
  npx serve -s dist -l 5555
`;

const sandbox = await Sandbox.create({
  timeoutMs: 120_000,
})

// console.log("Vite setup logs:", execution.logs);
const host = sandbox.getHost(5555)
console.log(`https://${host}`)
await sandbox.files.write(
  'run-vite.sh',
  viteScript,
);
// You need to always pass a port number to get the host
await sandbox.commands.run(
  'sh run-vite.sh',
);


