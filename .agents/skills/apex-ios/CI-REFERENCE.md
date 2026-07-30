# CI Pipeline Reference

> apex-ios progressive disclosure — loaded only when CI/CD detail is needed.

---

## Codemagic YAML

```yaml
# codemagic.yaml
workflows:
  ios-beta:
    name: iOS Beta
    max_build_duration: 60
    instance_type: mac_mini_m2
    integrations:
      app_store_connect: ASC_API_KEY
    environment:
      ios_signing:
        distribution_type: app_store
        bundle_identifier: ${BUNDLE_ID}
      groups:
        - match_secrets       # Contains: MATCH_PASSWORD, MATCH_GIT_BASIC_AUTHORIZATION
    triggering:
      events: [push]
      branch_patterns:
        - pattern: main
    scripts:
      - name: Install gems
        script: bundle install
      - name: Set build number
        script: agvtool new-version -all $BUILD_NUMBER
      - name: Run tests
        script: bundle exec fastlane test
      - name: Deploy to TestFlight
        script: bundle exec fastlane beta
    artifacts:
      - build/**/*.ipa
      - build/**/*.dSYM.zip
      - fastlane/test_output/**
    publishing:
      app_store_connect:
        auth: integration
        submit_to_testflight: true
        beta_groups:
          - Internal Testers
```

---

## GitHub Actions Workflow

```yaml
# .github/workflows/ios.yml
name: iOS CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  XCODE_VERSION: "15.2"

jobs:
  test:
    runs-on: macos-14
    steps:
      - uses: actions/checkout@v4
      - run: sudo xcode-select -switch /Applications/Xcode_${{ env.XCODE_VERSION }}.app
      - uses: ruby/setup-ruby@v1
        with:
          bundler-cache: true
      - run: bundle exec fastlane test

  beta:
    runs-on: macos-14
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - run: sudo xcode-select -switch /Applications/Xcode_${{ env.XCODE_VERSION }}.app
      - uses: ruby/setup-ruby@v1
        with:
          bundler-cache: true
      - name: Deploy Beta
        env:
          MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
          MATCH_GIT_BASIC_AUTHORIZATION: ${{ secrets.MATCH_GIT_BASIC_AUTHORIZATION }}
          APP_STORE_CONNECT_API_KEY_ID: ${{ secrets.ASC_KEY_ID }}
          APP_STORE_CONNECT_API_KEY_ISSUER_ID: ${{ secrets.ASC_ISSUER_ID }}
          APP_STORE_CONNECT_API_KEY_CONTENT: ${{ secrets.ASC_PRIVATE_KEY }}
          BUILD_NUMBER: ${{ github.run_number }}
        run: bundle exec fastlane beta
```

---

## Secrets — Where to Get Them

| Secret Name | Where to obtain |
|---|---|
| `MATCH_PASSWORD` | Set by you when `fastlane match init` was first run |
| `MATCH_GIT_BASIC_AUTHORIZATION` | `echo -n "github_username:personal_access_token" \| base64` |
| `ASC_KEY_ID` | App Store Connect → Users & Access → Integrations → Keys |
| `ASC_ISSUER_ID` | Same page as Key ID |
| `ASC_PRIVATE_KEY` | .p8 file content — download once, store in CI secret store |

---

## Verification Commands

```bash
# Validate signing locally
bundle exec fastlane match development --verbose

# Run full beta lane locally
bundle exec fastlane beta

# Confirm build number incremented
agvtool what-version

# Confirm artifacts exist
ls build/*.ipa
ls build/*.dSYM.zip
```

Expected: IPA + dSYM in `build/`, no signing errors, build visible in TestFlight within 30 min.
