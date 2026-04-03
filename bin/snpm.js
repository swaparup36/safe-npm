#!/usr/bin/env node

import { install } from "../src/commands/install.js";

const command = process.argv[2];

if (command === "install") {
  if (process.argv.length == 3) {
    install();
  } else {
    // support install specific package
    const packages = process.argv.slice(3);
    install(packages);
  }
} else {
  console.log("Unknown command");
}