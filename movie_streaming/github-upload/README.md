# Movie Streaming App - Version Control

This repository is used for version control of the Shaaka movie streaming app.

## How Force Update Works

The app checks `version.json` on startup. If the user's app version is below `minVersion`, they are forced to update.

## Files

| File | Purpose |
|------|---------|
| `version.json` | Controls app version requirements |

## How to Force Users to Update

1. Release a new APK with updated version in `force-update.js`:
   ```javascript
   APP_VERSION: '1.1.0'  // New version
   ```

2. Update this `version.json`:
   ```json
   {
       "version": "1.1.0",
       "minVersion": "1.1.0",
       "forceUpdate": true
   }
   ```

3. Commit and push to this repo

4. All users with older versions will be blocked and forced to update!

## version.json Fields

| Field | Description |
|-------|-------------|
| `version` | Latest available version |
| `minVersion` | Minimum version required to use the app |
| `updateUrl` | Link to download the new APK |
| `message` | Message shown to users |
| `forceUpdate` | `true` = block app, `false` = show banner only |

## Example Scenarios

### Soft Update (Optional)
```json
{
    "version": "1.2.0",
    "minVersion": "1.0.0",
    "forceUpdate": false
}
```
Users see a banner but can dismiss it.

### Hard Update (Required)
```json
{
    "version": "1.2.0",
    "minVersion": "1.2.0",
    "forceUpdate": true
}
```
Users MUST update to continue using the app.
