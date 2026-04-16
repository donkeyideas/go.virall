# Push Notifications Setup

Push notifications are handled via **Expo Push** which routes to **FCM on Android** and **APNs on iOS** — no Firebase Messaging SDK required in the client.

The code scaffolding is already in place:

- [src/lib/notifications.ts](src/lib/notifications.ts) — permission, token registration
- [src/hooks/useNotifications.ts](src/hooks/useNotifications.ts) — registers on mount inside `(tabs)/_layout.tsx`
- Migration [019_push_tokens.sql](../supabase/migrations/019_push_tokens.sql) — `push_tokens` table
- Server action [src/lib/actions/push-notifications.ts](../src/lib/actions/push-notifications.ts) — `sendPushToUser()`

## Remaining setup (one-time)

### 1. Firebase project (Android FCM)
1. Create / open Firebase project.
2. Add Android app with package `com.govirall.app`.
3. Download `google-services.json` → place at `mobile/google-services.json` (git-ignored).
4. Add to `app.json`:
   ```json
   "android": {
     "package": "com.govirall.app",
     "googleServicesFile": "./google-services.json",
     ...
   }
   ```

### 2. Apple Developer (iOS APNs)
1. In Apple Developer → Keys → create a new key with **APNs** enabled → download `.p8`.
2. In EAS: `eas credentials` → select iOS → Push Notifications → upload the `.p8` key.

### 3. Upload APNs key to Expo (simpler alternative)
- Run `eas credentials` and let it configure APNs automatically — Expo will request the key interactively.

### 4. Apply the migration
Run [019_push_tokens.sql](../supabase/migrations/019_push_tokens.sql) in the Supabase Dashboard SQL Editor.

### 5. Wire triggers from the web
Import `sendPushToUser()` in server actions that should trigger notifications:

- Viral post detection → `viral_posts` insert
- New direct message → `direct_messages` insert
- Proposal status change → `proposals` update
- Deal status change → `deals` update

Example:
```ts
import { sendPushToUser } from "@/lib/actions/push-notifications";
await sendPushToUser(receiverId, {
  title: "New message from " + senderName,
  body: messagePreview,
  data: { threadId },
});
```

## Testing
- Build a dev client: `eas build --profile development --platform ios`
- Install on a physical device (push does not work in simulator).
- Use Expo's push tool to test: https://expo.dev/notifications
- Or call `sendPushToUser()` from a web route handler and hit it.
