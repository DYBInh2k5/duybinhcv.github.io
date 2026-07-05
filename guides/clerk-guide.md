# Clerk Authentication Implementation Guide

## Overview
Clerk là complete authentication solution cung cấp sign-up, sign-in, user management, SSO, và multi-factor authentication.

## 1. Setup Project

### Bước 1: Tạo Clerk Application
1. Truy cập [clerk.com](https://clerk.com)
2. Sign up/Sign in
3. Click "Add application"
4. Đặt tên application: `my-app`
5. Chọn providers (Email, Google, GitHub, etc.)
6. Copy API Keys từ Dashboard

### Bước 2: Environment Variables
```bash
# .env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

## 2. Installation

### React/Next.js
```bash
npm install @clerk/nextjs
# hoặc
yarn add @clerk/nextjs
```

### Vite/React
```bash
npm install @clerk/clerk-react
# hoặc
yarn add @clerk/clerk-react
```

## 3. Basic Setup

### Next.js App Router
```javascript
// app/layout.jsx
import { ClerkProvider } from '@clerk/nextjs'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

### Protect Routes
```javascript
// app/dashboard/page.jsx
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const user = await currentUser()
  
  if (!user) {
    redirect('/sign-in')
  }
  
  return (
    <div>
      <h1>Welcome, {user.firstName}!</h1>
      <p>Email: {user.emailAddresses[0].emailAddress}</p>
    </div>
  )
}
```

## 4. Authentication Components

### Sign In Component
```javascript
// app/sign-in/[[...sign-in]]/page.jsx
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignIn 
        path="/sign-in"
        routing="path"
        redirectUrl="/dashboard"
      />
    </div>
  )
}
```

### Sign Up Component
```javascript
// app/sign-up/[[...sign-up]]/page.jsx
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignUp 
        path="/sign-up"
        routing="path"
        redirectUrl="/dashboard"
      />
    </div>
  )
}
```

### Custom Sign In Form
```javascript
// components/CustomSignIn.jsx
'use client'
import { useSignIn, useClerk } from '@clerk/nextjs'
import { useState } from 'react'

export default function CustomSignIn() {
  const { isLoaded, signIn, setActive } = useSignIn()
  const { user } = useClerk()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isLoaded) return

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      })

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
      } else {
        console.log('Result:', result)
      }
    } catch (err) {
      setError(err.errors[0].message)
    }
  }

  if (user) {
    return <div>You are already signed in</div>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-red-500">{error}</div>}
      
      <div>
        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
      </div>
      
      <div>
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
      </div>
      
      <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded">
        Sign In
      </button>
    </form>
  )
}
```

## 5. User Management

### Get Current User
```javascript
// Client-side
import { useUser } from '@clerk/nextjs'

export default function UserProfile() {
  const { isSignedIn, user, isLoaded } = useUser()

  if (!isLoaded) {
    return <div>Loading...</div>
  }

  if (!isSignedIn) {
    return <div>Not signed in</div>
  }

  return (
    <div>
      <h1>{user.firstName} {user.lastName}</h1>
      <p>{user.emailAddresses[0].emailAddress}</p>
      <img src={user.imageUrl} alt="Profile" />
    </div>
  )
}

// Server-side
import { currentUser } from '@clerk/nextjs/server'

export default async function ServerComponent() {
  const user = await currentUser()
  
  if (!user) {
    return <div>Not authenticated</div>
  }

  return (
    <div>
      <h1>Hello, {user.firstName}!</h1>
      <p>User ID: {user.id}</p>
    </div>
  )
}
```

### Update User Profile
```javascript
// components/ProfileForm.jsx
'use client'
import { useUser } from '@clerk/nextjs'
import { useState } from 'react'

export default function ProfileForm() {
  const { user } = useUser()
  const [firstName, setFirstName] = useState(user?.firstName || '')
  const [lastName, setLastName] = useState(user?.lastName || '')

  const updateProfile = async () => {
    try {
      await user.update({
        firstName,
        lastName,
      })
      alert('Profile updated successfully!')
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Error updating profile')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label>First Name</label>
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>
      
      <div>
        <label>Last Name</label>
        <input
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>
      
      <button 
        onClick={updateProfile}
        className="bg-green-500 text-white p-2 rounded"
      >
        Update Profile
      </button>
    </div>
  )
}
```

## 6. Social Authentication

### Enable Social Providers
1. Vào Clerk Dashboard > User & Authentication > Social Connections
2. Enable các providers cần thiết:
   - Google: Cần Google OAuth credentials
   - GitHub: Cần GitHub OAuth App
   - Apple: Cần Apple Developer account

### Custom Social Buttons
```javascript
// components/SocialSignIn.jsx
'use client'
import { useSignIn } from '@clerk/nextjs'

export default function SocialSignIn() {
  const { isLoaded, signIn, setActive } = useSignIn()

  const signInWithGoogle = async () => {
    if (!isLoaded) return

    try {
      const result = await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/dashboard',
      })
      
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
      }
    } catch (error) {
      console.error('Google sign in error:', error)
    }
  }

  const signInWithGitHub = async () => {
    if (!isLoaded) return

    try {
      const result = await signIn.authenticateWithRedirect({
        strategy: 'oauth_github',
        redirectUrl: '/dashboard',
      })
      
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
      }
    } catch (error) {
      console.error('GitHub sign in error:', error)
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={signInWithGoogle}
        className="w-full bg-red-500 text-white p-2 rounded flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </button>
      
      <button
        onClick={signInWithGitHub}
        className="w-full bg-gray-800 text-white p-2 rounded flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957.266 1.983.398 3.003.404 1.02.006 2.047-.138 3.006-.404 1.241-1.552 2.428-1.23 3.221-.124.303.418 1.864.117 3.176 0 0-1.008 3.301-1.233 3.301 1.238 1.839 2.647 2.807 3.005 2.226-1.664.418-1.864.418-1.864 1.497.083 1.83.083 1.83 1.238 1.839 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957.266 1.983.398 3.003.404z"/>
        </svg>
        Continue with GitHub
      </button>
    </div>
  )
}
```

## 7. Multi-Factor Authentication (MFA)

### Enable MFA
```javascript
// components/MFASetup.jsx
'use client'
import { useUser } from '@clerk/nextjs'

export default function MFASetup() {
  const { user } = useUser()

  const enableTOTP = async () => {
    try {
      const { factors } = await user.createTOTP()
      
      // Show QR code to user
      const qrCodeURL = factors[0].qr_code
      // Display QR code for user to scan with authenticator app
      
      // Verify TOTP
      const verification = await user.verifyTOTP({
        code: '123456' // User enters code from authenticator app
      })
      
      if (verification.status === 'verified') {
        alert('MFA enabled successfully!')
      }
    } catch (error) {
      console.error('MFA setup error:', error)
    }
  }

  return (
    <div>
      <h2>Two-Factor Authentication</h2>
      <button onClick={enableTOTP} className="bg-blue-500 text-white p-2 rounded">
        Enable Authenticator App
      </button>
    </div>
  )
}
```

## 8. Middleware for Route Protection

```javascript
// middleware.js
import { authMiddleware } from '@clerk/nextjs'

export default authMiddleware({
  publicRoutes: ['/sign-in', '/sign-up', '/api/webhooks'],
  ignoredRoutes: ['/api/webhooks'],
})

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$)(?!_next).*)', '/(api|trpc)(.*)'],
}
```

## 9. Webhooks

### Handle Clerk Webhooks
```javascript
// app/api/webhooks/clerk/route.js
import { clerkClient, Webhook } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET
    const payloadString = await req.text()
    const headerPayload = req.headers

    const webhook = new Webhook(webhookSecret)
    const event = webhook.verify(payloadString, headerPayload)

    switch (event.type) {
      case 'user.created':
        console.log('User created:', event.data)
        // Create user profile in your database
        break
        
      case 'user.updated':
        console.log('User updated:', event.data)
        // Update user profile in your database
        break
        
      case 'session.created':
        console.log('Session created:', event.data)
        // Log user activity
        break
        
      case 'session.ended':
        console.log('Session ended:', event.data)
        // Clean up user session data
        break
        
      default:
        console.log('Unhandled event type:', event.type)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 })
  }
}
```

## 10. Advanced Features

### Organization Management
```javascript
// Create organization
const createOrganization = async () => {
  try {
    const organization = await clerkClient.organizations.createOrganization({
      name: 'My Company',
      slug: 'my-company',
    })
    return organization
  } catch (error) {
    console.error('Error creating organization:', error)
  }
}

// Invite user to organization
const inviteUser = async (organizationId, email) => {
  try {
    const invitation = await clerkClient.organizations.inviteMember({
      organizationId,
      emailAddress: email,
      role: 'basic_member',
    })
    return invitation
  } catch (error) {
    console.error('Error inviting user:', error)
  }
}
```

### Session Management
```javascript
// Get all active sessions
const getActiveSessions = async () => {
  try {
    const sessions = await clerkClient.sessions.getSessionList({
      userId: 'user_123',
    })
    return sessions
  } catch (error) {
    console.error('Error getting sessions:', error)
  }
}

// Revoke session
const revokeSession = async (sessionId) => {
  try {
    await clerkClient.sessions.revokeSession(sessionId)
    return true
  } catch (error) {
    console.error('Error revoking session:', error)
    return false
  }
}
```

## 11. Best Practices

### Security
- Luôn validate user permissions
- Sử dụng environment variables cho sensitive keys
- Implement proper logout functionality
- Monitor suspicious activities

### Performance
- Cache user data khi có thể
- Sử lazy loading cho auth components
- Optimize bundle size với dynamic imports

### User Experience
- Provide clear error messages
- Implement loading states
- Support multiple auth methods
- Remember user preferences

## 12. Common Issues & Solutions

### CORS Issues
```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
        ],
      },
    ]
  },
}
```

### Session Persistence
```javascript
// Configure session persistence
import { ClerkProvider } from '@clerk/nextjs'

<ClerkProvider
  publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
  sessionPersistence="cookie"
>
  {children}
</ClerkProvider>
```

## Resources
- [Clerk Documentation](https://clerk.com/docs)
- [Clerk GitHub](https://github.com/clerk/javascript)
- [Clerk Discord](https://discord.gg/clerkdev)
