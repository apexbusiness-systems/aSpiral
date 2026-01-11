#!/bin/bash
set -eo pipefail

VERSION="$1"
if [ -z "$VERSION" ]; then
  echo "Usage: ./scripts/bump-version.sh 1.0.1"
  exit 1
fi

# Parse version
MAJOR=$(echo "$VERSION" | cut -d. -f1)
MINOR=$(echo "$VERSION" | cut -d. -f2)
PATCH=$(echo "$VERSION" | cut -d. -f3)
VERSION_CODE=$((MAJOR * 10000 + MINOR * 100 + PATCH))

echo "Bumping to v$VERSION (code: $VERSION_CODE)"

# Update package.json
npm version "$VERSION" --no-git-tag-version

# Update Android build.gradle
if [ -f "android/app/build.gradle" ]; then
  sed -i.bak "s/versionCode [0-9]*/versionCode $VERSION_CODE/" android/app/build.gradle
  sed -i.bak "s/versionName \"[^\"]*\"/versionName \"$VERSION\"/" android/app/build.gradle
  rm -f android/app/build.gradle.bak
  echo "  Updated Android build.gradle"
fi

# Update iOS (via agvtool if available, otherwise manual)
if [ -d "ios/App" ]; then
  cd ios/App
  if command -v agvtool &> /dev/null; then
    agvtool new-marketing-version "$VERSION"
    agvtool new-version -all "$VERSION_CODE"
  else
    # Manual update via PlistBuddy
    /usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $VERSION" App/Info.plist 2>/dev/null || true
    /usr/libexec/PlistBuddy -c "Set :CFBundleVersion $VERSION_CODE" App/Info.plist 2>/dev/null || true
  fi
  cd ../..
  echo "  Updated iOS project"
fi

echo "Version bumped to $VERSION"
