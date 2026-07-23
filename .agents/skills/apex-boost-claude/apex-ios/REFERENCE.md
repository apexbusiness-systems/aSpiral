# apex-ios Reference Guide

> Loaded on demand by the agent when detailed CI/CD, Fastlane, or signing
> reference is needed. Keep SKILL.md as the entry point.

---

## Full Fastfile

```ruby
# Fastfile — apex-ios universal reference
default_platform(:ios)

platform :ios do

  desc "Run all tests"
  lane :test do
    run_tests(
      scheme: ENV["SCHEME"] || "MyApp-Dev",
      device: "iPhone 15",
      result_bundle: true,
      output_directory: "fastlane/test_output"
    )
  end

  desc "Build and upload to TestFlight"
  lane :beta do
    setup_ci if ENV["CI"]
    match(type: "appstore", readonly: true)
    increment_build_number(
      build_number: ENV["BUILD_NUMBER"] || Time.now.to_i.to_s
    )
    build_app(
      scheme: ENV["SCHEME"] || "MyApp-Production",
      export_method: "app-store",
      output_directory: "build/",
      output_name: "MyApp.ipa",
      include_symbols: true,
      include_bitcode: false
    )
    upload_to_testflight(
      api_key_path: "fastlane/api_key.json",
      skip_waiting_for_build_processing: false,
      distribute_external: false,
      changelog: ENV["RELEASE_NOTES"] || "Internal beta build"
    )
  end

  desc "Submit to App Store"
  lane :release do
    setup_ci if ENV["CI"]
    match(type: "appstore", readonly: true)
    build_app(scheme: ENV["SCHEME"] || "MyApp-Production", export_method: "app-store")
    upload_to_app_store(
      api_key_path: "fastlane/api_key.json",
      submit_for_review: true,
      automatic_release: false,
      phased_release: true,
      force: true,
      skip_screenshots: true,
      precheck_include_in_app_purchases: false
    )
  end

end
```

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
        - match_secrets   # MATCH_PASSWORD, MATCH_GIT_BASIC_AUTHORIZATION
    triggering:
      events: [push]
      branch_patterns:
        - pattern: main
    scripts:
      - name: Install deps
        script: bundle install
      - name: Set build number
        script: agvtool new-version -all $BUILD_NUMBER
      - name: Test
        script: bundle exec fastlane test
      - name: Beta
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

## Secrets Reference

| Secret | Source |
|---|---|
| `MATCH_PASSWORD` | Chosen when `match init` was first run |
| `MATCH_GIT_BASIC_AUTHORIZATION` | `base64(username:personal_access_token)` |
| `ASC_KEY_ID` | App Store Connect → Users & Access → Keys |
| `ASC_ISSUER_ID` | App Store Connect → Users & Access → Keys |
| `ASC_PRIVATE_KEY` | .p8 file content (download once only) |

---

## Verification Commands

```bash
# Confirm signing setup
bundle exec fastlane match development --verbose

# Confirm build locally
bundle exec fastlane beta

# Confirm build number
agvtool what-version

# Confirm IPA exists
ls build/*.ipa

# Confirm dSYM exists (required for crash symbolication)
ls build/*.dSYM.zip
```

---

## Common Errors & Fixes

| Error | Fix |
|---|---|
| `No profiles for ... were found` | Run `match appstore --force` locally to regenerate |
| `Code signing is required` | Ensure `CODE_SIGN_STYLE = Manual` and profile is assigned |
| `Build number must be higher` | Ensure `agvtool new-version -all $BUILD_NUMBER` runs before build |
| `Missing compliance` | Answer encryption export compliance in TestFlight build settings |
| `Privacy manifest required` | Add `PrivacyInfo.xcprivacy` to app target |
