# Development Environment Setup

This guide ensures consistent development environment setup across **Linux** and **macOS**.

---

## Prerequisites

### 1. Node.js (v22+)

The project uses Node.js 22. We recommend using a version manager for consistency:

#### Option A: nvm (Node Version Manager) - Recommended

**Linux:**
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell
source ~/.bashrc  # or ~/.zshrc

# Install Node.js 22 (reads from .nvmrc)
nvm install
nvm use
```

**macOS:**
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell
source ~/.zshrc  # or ~/.bash_profile

# Install Node.js 22 (reads from .nvmrc)
nvm install
nvm use
```

#### Option B: fnm (Fast Node Manager) - Alternative

**Linux:**
```bash
# Install fnm
curl -fsSL https://fnm.vercel.app/install | bash

# Reload shell
source ~/.bashrc  # or ~/.zshrc

# Install Node.js 22
fnm install 22
fnm use 22
```

**macOS (with Homebrew):**
```bash
# Install fnm
brew install fnm

# Add to shell config (~/.zshrc or ~/.bash_profile)
eval "$(fnm env --use-on-cd)"

# Install Node.js 22
fnm install 22
fnm use 22
```

#### Verify Installation

```bash
node --version  # Should show v22.x.x
npm --version   # Should show 10.x.x or higher
```

---

## 2. Project Setup

### Clone and Install

```bash
# Clone repository
git clone https://github.com/xrrocha/filer.git
cd filer

# Install dependencies
npm install
```

---

## 3. Playwright Browser Setup

Playwright requires browser binaries. Install them once per machine:

```bash
# Install Playwright browsers (Chromium, Firefox, WebKit)
npx playwright install

# Or install just Chromium (faster, used by default)
npx playwright install chromium
```

**Platform-Specific Notes:**

- **Linux**: May require additional system dependencies
  ```bash
  # Ubuntu/Debian
  npx playwright install-deps

  # Or manually install dependencies
  sudo apt-get install libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libxkbcommon0 libxcomposite1 \
    libxdamage1 libxfixes3 libxrandr2 libgbm1 \
    libpango-1.0-0 libcairo2 libasound2
  ```

- **macOS**: Usually works out of the box
  - If issues occur, ensure Xcode Command Line Tools are installed:
    ```bash
    xcode-select --install
    ```

---

## 4. Verify Setup

Run verification tests to ensure everything works:

```bash
# Build the project
npm run build

# Run all tests
npm run test:all:full
```

**Expected Output:**
```
✅ Unit tests passing (640 tests)
✅ Integration tests passing (680 tests)
✅ E2E tests passing (105 tests)
✅ Specialty tests passing (95 tests)
```

---

## 5. Editor Configuration

The project includes `.editorconfig` for consistent formatting across editors.

### Supported Editors

- **VSCode**: Install "EditorConfig for VS Code" extension
- **Vim/Neovim**: Install `editorconfig-vim` plugin
- **Emacs**: Built-in support (editorconfig-emacs)
- **IntelliJ/WebStorm**: Built-in support
- **Sublime Text**: Install "EditorConfig" package

---

## 6. Git Configuration

Ensure line endings are normalized (already configured in `.gitattributes`):

```bash
# Verify Git config
git config core.autocrlf  # Should be 'input' on Linux/macOS

# If not set, configure it
git config --global core.autocrlf input
```

---

## Development Workflow

### Common Commands

```bash
# Run development server (if applicable)
npm run dev

# Build for production
npm run build

# Run tests
npm test                       # Unit tests only
npm run test:navigator         # All Navigator tests
npm run test:all:full          # All tests (memimg + navigator)

# Run tests in watch mode
npm run test:watch
npm run test:navigator:unit:watch

# Run specific test types
npm run test:unit              # Unit tests
npm run test:integration       # Integration tests
npm run test:navigator:e2e     # E2E tests

# Generate coverage report
npm run test:coverage
npm run test:navigator:coverage

# Clean build artifacts
npm run clean
```

### Running Tests in Headed Mode (See Browser)

```bash
# Run Playwright tests with visible browser
npm run test:navigator:integration -- --headed
npm run test:navigator:e2e -- --headed

# Run Playwright UI mode (interactive)
npm run test:browser:ui
```

---

## Troubleshooting

### Issue: `npm install` fails

**Symptoms**: Errors during `npm install`

**Solutions**:
1. Check Node.js version: `node --version` (should be 22.x)
2. Clear npm cache: `npm cache clean --force`
3. Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
4. Ensure you have write permissions to the project directory

---

### Issue: Playwright tests fail with browser errors

**Symptoms**: "Browser not found" or "Failed to launch browser"

**Solutions**:
1. Install Playwright browsers: `npx playwright install`
2. **Linux only**: Install system dependencies: `npx playwright install-deps`
3. Check browser installation: `npx playwright install --dry-run`

---

### Issue: Test import errors (`Cannot find module`)

**Symptoms**: Import errors when running tests

**Solutions**:
1. Ensure project is built: `npm run build`
2. Check that `dist/` directory exists and contains compiled files
3. Re-run build if needed: `npm run clean && npm run build`

---

### Issue: Line ending errors (Git shows modified files you didn't change)

**Symptoms**: Git shows changes to files you didn't edit

**Solutions**:
1. Ensure `.gitattributes` is committed and pulled
2. Normalize line endings:
   ```bash
   # Remove cached files and re-add with normalized endings
   git rm --cached -r .
   git reset --hard
   ```
3. Verify Git config: `git config core.autocrlf` should be `input`

---

### Issue: TypeScript errors in editor but tests pass

**Symptoms**: Editor shows TypeScript errors but `npm run build` works

**Solutions**:
1. Restart TypeScript server in editor
2. **VSCode**: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"
3. Ensure editor is using workspace TypeScript version
4. Check `tsconfig.json` is not being overridden by editor settings

---

### Issue: Tests fail on one machine but pass on another

**Symptoms**: Tests pass on macOS but fail on Linux (or vice versa)

**Possible Causes**:
1. **Different Node.js versions**: Verify both machines use Node.js 22
   - Run `node --version` on both
   - Use `.nvmrc`: `nvm use` or `fnm use`

2. **Case-sensitive file systems**: Linux is case-sensitive, macOS is not by default
   - Check for filename case mismatches
   - TypeScript config has `forceConsistentCasingInFileNames: true` to catch this

3. **Line ending differences**: Ensure `.gitattributes` is applied
   - Normalize line endings (see above)

4. **Playwright browser versions**: Re-install browsers on both machines
   ```bash
   npx playwright install --force
   ```

---

## Platform-Specific Notes

### Linux

- **File system**: Case-sensitive (be precise with file names)
- **Playwright dependencies**: May require system libraries (`npx playwright install-deps`)
- **Permissions**: Ensure executable permissions on scripts if needed

### macOS

- **File system**: Case-insensitive by default (can cause issues)
- **Xcode CLI Tools**: Required for some native modules
- **Homebrew**: Recommended for package management

---

## CI/CD Notes

When setting up CI/CD (GitHub Actions, GitLab CI, etc.):

1. **Pin Node.js version**: Use Node.js 22 (reads from `.nvmrc`)
2. **Install Playwright browsers**: `npx playwright install --with-deps`
3. **Cache node_modules**: Speed up builds
4. **Run tests in headless mode**: Default behavior (no `--headed` flag)
5. **Set CI environment variable**: `CI=true npm run test:all:full`

---

## Additional Resources

- [Node.js Documentation](https://nodejs.org/docs/latest-v22.x/api/)
- [Playwright Documentation](https://playwright.dev/)
- [nvm Documentation](https://github.com/nvm-sh/nvm)
- [fnm Documentation](https://github.com/Schniz/fnm)
- [EditorConfig](https://editorconfig.org/)

---

## Quick Reference

| Task | Command |
|------|---------|
| Install dependencies | `npm install` |
| Build project | `npm run build` |
| Run all tests | `npm run test:all:full` |
| Run unit tests | `npm run test:navigator:unit` |
| Run integration tests | `npm run test:navigator:integration` |
| Run E2E tests | `npm run test:navigator:e2e` |
| Install Playwright browsers | `npx playwright install` |
| Clean build artifacts | `npm run clean` |
| Check Node.js version | `node --version` |
| Switch Node.js version | `nvm use` or `fnm use` |

---

**Last Updated**: December 2024

For issues not covered here, please check the [test/navigator/README.md](test/navigator/README.md) for detailed testing documentation.
