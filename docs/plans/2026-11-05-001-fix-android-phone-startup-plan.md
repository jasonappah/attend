---

title: "fix: Restore Android phone startup"
status: active
date: 2026-11-05
---

# fix: Restore Android phone startup

## Problem and scope

Attend does not run on the user's Android phone. Build and install an appropriate APK, diagnose build and runtime failures on the connected device, fix their causes, and verify startup on that device. Preserve existing user changes and device data. Unrelated improvements are out of scope.

## Assumptions

- The phone is accessible through ADB and can authorize debugging; the appropriate APK architecture must be determined from the device.
- The actual failure and affected files are unknown until build and device diagnostics are available.

## Implementation units

### U1. Diagnose Android build and startup

**Goal:** Reproduce the failure with the real Android device and identify its root cause.

**Files:** `scripts/release-android.sh`, `android/`, `vite.config.ts`, `README.md`; additional files depend on diagnostics.

**Approach:** Follow the existing Android build and identity conventions. Inspect ADB state, device ABI, build output, installation, startup and Android logs without clearing app data.

**Verification:** Establish a reproducible failure or identify a concrete environmental blocker.

### U2. Fix and verify startup

**Goal:** Correct identified build or startup defects and protect applicable behavior with regression coverage.

**Dependencies:** U1.

**Files:** Determined by U1; add or update relevant existing tests for changed behavior.

**Approach:** Make the smallest compatible corrections; avoid unrelated changes and preserve the user's existing work.

**Test scenarios:** The correct ABI builds and installs; launching from a cold start displays the intended app rather than crashing; relaunch succeeds without clearing data; targeted regression tests cover any changed behavior and error paths.

**Verification:** A successful build and observed startup on the actual phone, with logs checked for fatal errors. Run applicable repository checks and document any blockers.

### U3. Deliver changes

**Goal:** Open a reviewable pull request containing only this work, with device verification results and any remaining limitations.

**Dependencies:** U2.

**Verification:** PR links to the branch and accurately reports tested behavior and check results.
