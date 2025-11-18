# Personal CV Website

A modern, professional personal CV website built with **Tailwind CSS**. This project showcases a clean, minimal design with a white background, soft shadows, gradient header, rounded corners, and smooth animations.

## 🎯 Features

- **Hero Section**: Eye-catching gradient header with social media links
- **About Me**: Professional introduction with statistics cards
- **Skills Section**: Grid layout showcasing technologies with icons
- **Projects Portfolio**: Responsive grid displaying featured projects
- **Education & Certificates**: Timeline-style education history
- **Contact Form**: Fully functional contact form with validation
- **Responsive Design**: Mobile-first approach, works on all devices
- **Smooth Animations**: Fade-in and scroll animations for visual appeal
- **Inter Typography**: Beautiful Inter font for modern aesthetics
- **Tailwind CSS**: Utility-first CSS framework for rapid development

## 📁 Project Structure

```
personal-cv-website/
├── src/
│   ├── index.html              # Main HTML with Tailwind CDN
│   ├── css/
│   │   ├── style.css           # Custom styles & scrollbar
│   │   ├── variables.css       # CSS variables (for reference)
│   │   └── animations.css      # Animation keyframes
│   └── js/
│       ├── main.js             # Smooth scroll & intersection observer
│       ├── form.js             # Form validation & submission
│       └── scroll.js           # Parallax & scroll animations
├── package.json                # NPM dependencies
├── tailwind.config.js          # Tailwind configuration
├── postcss.config.js           # PostCSS configuration
└── README.md                   # Project documentation
```

## 🚀 Quick Start

### Option 1: Using Live Server (Easiest)

1. Install [Live Server Extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) in VS Code
2. Right-click `src/index.html` → "Open with Live Server"
3. Browser opens automatically at `http://localhost:5500`

### Option 2: Using Python

```bash
cd personal-cv-website/src
python -m http.server 8000
```
Then visit `http://localhost:8000`

### Option 3: Using Node.js

```bash
npm install
npm start
```

## 🎨 Customization

### Edit Personal Information
Open `src/index.html` and update:
- Name and title in hero section
- About me content
- Skills list with icons
- Projects portfolio
- Education & certificates
- Social media links

### Customize Colors
Modify Tailwind classes in `src/index.html`:
- Change `from-blue-600 to-purple-600` for gradient colors
- Update accent colors (orange, blue, cyan, etc.)

### Modify Typography
The website uses **Inter font** from Google Fonts. To change:
1. Update the Google Fonts link in `<head>`
2. Modify the `fontFamily` in `tailwind.config.js`

## 📦 Dependencies

- **Tailwind CSS 3+**: Utility-first CSS framework via CDN
- **Font Awesome 6.4**: Icon library
- **Inter Font**: Google Fonts
- **Live Server** (optional): For local development

## 🔐 Firebase (optional) — make the blog public & persistent

This project can optionally sync blog posts to Firebase Firestore so posts are visible across devices. Basic steps:

1. Create a Firebase project at https://console.firebase.google.com
2. In the project, enable **Firestore** and **Authentication** (Google sign-in).
3. Create a web app in Project Settings → "Your apps" and copy the config object.
4. Copy `src/js/firebase-config.example.js` → `src/js/firebase-config.js` and paste your config there.
5. Include the config file in your HTML before `js/db.js` (already loaded in `blog.html`):

```html
<script src="js/firebase-config.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js"></script>
<script src="js/db.js"></script>
```

6. (Development) Set Firestore rules to allow reads, write only for authenticated users:

```text
rules_version = '2';
service cloud.firestore {
	match /databases/{database}/documents {
		match /blog_posts/{document=**} {
			allow read: if true;
			allow write: if request.auth != null;
		}
	}
}
```

7. Open `src/blog.html` → Admin panel: click "Sign in with Google", then create posts. Posts will sync to Firestore.

If you prefer email/password auth, enable it in Firebase Console and the frontend can be extended to support it.

Storage & Images
-----------------
This project supports uploading images to Firebase Storage (recommended) instead of storing data URLs. To enable Storage uploads:

1. In Firebase Console, enable **Storage** and set rules for developer usage. For production, configure proper security rules.
2. Make sure `firebase-storage.js` is included (already added to `blog.html`).
3. When creating or editing a post, the admin UI will upload selected images to Storage and save the returned URL in Firestore.

Comments
--------
Basic comments are implemented using a `comments` collection in Firestore. By default, reads are public but writes require authenticated users. You can modify rules as needed.

## ✨ Features Breakdown

### Responsive Design
- Mobile-first approach
- Breakpoints for tablet and desktop
- Touch-friendly buttons and spacing

### Animations
- Fade-in-up animations on scroll
- Slide effects on hero section
- Hover transitions on cards
- Smooth scroll behavior

### Accessibility
- Semantic HTML
- Proper heading hierarchy
- Color contrast compliance
- Keyboard navigation support

## 📱 Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🛠️ Development

### Build for Production

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

## 📄 License

MIT License - feel free to use this template for your CV!

- Customize the content in `src/index.html` to reflect your personal information.
- Modify styles in `src/css/style.css` and `src/css/variables.css` to match your design preferences.
- Update the JavaScript files in `src/js/` for any additional functionality or features.

## License

This project is open-source and available under the MIT License.