import readline from "readline";
import { Sandbox } from "@e2b/code-interpreter";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  console.log(" Creating E2B sandbox...");
  const sandbox = await Sandbox.create("zcxo3nr01udjamtzcdn4");

  const host = sandbox.getHost(5555);
  console.log(`Sandbox ready at: https://${host}\n`);

  console.log("Options:");
  console.log(" 1  Write a file");
  console.log(" 2  Run a command");
  console.log(" 3  Exit\n");

  while (true) {
    const choice = await ask("Choose option (1=write, 2=cmd, 3=exit): ");

    if (choice === "1") {
      const path = await ask("Enter file path (e.g. /home/user/test.js): ");
      const content = await ask("Enter file content: ");
      try {
        // await sandbox.files.mkdir(path.split("/").slice(0, -1).join("/"), { recursive: true });
        await sandbox.files.write(path, content);
        console.log(`File written successfully at ${path}\n`);
      } catch (err) {
        console.error(" Error writing file:", err.message);
      }
    }

    else if (choice === "2") {
      const cmd = await ask("Enter command to run: ");
      try {
        const result = await sandbox.commands.run(cmd);
        console.log(" STDOUT:\n", result.stdout || "(empty)");
        console.error("️ STDERR:\n", result.stderr || "(empty)");
        console.log("");
      } catch (err) {
        console.error(" Error running command:", err.message);
      }
    }

    else if (choice === "3") {
      console.log(" Exiting...");
      break;
    }

    else {
      console.log(" Invalid option. Choose 1, 2, or 3.");
    }
  }

  rl.close();
  await sandbox.close();
}

main().catch(console.error);
