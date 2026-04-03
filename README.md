# 🛡️ safe-npm

> npm install... but safe.

safe-npm is a lightweight CLI that protects you from **malicious npm packages** by inspecting lifecycle scripts *before* they run on your machine.

No more blindly trusting `npm install`.

---

## Why?

When you run:

```bash
npm install
```

you're not just installing dependencies, you're also executing arbitrary code from the internet.
Packages can run:
- preinstall
- install
- postinstall

And those scripts can:
- read your .env / SSH keys
- make network requests
- execute shell commands
- modify your project files

## What safe-npm does?

safe-npm sits between you and npm and makes the install process safe by default.

It blocks all lifecycle scripts from running automatically, inspects them in an isolated environment, highlights anything suspicious, and lets you decide whether they should be trusted.

If you approve a script, it’s then executed normally so your dependencies still work as expected - just without the risk of blind execution.

## Usage

Instead of:
```bash
npm install
```

Use:
```bash
snpm install
```

## Setup

```bash
git clone https://github.com/your-username/safe-npm
cd safe-npm
npm install
npm link
```

## Manual Tests
```bash
cd safe-npm/test-projects
```
Then cd into any projects on the directory. Then run:
```bash
snpm install
```


## What makes it useful
- prevents silent supply chain attacks
- gives visibility into what scripts actually do
- keeps your system safe by default
- still works with normal npm workflow

## Limitations (for now)
- Linux only (uses firejail)
- detection is basic (will improve)
- fresh installation of packages are still not protected