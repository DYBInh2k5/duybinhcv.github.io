# Sentry Error Tracking Implementation Guide

## Overview
Sentry là error tracking và performance monitoring platform giúp detect, diagnose, và fix errors trong production applications.

## 1. Setup Project

### Bước 1: Tạo Sentry Project
1. Truy cập [sentry.io](https://sentry.io)
2. Sign up/Sign in
3. Click "Create Project"
4. Chọn platform: "React", "Next.js", "Node.js", etc.
5. Đặt tên project: `my-app`
6. Copy **DSN (Data Source Name)**

### Bước 2: Environment Variables
```bash
# .env.local
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_AUTH_TOKEN=your-auth-token
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
```

## 2. Installation

### React/Next.js
```bash
npm install @sentry/nextjs
# hoặc
yarn add @sentry/nextjs
```

### Node.js Backend
```bash
npm install @sentry/node
# hoặc
yarn add @sentry/node
```

## 3. Next.js Integration

### Sentry Configuration
```javascript
// sentry.client.config.js
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Environment
  environment: process.env.NODE_ENV,
  
  // Release tracking
  release: process.env.NEXT_PUBLIC_VERSION || '1.0.0',
  
  // Sample rate for performance monitoring
  tracesSampleRate: 1.0,
  
  // Sample rate for session replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // Integrations
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  
  // Before send for filtering
  beforeSend(event, hint) {
    // Filter out certain errors
    if (event.exception) {
      const error = event.exception.values[0];
      
      // Ignore specific error types
      if (error.type === 'ChunkLoadError') {
        return null;
      }
      
      // Add custom context
      event.contexts = {
        ...event.contexts,
        custom: {
          userId: getCurrentUserId(),
          feature: getCurrentFeature(),
        }
      };
    }
    
    return event;
  },
})
```

```javascript
// sentry.server.config.js
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Server-side configuration
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  
  // Server integrations
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app }),
  ],
})
```

### Next.js Configuration
```javascript
// next.config.js
const { withSentryConfig } = require('@sentry/nextjs')

const sentryWebpackPluginOptions = {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
}

module.exports = withSentryConfig(
  {
    // Your Next.js config
    reactStrictMode: true,
    swcMinify: true,
  },
  sentryWebpackPluginOptions
)
```

### App Router Setup
```javascript
// app/layout.jsx
import { Sentry } from '@sentry/nextjs'
import { ErrorBoundary } from 'next/error'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Sentry.ErrorBoundary fallback={<ErrorBoundary />}>
          {children}
        </Sentry.ErrorBoundary>
      </body>
    </html>
  )
}
```

## 4. Error Boundaries

### Custom Error Boundary
```javascript
// components/SentryErrorBoundary.jsx
'use client'
import * as Sentry from '@sentry/nextjs'
import { Component } from 'react'

export class SentryErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // Send error to Sentry
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <details>
            {this.state.error && this.state.error.toString()}
            <br />
            <componentStack>
              {this.state.errorInfo.componentStack}
            </componentStack>
          </details>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
```

### Usage
```javascript
// app/dashboard/page.jsx
import SentryErrorBoundary from '@/components/SentryErrorBoundary'

export default function Dashboard() {
  return (
    <SentryErrorBoundary>
      <DashboardContent />
    </SentryErrorBoundary>
  )
}
```

## 5. Manual Error Reporting

### Capture Exceptions
```javascript
import * as Sentry from '@sentry/nextjs'

// Capture simple error
try {
  riskyOperation()
} catch (error) {
  Sentry.captureException(error)
}

// Capture with additional context
try {
  riskyOperation()
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      section: 'user_profile',
      action: 'update_avatar'
    },
    extra: {
      userId: '12345',
      fileSize: '2.5MB',
      fileType: 'image/jpeg'
    }
  })
}

// Capture message
Sentry.captureMessage('User attempted invalid operation', {
  level: 'warning',
  tags: {
    feature: 'data_export'
  }
})
```

### Set User Context
```javascript
import * as Sentry from '@sentry/nextjs'

// Set user information
Sentry.setUser({
  id: '12345',
  email: 'user@example.com',
  username: 'john_doe',
  plan: 'premium'
})

// Update user context
Sentry.setUser({
  ...Sentry.getUser(),
  plan: 'enterprise'
})

// Clear user context
Sentry.setUser(null)
```

### Add Tags and Context
```javascript
// Add tags for filtering
Sentry.setTag('page', 'dashboard')
Sentry.setTag('feature', 'analytics')
Sentry.setTag('browser', 'chrome')

// Add context
Sentry.setContext('device', {
  type: 'mobile',
  os: 'iOS 15.0',
  screen_resolution: '390x844'
})

Sentry.setContext('feature_flags', {
  new_dashboard: true,
  beta_features: false
})
```

## 6. Performance Monitoring

### Transaction Tracking
```javascript
import * as Sentry from '@sentry/nextjs'

// Manual transaction
const transaction = Sentry.startTransaction({
  name: 'user-registration',
  op: 'http.server',
})

try {
  // Simulate user registration process
  const userData = await validateUserData(data)
  const user = await createUser(userData)
  const welcomeEmail = await sendWelcomeEmail(user.email)
  
  transaction.setStatus('ok')
  transaction.setData('user_id', user.id)
  transaction.setData('email_sent', true)
  
} catch (error) {
  transaction.setStatus('internal_error')
  Sentry.captureException(error)
} finally {
  transaction.finish()
}

// Span for nested operations
const parentTransaction = Sentry.startTransaction({ name: 'api-call' })

const dbSpan = parentTransaction.startChild({
  op: 'db.query',
  description: 'fetch user data'
})

try {
  const users = await database.query('SELECT * FROM users')
  dbSpan.setStatus('ok')
  dbSpan.setData('row_count', users.length)
} catch (error) {
  dbSpan.setStatus('internal_error')
  throw error
} finally {
  dbSpan.finish()
}

parentTransaction.finish()
```

### Custom Performance Metrics
```javascript
// Measure custom metrics
const measure = Sentry.getMetricAggregator()
measure.increment('button_clicks', 1, {
  tags: { button: 'subscribe', location: 'hero' }
})

measure.timing('api_response_time', 250, {
  tags: { endpoint: '/api/users', method: 'GET' }
})

measure.gauge('active_users', 1250, {
  tags: { plan: 'premium' }
})

// Histogram for response times
measure.distribution('response_time', 150, {
  tags: { endpoint: '/api/data' },
  unit: 'millisecond'
})
```

## 7. Session Replay

### Configure Session Replay
```javascript
// sentry.client.config.js
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Session replay configuration
  replaysSessionSampleRate: 0.1,  // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of error sessions
  
  integrations: [
    new Sentry.Replay({
      // Mask sensitive data
      maskAllText: false,
      maskAllInputs: true,
      blockAllMedia: false,
      
      // Network recording
      networkDetailAllowUrls: [
        /https:\/\/api\.example\.com/,
        /https:\/\/app\.example\.com/
      ],
      networkCaptureBodies: true,
      
      // Custom privacy rules
      beforeAddRecordingEvent: (event) => {
        // Filter out sensitive events
        if (event.data.url?.includes('/password')) {
          return null
        }
        return event
      }
    }),
  ],
})
```

### Manual Replay Control
```javascript
// Start recording manually
Sentry.startReplay()

// Stop recording
Sentry.stopReplay()

// Flush replay buffer
Sentry.flushReplay()
```

## 8. Backend Integration

### Node.js Setup
```javascript
// server/sentry.js
import * as Sentry from '@sentry/node'
import { nodeProfilingIntegration } from '@sentry/profiling-node'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Environment
  environment: process.env.NODE_ENV,
  
  // Performance monitoring
  tracesSampleRate: 1.0,
  
  // Profiling
  profilesSampleRate: 1.0,
  integrations: [
    nodeProfilingIntegration(),
  ],
  
  // Before send
  beforeSend(event, hint) {
    // Add server-specific context
    event.contexts = {
      ...event.contexts,
      server: {
        node_version: process.version,
        platform: process.platform,
        memory_usage: process.memoryUsage(),
      }
    }
    
    return event
  }
})

export default Sentry
```

### Express Integration
```javascript
// server/app.js
import express from 'express'
import Sentry from './sentry'

const app = express()

// Sentry request handler
app.use(Sentry.Handlers.requestHandler())

// Your routes
app.get('/api/users', async (req, res) => {
  try {
    const users = await getUsersFromDatabase()
    res.json(users)
  } catch (error) {
    // Error will be automatically captured
    throw error
  }
})

// Sentry error handler
app.use(Sentry.Handlers.errorHandler())

app.listen(3000)
```

### API Error Handling
```javascript
// pages/api/users.js
import Sentry from '@sentry/nextjs/server'

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const users = await getUsers()
      return res.json(users)
    } else if (req.method === 'POST') {
      const user = await createUser(req.body)
      return res.status(201).json(user)
    }
  } catch (error) {
    // Capture with additional context
    Sentry.captureException(error, {
      tags: {
        api_endpoint: '/api/users',
        method: req.method
      },
      extra: {
        requestBody: req.body,
        headers: req.headers,
        user: req.user
      }
    })
    
    return res.status(500).json({ 
      error: 'Internal server error' 
    })
  }
}
```

## 9. Advanced Features

### Custom Breadcrumbs
```javascript
// Add custom breadcrumbs
Sentry.addBreadcrumb({
  message: 'User clicked subscribe button',
  category: 'ui',
  level: 'info',
  data: {
    button_text: 'Subscribe Now',
    button_location: 'hero_section',
    timestamp: Date.now()
  }
})

// Navigation breadcrumbs
Sentry.addBreadcrumb({
  message: 'Navigated to dashboard',
  category: 'navigation',
  level: 'info',
  data: {
    from: '/home',
    to: '/dashboard',
    trigger: 'click'
  }
})

// HTTP request breadcrumbs
Sentry.addBreadcrumb({
  message: 'API request completed',
  category: 'http',
  level: 'info',
  data: {
    url: '/api/users',
    method: 'GET',
    status_code: 200,
    response_time: 250
  }
})
```

### Custom Event Processor
```javascript
// sentry.client.config.js
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  beforeSend(event, hint) {
    // Sanitize PII
    if (event.exception) {
      const stacktrace = event.exception.values[0].stacktrace
      if (stacktrace) {
        stacktrace.frames = stacktrace.frames.map(frame => ({
          ...frame,
          filename: frame.filename?.replace(/\/home\/[^\/]+\//, '/home/user/'),
          pre_context: frame.pre_context?.map(ctx => 
            ctx.replace(/email:\s*[^\s]+/gi, 'email: [FILTERED]')
          )
        }))
      }
    }
    
    // Add custom fingerprinting
    event.fingerprint = [
      '{{ default }}',
      event.exception?.values[0]?.type,
      event.request?.url
    ]
    
    return event
  }
})
```

### Source Maps Upload
```bash
# Install Sentry CLI
npm install -g @sentry/cli

# Create sentry.properties
echo "defaults.url=https://sentry.io" > sentry.properties
echo "defaults.org=your-org" >> sentry.properties
echo "defaults.project=your-project" >> sentry.properties

# Upload source maps
sentry-cli releases files \
  your-release-version \
  dist/static/js \
  --url-prefix "~/static/js"

# Upload source maps for Next.js
sentry-cli releases files \
  your-release-version \
  .next/static/chunks \
  --url-prefix "~/_next/static/chunks"
```

## 10. Testing & Debugging

### Local Development
```javascript
// sentry.client.config.js
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Debug mode
  debug: process.env.NODE_ENV === 'development',
  
  // Development settings
  environment: process.env.NODE_ENV,
  
  // Test DSN for development
  dsn: process.env.NODE_ENV === 'development' 
    ? 'https://test-dsn@sentry.io/test-project'
    : process.env.NEXT_PUBLIC_SENTRY_DSN
})
```

### Test Error Reporting
```javascript
// Test component
export default function TestSentry() {
  const triggerError = () => {
    throw new Error('Test error for Sentry')
  }
  
  const triggerAsyncError = async () => {
    try {
      await fetch('/invalid-endpoint')
    } catch (error) {
      Sentry.captureException(error)
    }
  }
  
  return (
    <div>
      <button onClick={triggerError}>
        Trigger Sync Error
      </button>
      <button onClick={triggerAsyncError}>
        Trigger Async Error
      </button>
    </div>
  )
}
```

## 11. Monitoring & Alerts

### Custom Alerts
```javascript
// Set up custom metrics for alerting
const measure = Sentry.getMetricAggregator()

// Business metrics
measure.increment('user_registrations', 1, {
  tags: { source: 'web', plan: 'free' }
})

measure.increment('subscription_upgrades', 1, {
  tags: { from_plan: 'free', to_plan: 'premium' }
})

// Error rates
measure.increment('api_errors', 1, {
  tags: { endpoint: '/api/users', error_type: 'validation' }
})

// Performance metrics
measure.timing('database_query', 150, {
  tags: { table: 'users', operation: 'select' }
})
```

### Dashboard Setup
1. Create custom dashboards in Sentry
2. Set up alerts for:
   - Error rate spikes
   - Performance degradation
   - New error types
   - User impact metrics

## 12. Best Practices

### Error Handling
- Don't swallow errors silently
- Provide meaningful error context
- Use appropriate error levels
- Group related errors

### Performance
- Monitor critical user journeys
- Track Core Web Vitals
- Set appropriate sampling rates
- Use custom metrics for business KPIs

### Privacy
- Sanitize PII before sending
- Use session replay sampling
- Implement data retention policies
- Follow GDPR compliance

## 13. Common Issues & Solutions

### Source Maps Not Working
```javascript
// Ensure correct webpack configuration
// next.config.js
const nextConfig = {
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.devtool = 'source-map'
    }
    return config
  }
}
```

### Too Many Events
```javascript
// Filter out noise
beforeSend(event, hint) {
  // Ignore specific errors
  if (event.exception?.values[0]?.type === 'ChunkLoadError') {
    return null
  }
  
  // Rate limit certain events
  if (event.message?.includes('Non-Error promise rejection')) {
    return Math.random() < 0.1 ? event : null // 10% sample rate
  }
  
  return event
}
```

## 14. Integration Examples

### E-commerce Error Tracking
```javascript
// Payment processing errors
try {
  const payment = await processPayment(order)
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      feature: 'payment',
      payment_method: order.paymentMethod,
      amount_range: getAmountRange(order.amount)
    },
    extra: {
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      user_plan: order.user.plan
    }
  })
}

// Inventory management errors
try {
  await updateInventory(productId, quantity)
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      feature: 'inventory',
      operation: 'update_stock'
    },
    extra: {
      product_id: productId,
      quantity_change: quantity,
      current_stock: await getCurrentStock(productId)
    }
  })
}
```

### SaaS Application Monitoring
```javascript
// User authentication errors
const handleAuthError = (error, userContext) => {
  Sentry.captureException(error, {
    tags: {
      feature: 'authentication',
      auth_method: userContext.method,
      failure_reason: error.code
    },
    extra: {
      user_id: userContext.userId,
      ip_address: userContext.ip,
      user_agent: userContext.userAgent
    }
  })
}

// Feature usage tracking
const trackFeatureUsage = (featureName, usageData) => {
  Sentry.addBreadcrumb({
    message: `Feature used: ${featureName}`,
    category: 'feature_usage',
    level: 'info',
    data: {
      feature: featureName,
      ...usageData
    }
  })
}
```

## Resources
- [Sentry Documentation](https://docs.sentry.io)
- [Sentry GitHub](https://github.com/getsentry/sentry)
- [Sentry Discord](https://discord.gg/sentry)
- [Sentry Best Practices](https://docs.sentry.io/product/best-practices/)
