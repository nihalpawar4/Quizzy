# Google Sign-In Setup Guide for Quizy App

This guide will help you enable Google Sign-In for your Quizy application.

## Step 1: Enable Google Sign-In in Firebase Console

1. Go to the [Firebase Console](https://console.firebase.google.com)
2. Select your project: **quizzy-1fde2**
3. In the left sidebar, click on **Authentication**
4. Click on the **Sign-in method** tab
5. Find **Google** in the list of Sign-in providers
6. Click on **Google** to expand it
7. Toggle the **Enable** switch to ON
8. Enter your **Project support email** (use your email: pawarnihal44@gmail.com)
9. Click **Save**

## Step 2: Add Authorized Domains (Important!)

Also on the Sign-in method page:

1. Scroll down to **Authorized domains**
2. Make sure these domains are listed:
   - `localhost` (for development)
   - Your Vercel deployment URL (e.g., `your-app.vercel.app`)

If your Vercel domain is not listed:
1. Click **Add domain**
2. Enter your Vercel domain (e.g., `quizy-app.vercel.app`)
3. Click **Add**

## Step 3: Verify Configuration

After enabling Google Sign-In, verify the setup:

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Under **Your apps**, find your Web App
3. Confirm the `authDomain` matches: `quizzy-1fde2.firebaseapp.com`

## How It Works

### For Students:
1. Click "Sign up with Google" or "Continue with Google"
2. Select your Google account
3. If you're a new user, select your class (5-10)
4. You're now registered and logged in!

### For Teachers:
1. Select "Teacher" role first
2. Click "Sign up with Google"
3. Only authorized emails can sign in as teachers
4. Authorized emails: `admin@quizy.com`, `teacher@quizy.com`, `pawarnihal44@gmail.com`

## Authorized Teacher Emails

To add more authorized teacher emails, edit the file:
`src/lib/constants.ts`

```typescript
export const ADMIN_EMAILS: string[] = [
    'admin@quizy.com',
    'teacher@quizy.com',
    'pawarnihal44@gmail.com',
    // Add more admin emails here
];
```

## Troubleshooting

### "Popup was blocked"
- Tell users to allow popups for your site
- Or they can use the email/password method instead

### "This email is not authorized for teacher access"
- The user is trying to sign in as a teacher with an unauthorized email
- Add their email to `ADMIN_EMAILS` in constants.ts, or
- They should sign in as a student instead

### Sign-in not working in development
- Make sure `localhost` is in the authorized domains
- Try using an incognito window
- Clear browser cookies and try again

## Security Notes

1. **Teacher accounts** require either:
   - An email in the `ADMIN_EMAILS` list, OR
   - The correct admin code during registration

2. **Restricted accounts** cannot sign in (even with Google)
   - Teachers can restrict student accounts from the dashboard

3. **Profile data** is stored in Firestore, not just Firebase Auth
   - This includes role, class, and other app-specific data

## Testing

After setup, test the following:

1. ✅ New student sign-up with Google
2. ✅ Class selection after Google sign-up
3. ✅ Existing user sign-in with Google
4. ✅ Teacher sign-up with authorized email
5. ✅ Teacher sign-up with unauthorized email (should fail)
6. ✅ Restricted user trying to sign in (should fail)

## Support

If you encounter any issues, check:
1. Firebase Console for error logs
2. Browser console for JavaScript errors
3. Network tab for failed API calls
