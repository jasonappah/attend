#!/usr/bin/env bash
# Build a signed release APK using signing secrets from Bitwarden.
# Requires: bwbio unlocked (run `bwbio unlock` first), and an Android SDK.
set -euo pipefail

ITEM_ID="dff4a4c8-ea83-454d-be4d-b4f700fd7a61"
KEYSTORE_OUT="/tmp/attend-release.keystore"

echo "🔓 Exporting signing keystore from Bitwarden..."
FIELDS_JSON=$(bwbio get fields "$ITEM_ID" 2>&1)

# Parse with node (avoids jq dependency)
STORE_PASS=$(node -e "console.log(JSON.parse(process.argv[1]).find(f => f.name === 'Store Password').value)" "$FIELDS_JSON")
KEY_ALIAS=$(node -e "console.log(JSON.parse(process.argv[1]).find(f => f.name === 'Key Alias').value)" "$FIELDS_JSON")
KEY_PASS=$(node -e "console.log(JSON.parse(process.argv[1]).find(f => f.name === 'Key Password').value)" "$FIELDS_JSON")
KEYSTORE_B64=$(node -e "console.log(JSON.parse(process.argv[1]).find(f => f.name === 'Keystore (base64)').value)" "$FIELDS_JSON")

echo "$KEYSTORE_B64" | base64 -d > "$KEYSTORE_OUT"
echo "✅ Keystore exported to $KEYSTORE_OUT"

# Match CI: the Galaxy A13 4G (SM-A135U1) is 32-bit only. Override with
# ANDROID_ABIS for emulators or other devices.
ANDROID_ABIS="${ANDROID_ABIS:-armeabi-v7a}"

echo "📱 Building release APK for ${ANDROID_ABIS}..."
cd android
ANDROID_RELEASE_STORE_FILE="$KEYSTORE_OUT" \
  ANDROID_RELEASE_STORE_PASSWORD="$STORE_PASS" \
  ANDROID_RELEASE_KEY_ALIAS="$KEY_ALIAS" \
  ANDROID_RELEASE_KEY_PASSWORD="$KEY_PASS" \
  ./gradlew assembleRelease -PreactNativeArchitectures="$ANDROID_ABIS"

echo "✅ Release APK built: android/app/build/outputs/apk/release/app-release.apk"
