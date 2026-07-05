# PostHog Analytics Implementation Guide

## Overview
PostHog là open-source product analytics platform cung cấp event tracking, session replay, feature flags, A/B testing, và heatmaps.

## 1. Setup Project

### Bước 1: Tạo PostHog Project
1. Truy cập [app.posthog.com](https://app.posthog.com)
2. Sign up/Sign in
3. Click "Add project"
4. Đặt tên project: `my-app`
5. Chọn "Web" platform
6. Copy **Project API Key** và **Host URL**

### Bước 2: Environment Variables
```bash
# .env.local
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

## 2. Installation

### React/Next.js
```bash
npm install posthog-js
# hoặc
yarn add posthog-js
```

### Node.js Backend
```bash
npm install posthog-node
# hoặc
yarn add posthog-node
```

## 3. Frontend Integration

### Initialize PostHog
```javascript
// lib/posthog.js
import PostHog from 'posthog-js'

export const posthog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  loaded: (posthog) => {
    console.log('PostHog loaded successfully')
  },
})

// Auto capture
posthog.opt_in_capturing()

// Optional: Enable session replay
posthog.startSessionReplayRecording()
```

### React Provider
```javascript
// providers/PostHogProvider.jsx
'use client'
import { PostHogProvider } from 'posthog-js/react'
import { posthog } from '@/lib/posthog'

export function PHProvider({ children }) {
  return (
    <PostHogProvider client={posthog}>
      {children}
    </PostHogProvider>
  )
}
```

### App Integration
```javascript
// app/layout.jsx
import { PHProvider } from '@/providers/PostHogProvider'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <PHProvider>{children}</PHHogProvider>
      </body>
    </html>
  )
}
```

## 4. Event Tracking

### Custom Events
```javascript
// components/AnalyticsExample.jsx
'use client'
import { usePostHog } from 'posthog-js/react'

export default function AnalyticsExample() {
  const posthog = usePostHog()

  const handleButtonClick = () => {
    // Track custom event
    posthog.capture('button_clicked', {
      button_name: 'subscribe',
      button_location: 'homepage_hero',
      user_plan: 'free'
    })
  }

  const handlePurchase = () => {
    // Track purchase event
    posthog.capture('purchase_completed', {
      product_id: 'premium_monthly',
      product_name: 'Premium Monthly Plan',
      currency: 'USD',
      value: 29.99,
      items: [
        {
          item_id: 'premium_monthly',
          item_name: 'Premium Monthly Plan',
          price: 29.99,
          quantity: 1
        }
      ]
    })
  }

  const handlePageView = (pageName) => {
    // Manual page view tracking
    posthog.capture('$pageview', {
      '$current_url': window.location.href,
      page_name: pageName
    })
  }

  return (
    <div>
      <button onClick={handleButtonClick}>
        Subscribe Now
      </button>
      <button onClick={handlePurchase}>
        Complete Purchase
      </button>
      <button onClick={() => handlePageView('pricing')}>
        Track Pricing Page
      </button>
    </div>
  )
}
```

### User Identification
```javascript
// Identify user when they log in
const identifyUser = (user) => {
  posthog.identify(user.id, {
    email: user.email,
    name: user.name,
    plan: user.subscription_plan,
    signup_date: user.created_at
  })
}

// Reset when user logs out
const logout = () => {
  posthog.reset()
}

// Update user properties
const updateUserProperties = (updates) => {
  posthog.people.set(updates)
}

// Increment properties
const incrementProperty = (property, value = 1) => {
  posthog.people.increment(property, value)
}
```

## 5. Auto-Capture Events

### Configure Auto-Capture
```javascript
// lib/posthog.js
export const posthog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  
  // Auto-capture configuration
  autocapture: {
    dom_event_allowlist: ['click', 'submit', 'change'],
    element_allowlist: ['a', 'button', 'form', 'input', 'select', 'textarea'],
    css_selector_allowlist: ['[data-track]'],
    url_allowlist: null,
    text_capture: false,
    capture_console_log: false
  },
  
  // Session recording
  session_recording: {
    enabled: true,
    script_host: null,
    canvas_recording: false,
    network_payload_capture: {
      recordHeaders: false,
      recordBody: false
    }
  }
})
```

### Manual Element Tracking
```html
<!-- Track specific elements -->
<button data-track="subscribe_button" data-track-properties='{"location": "hero"}'>
  Subscribe
</button>

<!-- Track form submissions -->
<form data-track="signup_form" data-track-properties='{"source": "landing_page"}'>
  <input type="email" name="email" required />
  <button type="submit">Sign Up</button>
</form>
```

## 6. Session Replay

### Enable Session Replay
```javascript
// lib/posthog.js
export const posthog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  
  // Session replay configuration
  session_replay: {
    enabled: true,
    script_host: null,
    canvas_recording: false,
    network_payload_capture: {
      recordHeaders: false,
      recordBody: false
    }
  }
})

// Start recording manually
posthog.startSessionReplayRecording()

// Stop recording
posthog.stopSessionReplayRecording()

// Check if recording is active
const isRecording = posthog.isFeatureEnabled('session-replay')
```

### Replay Event Properties
```javascript
// Add custom properties to replay events
posthog.capture('user_action', {
  action: 'clicked_feature',
  feature_name: 'advanced_search',
  replay_start: true,
  replay_end: false
})
```

## 7. Feature Flags

### Setup Feature Flags
```javascript
// Check if feature is enabled
const isFeatureEnabled = posthog.isFeatureEnabled('new-dashboard')

// Get feature flag value
const featureValue = posthog.getFeatureFlag('theme-color', 'blue')

// Reload feature flags
posthog.reloadFeatureFlags()

// Listen for feature flag changes
posthog.onFeatureFlags(() => {
  console.log('Feature flags loaded')
})
```

### Feature Flag Component
```javascript
// components/FeatureFlag.jsx
'use client'
import { usePostHog } from 'posthog-js/react'

export function FeatureFlag({ 
  flag, 
  children, 
  fallback = null,
  matchValue = null 
}) {
  const posthog = usePostHog()
  
  const isEnabled = matchValue 
    ? posthog.getFeatureFlag(flag) === matchValue
    : posthog.isFeatureEnabled(flag)
  
  return isEnabled ? children : fallback
}

// Usage
<FeatureFlag flag="new-dashboard">
  <NewDashboard />
</FeatureFlag>

<FeatureFlag flag="theme-color" matchValue="dark">
  <DarkTheme />
</FeatureFlag>

<FeatureFlag flag="beta-feature" fallback={<OldFeature />}>
  <BetaFeature />
</FeatureFlag>
```

## 8. A/B Testing

### Create A/B Test
```javascript
// Get A/B test variant
const variant = posthog.getFeatureFlag('new-signup-flow')

// Track which variant user sees
posthog.capture('ab_test_viewed', {
  test_name: 'new-signup-flow',
  variant: variant,
  test_version: 'v1.0'
})

// Usage in component
const SignupFlow = () => {
  const variant = posthog.getFeatureFlag('new-signup-flow')
  
  if (variant === 'control') {
    return <OldSignupFlow />
  } else if (variant === 'variant-a') {
    return <NewSignupFlowA />
  } else if (variant === 'variant-b') {
    return <NewSignupFlowB />
  }
  
  return <DefaultSignupFlow />
}
```

### Track A/B Test Results
```javascript
// Track conversion
const trackConversion = (variant) => {
  posthog.capture('signup_completed', {
    test_name: 'new-signup-flow',
    variant: variant,
    converted: true,
    conversion_time: new Date().toISOString()
  })
}

// Track funnel events
const trackFunnelStep = (step, variant) => {
  posthog.capture('signup_funnel_step', {
    test_name: 'new-signup-flow',
    variant: variant,
    step: step,
    step_number: getStepNumber(step)
  })
}
```

## 9. Backend Integration

### Node.js Server Integration
```javascript
// lib/posthog-server.js
import { PostHog } from 'posthog-node'

const posthogServer = new PostHog(
  process.env.POSTHOG_API_KEY,
  { host: process.env.POSTHOG_HOST }
)

export default posthogServer
```

### Server-side Event Tracking
```javascript
// pages/api/track.js
import posthogServer from '@/lib/posthog-server'

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { event, properties, distinctId } = req.body
    
    try {
      await posthogServer.capture({
        event,
        properties,
        distinctId,
        timestamp: new Date().toISOString()
      })
      
      res.status(200).json({ success: true })
    } catch (error) {
      console.error('PostHog error:', error)
      res.status(500).json({ error: 'Failed to track event' })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
```

### API Middleware
```javascript
// middleware/posthog.js
import posthogServer from '@/lib/posthog-server'

export const posthogMiddleware = async (req, res, next) => {
  // Track API calls
  await posthogServer.capture({
    event: 'api_call',
    properties: {
      method: req.method,
      path: req.path,
      user_agent: req.headers['user-agent'],
      ip: req.ip
    },
    distinctId: req.user?.id || 'anonymous'
  })
  
  next()
}
```

## 10. Advanced Features

### Heatmaps
```javascript
// Enable heatmaps
posthog.capture('$heatmap_click', {
  $current_url: window.location.href,
  $elements: [
    {
      $el_text: 'Subscribe Button',
      $el_attr__href: '/subscribe',
      $el_x: 100,
      $el_y: 200
    }
  ]
})
```

### Exception Tracking
```javascript
// Track errors automatically
window.addEventListener('error', (event) => {
  posthog.capture('javascript_error', {
    error_message: event.message,
    error_filename: event.filename,
    error_lineno: event.lineno,
    error_colno: event.colno,
    error_stack: event.error?.stack
  })
})

// Track unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  posthog.capture('unhandled_promise_rejection', {
    reason: event.reason,
    promise: event.promise
  })
})
```

### Performance Tracking
```javascript
// Track page load time
window.addEventListener('load', () => {
  const navigation = performance.getEntriesByType('navigation')[0]
  
  posthog.capture('page_load_time', {
    load_time: navigation.loadEventEnd - navigation.loadEventStart,
    dom_content_loaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
    first_paint: performance.getEntriesByName('first-paint')[0]?.startTime,
    first_contentful_paint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime
  })
})

// Track Core Web Vitals
import { getCLS, getFID, getFCP, getLCP } from 'web-vitals'

getCLS((metric) => {
  posthog.capture('core_web_vital', {
    vital_type: 'CLS',
    value: metric.value,
    id: metric.id
  })
})

getFID((metric) => {
  posthog.capture('core_web_vital', {
    vital_type: 'FID',
    value: metric.value,
    id: metric.id
  })
})
```

## 11. Privacy & Compliance

### GDPR Compliance
```javascript
// Opt out of tracking
posthog.opt_out_capturing()

// Opt back in
posthog.opt_in_capturing()

// Check if user has opted out
const hasOptedOut = posthog.has_opted_out_capturing()

// Clear all data
posthog.clear_opt_in_out_capturing()
```

### Data Retention
```javascript
// Configure data retention (in PostHog dashboard)
// Options: 1 day, 7 days, 30 days, 90 days, forever

// Anonymize IP addresses
posthog.capture('page_view', {
  $set_once: { ip_anonymized: true }
})
```

## 12. Testing

### Local Development
```javascript
// Use test key for development
const POSTHOG_KEY = process.env.NODE_ENV === 'development' 
  ? 'phc_test_key' 
  : process.env.NEXT_PUBLIC_POSTHOG_KEY

export const posthog = new PostHog(POSTHOG_KEY, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  debug: process.env.NODE_ENV === 'development'
})
```

### Mock PostHog for Testing
```javascript
// __mocks__/posthog-js.js
export const posthog = {
  capture: jest.fn(),
  identify: jest.fn(),
  reset: jest.fn(),
  isFeatureEnabled: jest.fn(() => false),
  getFeatureFlag: jest.fn(() => null),
  people: {
    set: jest.fn(),
    increment: jest.fn()
  }
}

export const usePostHog = () => posthog
```

## 13. Best Practices

### Event Naming
- Use descriptive, consistent naming
- Use snake_case for event names
- Include relevant context in properties
- Avoid PII in event data

### Performance
- Batch events when possible
- Use sampling for high-volume events
- Debounce rapid-fire events
- Monitor PostHog performance impact

### Data Quality
- Validate event data before sending
- Use consistent data types
- Document event schemas
- Regular data audits

## 14. Common Use Cases

### E-commerce Analytics
```javascript
// Product view
posthog.capture('product_viewed', {
  product_id: 'prod_123',
  product_name: 'Premium Widget',
  category: 'widgets',
  price: 29.99,
  currency: 'USD'
})

// Add to cart
posthog.capture('added_to_cart', {
  product_id: 'prod_123',
  quantity: 1,
  cart_value: 29.99,
  cart_items: 1
})

// Purchase
posthog.capture('purchase_completed', {
  order_id: 'order_456',
  total_value: 89.97,
  currency: 'USD',
  items: [
    {
      product_id: 'prod_123',
      quantity: 3,
      price: 29.99
    }
  ]
})
```

### SaaS Analytics
```javascript
// Feature usage
posthog.capture('feature_used', {
  feature_name: 'export_data',
  feature_category: 'data_management',
  usage_context: 'dashboard'
})

// Subscription events
posthog.capture('subscription_upgraded', {
  from_plan: 'free',
  to_plan: 'pro',
  upgrade_value: 20.00,
  currency: 'USD'
})

// User engagement
posthog.capture('daily_active_user', {
  session_duration: 1800, // seconds
  pages_viewed: 12,
  actions_performed: 25
})
```

## Resources
- [PostHog Documentation](https://posthog.com/docs)
- [PostHog GitHub](https://github.com/PostHog/posthog)
- [PostHog Discord](https://discord.gg/posthog)
- [PostHog Blog](https://posthog.com/blog)
