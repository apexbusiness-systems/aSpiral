# Code Signing Reference

> apex-ios progressive disclosure — loaded when signing or provisioning issues arise.

---

## match Setup (First Time)

```bash
# Install Fastlane if not present
gem install fastlane

# Initialize match (run once locally)
bundle exec fastlane match init

# Generate development certificates + profiles
bundle exec fastlane match development

# Generate distribution certificates + profiles
bundle exec fastlane match appstore
```

## Matchfile

```ruby
git_url("https://github.com/your-org/ios-certificates")
storage_mode("git")
type("appstore")
app_identifier(["${BUNDLE_ID}"])
username("${APPLE_ID}")
team_id("${TEAM_ID}")
```

## CI Rule: Always Readonly

```ruby
match(type: "appstore", readonly: true)
```

Never allow CI to regenerate certificates — this invalidates existing profiles for all team members.

---

## Common Signing Errors

| Error Message | Root Cause | Fix |
|---|---|---|
| `No profiles for '...' were found` | Profile doesn't exist or expired | Run `match appstore --force` locally |
| `Code signing is required for product type` | `CODE_SIGN_STYLE` set to Automatic on CI | Set to `Manual` in build settings |
| `Provisioning profile doesn't include signing certificate` | Cert mismatch | Run `match appstore --force` to regenerate |
| `No certificate for team` | Wrong team ID | Confirm `TEAM_ID` in Matchfile and Xcode project |
| `Failed to register bundle ID` | Bundle ID not created in Apple Developer portal | Create it at developer.apple.com → Identifiers |

---

## Certificate Lifecycle

- **Development certs:** expire 1 year from creation
- **Distribution certs:** expire 1 year from creation
- **Provisioning profiles:** expire based on cert or explicit expiry date

**Action:** Set a calendar reminder 30 days before expiry. Rotate locally with:

```bash
bundle exec fastlane match appstore --force
bundle exec fastlane match development --force
```

---

## Privacy Manifest Requirement (iOS 17+)

Add `PrivacyInfo.xcprivacy` to your app target with all required reason APIs declared.
Failure to include this will result in App Store rejection.

Required if your app (or any SDK) uses:
- `UserDefaults`
- File timestamp APIs
- System boot time APIs
- Disk space APIs
- Active keyboard APIs

Check the full list at: App Store Connect → App Privacy → Privacy Manifest (UNKNOWN if policy changed — verify at developer.apple.com)
