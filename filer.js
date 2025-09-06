#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net

/**
 * A Deno script that creates a persistent, stateful JavaScript REPL that
 * operates on a predefined 'system' object.
 *
 * This script performs the following actions:
 * 1. Defines a top-level 'system' object that will hold all state.
 * 2. Loads a prelude of curated modules and functions into the 'system' object.
 * 3. Takes a command-line argument: the path to a script file.
 * 4. If the file exists, it reads and executes its content. All code within
 * this file is expected to manipulate the 'system' object (e.g., system.data = ...).
 * 5. It then starts an interactive REPL in the terminal.
 * 6. Any JavaScript code entered into the REPL is evaluated. This code should
 * also operate on the 'system' object.
 * 7. If the code executes successfully, it is appended to the script file.
 *
 * This creates a replayable history of manipulations on the 'system' object,
 * allowing its state to be restored on the next run.
 *
 * @usage
 * deno run --allow-read --allow-write --allow-net repl.js my_script_history.js
 */

import { setupPrelude } from "./prelude.js";

// --- 1. Define the single, persistent state object ---
const system = {};
globalThis.system = system;

// --- 2. Load the prelude of curated modules and helpers ---
setupPrelude(system);

/**
 * A self-contained async generator to read lines from a Deno reader (like Deno.stdin).
 * This replaces the dependency on deno.land/std/io/read_lines.ts.
 * @param {Deno.Reader} reader The reader to process.
 */
async function* iterateLines(reader) {
  const decoder = new TextDecoder();
  let buffer = "";
  for await (const chunk of reader.readable) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? ""; // The last part is either empty or an incomplete line.
    for (const line of lines) {
      yield line;
    }
  }
  // After the stream ends, flush any remaining text in the buffer.
  if (buffer.length > 0) {
    yield buffer;
  }
}

async function main() {
  // --- 3. Get the target file path from command-line arguments ---
  const filePath = Deno.args[0];
  if (!filePath) {
    console.error("Error: Please provide a file path as an argument.");
    console.error(
      "Usage: deno run --allow-read --allow-write repl.js <file_path>",
    );
    Deno.exit(1);
  }

  // --- 4. Read and evaluate the existing script to restore state ---
  try {
    const scriptContent = await Deno.readTextFile(filePath);
    if (scriptContent.trim()) {
      console.log(`--- Loading and executing state from: ${filePath} ---`);
      // The script content will modify the global 'system' object.
      eval(scriptContent);
      console.log(`--- State restored successfully ---\n`);
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.log(`File not found: ${filePath}. A new file will be created.`);
    } else {
      console.error(
        `Error loading initial script from ${filePath}:`,
        error.message,
      );
    }
  }

  // --- 5. Start the interactive REPL ---
  console.log("Persistent Deno REPL. Prelude loaded into the 'system' object.");
  console.log("Type 'system' to see available modules and functions. Type '.quit' to exit.");
  const encoder = new TextEncoder();

  await Deno.stdout.write(encoder.encode("> "));

  // Use our custom line iterator instead of the one from the standard library.
  for await (const line of iterateLines(Deno.stdin)) {
    const command = line.trim();

    if (command === ".quit") {
      break;
    }

    if (command === "") {
      await Deno.stdout.write(encoder.encode("> "));
      continue;
    }

    // --- 6. Evaluate the command and append to file on success ---
    try {
      const result = eval(command);

      if (result !== undefined) {
        // To inspect the system object, you can just type 'system'
        console.log(result);
      }

      // On success, append the command to the history file.
      await Deno.writeTextFile(filePath, command + "\n", { append: true });
    } catch (error) {
      console.error("Execution Error:", error.message);
    }

    await Deno.stdout.write(encoder.encode("> "));
  }

  console.log("\nExiting REPL. Goodbye!");
}

main().catch((err) => {
  console.error("A critical error occurred:", err);
  Deno.exit(1);
});


