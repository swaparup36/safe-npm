#!/usr/bin/env node

import { install } from "../src/commands/install.js";

const command = process.argv[2];

if (command === "install") {
  install();
} else {
  console.log("Unknown command");
}