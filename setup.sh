#!/bin/bash
# Filer Development Setup Script

set -e  # Exit on error

echo "🔧 Setting up Filer development environment..."
echo ""

# 1. Install npm dependencies
if [ ! -d "node_modules" ]; then
  echo "📦 Installing npm dependencies..."
  npm install
  echo "✅ Dependencies installed"
else
  echo "✅ Dependencies already installed"
fi

# 2. Initialize nested git repo in .local/ if not exists
if [ ! -d ".local/.git" ]; then
  echo "📚 Initializing .local/ git repository for session history..."
  cd .local
  git init
  git add -A
  git commit -m "Initial .local/ repository" || echo "Nothing to commit"
  cd ..
  echo "✅ .local/ git repo initialized"
else
  echo "✅ .local/ git repo already initialized"
fi

# 3. Create git hooks directory if needed
mkdir -p .local/git-hooks
echo "✅ .local/git-hooks/ directory ready"

# 4. Create history directory if needed
mkdir -p .local/history
echo "✅ .local/history/ directory ready"

# 5. Symlink pre-commit hook
HOOK_SOURCE=".local/git-hooks/pre-commit"
HOOK_TARGET=".git/hooks/pre-commit"

if [ -f "$HOOK_SOURCE" ]; then
  if [ -L "$HOOK_TARGET" ]; then
    echo "✅ Pre-commit hook already linked"
  else
    echo "🔗 Linking pre-commit hook..."
    ln -sf "../../$HOOK_SOURCE" "$HOOK_TARGET"
    echo "✅ Pre-commit hook linked"
  fi
else
  echo "⚠️  Pre-commit hook source not found at $HOOK_SOURCE"
  echo "   (Will be created during implementation)"
fi

# 6. Build TypeScript
echo "🔨 Building TypeScript..."
npm run build
echo "✅ Build complete"

echo ""
echo "✨ Setup complete! You're ready to work on Filer."
echo ""
echo "Next steps:"
echo "  - Run tests: npm test"
echo "  - Start dev server: npm run dev"
echo "  - Check .local/ git status: cd .local && git status"
echo ""
