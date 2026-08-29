# VDC Teacher Attendance App

Mobile-first teacher app for Vivekananda Degree College attendance, reports, assignments, tests, and absent-student SMS notifications.

The app is built with Expo SDK 54, React Native, and Supabase. It supports Android APK distribution and an Expo-hosted Progressive Web App for iPhone users.

## Main features

- Admin-provisioned teacher login through Supabase Auth
- No public registration flow
- Teacher-specific class and subject access
- Attendance marking with `P` for present and `A` for absent
- Attendance saving with absent SMS notifications through a Supabase Edge Function
- Daily, monthly, and quarterly attendance reports
- PDF generation for attendance reports
- Assignment marks entry and PDF generation
- Test marks entry and PDF generation
- Android hardware back button support
- iPhone/PWA browser back navigation support

## Tech stack

- Expo SDK 54
- React Native
- Expo Router
- Supabase Auth
- Supabase Postgres
- Supabase Row Level Security
- Supabase Edge Functions
- Fast2SMS for absent-student parent notifications
- EAS Build for Android APK
- EAS Hosting for the PWA

## Project setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Add the public Supabase values:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Do not put the Supabase service role key or SMS API key in the mobile app environment. Private keys must stay in Supabase secrets.

## Run locally

Start Expo:

```bash
npx expo start
```

Then open the app in Expo Go or an Android device/emulator.

## Validate before release

Run TypeScript checks:

```bash
npx tsc --noEmit
```

Run lint:

```bash
npm run lint
```

Check Expo package compatibility:

```bash
npx expo install --check
```

## Android APK build

Build an Android APK with EAS:

```bash
npx eas-cli build --platform android --profile apk
```

After the build completes, download the APK from Expo and share it with the Android teachers.

Android APK users do not receive automatic updates. A new APK must be built and installed after app changes.

## iPhone PWA deployment

Export and deploy the web app:

```bash
npx expo export --platform web
npx eas-cli deploy --prod
```

Production PWA URL:

```text
https://vdc-teacher-app.expo.app
```

iPhone users can open the URL in Safari and choose:

```text
Share -> Add to Home Screen
```

After redeployment, iPhone users can continue using the same URL/Home Screen icon.

## Supabase notes

The database uses teacher-scoped access through Supabase Auth and Row Level Security. Teachers should only access their assigned classes, subjects, students, and records.

Important production rules:

- Keep Row Level Security enabled on exposed tables.
- Never expose service role keys in the frontend.
- Store SMS provider secrets only as Supabase Edge Function secrets.
- Use admin-created teacher accounts only.
- Do not add a public sign-up screen unless the access model changes.

## SMS flow

When attendance is submitted:

1. Attendance session is saved.
2. Student attendance records are saved.
3. The app shows the teacher that attendance has been saved.
4. Absent-student SMS notifications are sent in the background through the Supabase Edge Function.

This keeps teacher submission fast even when SMS delivery is slower.

## Current deployment model

- Android teachers: install the shared APK manually.
- iPhone teacher: use the Expo-hosted PWA.
- Backend: Supabase hosted project.

## Repository

GitHub repository:

```text
https://github.com/ShreyaAnand1709/vdc-attendance-v2
```
