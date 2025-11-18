# Firebase Setup Guide for Public Blog

This guide explains how to enable Firebase Firestore to make your blog posts public and accessible across all browsers/devices.

## Why Firebase?

- **Public Access**: Posts are stored server-side, visible to anyone who visits your blog.
- **Cross-Device Sync**: Same posts appear on mobile, desktop, and other browsers.
- **Share Posts**: Each post gets a unique URL (e.g., `post.html?id=post_...`) that you can share.
- **Offline Mode**: localStorage still works as a fallback if Firebase is unavailable.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project"
3. Enter a project name (e.g., "my-cv-blog")
4. Disable Google Analytics (optional) and click "Create project"
5. Wait for the project to be created

## Step 2: Set Up Firestore Database

1. In the Firebase console, click "Firestore Database" from the left menu
2. Click "Create database"
3. Choose a region (closest to you for speed)
4. **Start in Test Mode** (for development; add security rules later)
5. Click "Enable"
6. Once created, you'll see a "Start collection" button

## Step 3: Get Your Firebase Config

1. In the Firebase console, click the settings icon (⚙️) > "Project settings"
2. Scroll down to "Your apps" and click "Web" icon (or "</>" if it's the first app)
3. Copy your Firebase config object:

```javascript
{
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
}
```

## Step 4: Add Config to Your Blog

1. Open `src/blog.html` in your editor
2. Find the `firebaseConfig` object in the script section
3. Replace the placeholder values with your actual Firebase config:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyDxxxxxx...",           // YOUR ACTUAL KEY
    authDomain: "my-cv-blog.firebaseapp.com",
    projectId: "my-cv-blog",
    storageBucket: "my-cv-blog.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:xxxxx"
};
```

4. Save the file
5. Refresh your blog page in the browser

## Step 5: Test It

1. Go to `blog.html` in your browser
2. Open Admin panel (click "Admin" button)
3. Create a new blog post and click "Save"
4. You should see a console message: "Blog posts synced to Firebase."
5. Go to [Firebase Console](https://console.firebase.google.com) > Firestore > `blog_posts` collection
6. You should see your post as a document

## Step 6: Share Posts

Once Firebase is set up:
- Click "Đọc" (Read) on any post to open its permalink (e.g., `post.html?id=post_123456_xyz`)
- Share that URL with anyone — they'll see the post
- The post persists even if you clear localStorage

## Security Rules (Optional, for Production)

Test mode allows all reads/writes. For production, add these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /blog_posts/{document=**} {
      allow read: if true;              // Anyone can read
      allow write: if request.auth != null;  // Only authenticated users can write
    }
  }
}
```

Then set up Firebase Authentication if you want to restrict who can edit posts.

## Troubleshooting

**Posts not syncing to Firebase?**
- Check browser console (F12) for error messages
- Make sure your Firebase config is correct
- Ensure Firestore database is in "Test Mode" or has proper security rules

**Posts not showing on post.html?**
- Make sure the post ID is correct (check URL: `?id=...`)
- Try refreshing the page
- Check browser console for errors

**Can't see collections in Firestore console?**
- Collections only appear after you save the first document
- Create a post via Admin panel, then refresh the Firestore console

## Disable Firebase (Revert to Local)

If you want to go back to localStorage-only (local posts):
1. Comment out or delete the Firebase config
2. Refresh your blog
3. Posts will remain in localStorage but won't sync to Firestore

---

**Questions?** Check the [Firebase Documentation](https://firebase.google.com/docs/firestore) or reach out.
