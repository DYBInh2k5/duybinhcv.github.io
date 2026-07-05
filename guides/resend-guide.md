# Resend Email Service Implementation Guide

## Overview
Resend là modern email API service cung cấp transactional emails, email templates, analytics, và reliable email delivery cho applications.

## 1. Setup Account

### Bước 1: Tạo Resend Account
1. Truy cập [resend.com](https://resend.com)
2. Sign up/Sign in
3. Verify email domain:
   - Add domain trong DNS settings
   - Verify với TXT hoặc CNAME record
4. Get API Key từ Dashboard

### Bước 2: Environment Variables
```bash
# .env.local
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_FROM_NAME="Your App Name"
```

## 2. Installation

### Node.js SDK
```bash
npm install resend
# hoặc
yarn add resend
```

### React/Next.js Integration
```bash
npm install resend
# hoặc
yarn add resend
```

## 3. Basic Setup

### Initialize Resend
```javascript
// lib/resend.js
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export default resend
```

### Basic Email Sending
```javascript
// app/api/send-email.js
import resend from '@/lib/resend'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { to, subject, html, text } = req.body

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: [to],
      subject: subject,
      html: html,
      text: text
    })

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    return res.json({ 
      success: true, 
      messageId: data.id 
    })
  } catch (error) {
    console.error('Email sending error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
```

## 4. Email Templates

### HTML Template System
```javascript
// lib/email-templates.js
export const emailTemplates = {
  welcome: (userName) => ({
    subject: 'Welcome to Our Platform!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome, ${userName}! 👋</h1>
          </div>
          <div class="content">
            <p>Thank you for joining our platform! We're excited to have you on board.</p>
            <p>Get started by exploring our features and setting up your profile.</p>
            <a href="https://yourapp.com/get-started" class="button">Get Started</a>
            <p>If you have any questions, feel free to reach out to our support team.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Your App. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Welcome, ${userName}!
      
      Thank you for joining our platform! We're excited to have you on board.
      
      Get started by visiting: https://yourapp.com/get-started
      
      If you have any questions, feel free to reach out to our support team.
      
      Best regards,
      The Your App Team
    `
  }),

  passwordReset: (resetLink, userName) => ({
    subject: 'Reset Your Password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .alert { background: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Password Reset Request</h1>
          <p>Hi ${userName},</p>
          <p>We received a request to reset your password. Click the button below to reset it:</p>
          <div class="alert">
            <strong>This link will expire in 1 hour.</strong>
          </div>
          <a href="${resetLink}" class="button">Reset Password</a>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <div class="footer">
            <p>&copy; 2024 Your App. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Password Reset Request
      
      Hi ${userName},
      
      We received a request to reset your password. Click the link below to reset it:
      
      ${resetLink}
      
      This link will expire in 1 hour.
      
      If you didn't request this password reset, please ignore this email.
      
      Best regards,
      The Your App Team
    `
  }),

  orderConfirmation: (orderDetails) => ({
    subject: `Order Confirmation #${orderDetails.orderId}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .order-details { background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 5px; }
          .item { border-bottom: 1px solid #dee2e6; padding: 15px 0; }
          .item:last-child { border-bottom: none; }
          .total { font-weight: bold; font-size: 18px; text-align: right; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Confirmed! 🎉</h1>
            <p>Order #${orderDetails.orderId}</p>
          </div>
          
          <div class="order-details">
            <h2>Order Details</h2>
            <p><strong>Date:</strong> ${new Date(orderDetails.orderDate).toLocaleDateString()}</p>
            <p><strong>Shipping Address:</strong> ${orderDetails.shippingAddress}</p>
          </div>
          
          <h3>Items Ordered</h3>
          ${orderDetails.items.map(item => `
            <div class="item">
              <p><strong>${item.name}</strong></p>
              <p>Quantity: ${item.quantity} × $${item.price}</p>
            </div>
          `).join('')}
          
          <div class="total">
            Total: $${orderDetails.total}
          </div>
          
          <div class="footer">
            <p>&copy; 2024 Your App. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Order Confirmation
      
      Order #${orderDetails.orderId}
      Date: ${new Date(orderDetails.orderDate).toLocaleDateString()}
      
      Items Ordered:
      ${orderDetails.items.map(item => 
        `${item.name} - Quantity: ${item.quantity} × $${item.price}`
      ).join('\n')}
      
      Total: $${orderDetails.total}
      
      Shipping Address:
      ${orderDetails.shippingAddress}
      
      Thank you for your order!
      
      Best regards,
      The Your App Team
    `
  })
}
```

### Template Usage
```javascript
// lib/email-service.js
import resend from '@/lib/resend'
import { emailTemplates } from './email-templates'

class EmailService {
  async sendWelcomeEmail(userEmail, userName) {
    const template = emailTemplates.welcome(userName)
    
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: [userEmail],
      ...template
    })

    return { data, error }
  }

  async sendPasswordResetEmail(userEmail, userName, resetToken) {
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`
    const template = emailTemplates.passwordReset(resetLink, userName)
    
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: [userEmail],
      ...template
    })

    return { data, error }
  }

  async sendOrderConfirmationEmail(userEmail, orderDetails) {
    const template = emailTemplates.orderConfirmation(orderDetails)
    
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: [userEmail],
      ...template
    })

    return { data, error }
  }
}

export const emailService = new EmailService()
```

## 5. Advanced Features

### Batch Email Sending
```javascript
// lib/batch-email.js
import resend from '@/lib/resend'

class BatchEmailService {
  async sendBulkEmails(recipients, template) {
    const results = []
    
    // Process in batches to avoid rate limits
    const batchSize = 100
    
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (recipient) => {
        try {
          const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL,
            to: [recipient.email],
            ...template(recipient)
          })
          
          return {
            email: recipient.email,
            success: !error,
            messageId: data?.id,
            error: error?.message
          }
        } catch (error) {
          return {
            email: recipient.email,
            success: false,
            error: error.message
          }
        }
      })
      
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
      
      // Rate limiting: wait between batches
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    return {
      total: recipients.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    }
  }
}

export const batchEmailService = new BatchEmailService()
```

### Email Attachments
```javascript
// lib/email-attachments.js
import resend from '@/lib/resend'
import fs from 'fs'
import path from 'path'

class AttachmentEmailService {
  async sendEmailWithAttachments(to, subject, html, attachments) {
    const emailData = {
      from: process.env.RESEND_FROM_EMAIL,
      to: [to],
      subject: subject,
      html: html,
      attachments: attachments.map(attachment => ({
        filename: attachment.filename,
        content: attachment.content, // Buffer or base64 string
        path: attachment.path // Optional: file path
      }))
    }

    const { data, error } = await resend.emails.send(emailData)
    return { data, error }
  }

  async sendInvoiceEmail(to, invoiceData) {
    // Generate PDF invoice (example with a PDF library)
    const pdfBuffer = await this.generateInvoicePDF(invoiceData)
    
    const attachments = [{
      filename: `invoice-${invoiceData.invoiceNumber}.pdf`,
      content: pdfBuffer
    }]

    const template = {
      subject: `Invoice #${invoiceData.invoiceNumber}`,
      html: `
        <h1>Invoice #${invoiceData.invoiceNumber}</h1>
        <p>Dear ${invoiceData.customerName},</p>
        <p>Please find your invoice attached.</p>
        <p>Amount due: $${invoiceData.amount}</p>
        <p>Due date: ${new Date(invoiceData.dueDate).toLocaleDateString()}</p>
      `
    }

    return await this.sendEmailWithAttachments(to, template.subject, template.html, attachments)
  }

  async generateInvoicePDF(invoiceData) {
    // This would use a PDF generation library like puppeteer, pdfkit, etc.
    // For now, return a placeholder buffer
    return Buffer.from('PDF content here')
  }
}

export const attachmentEmailService = new AttachmentEmailService()
```

### Scheduled Emails
```javascript
// lib/scheduled-emails.js
import cron from 'node-cron'
import { emailService } from './email-service'

class ScheduledEmailService {
  constructor() {
    this.setupScheduledTasks()
  }

  setupScheduledTasks() {
    // Daily digest email
    cron.schedule('0 9 * * *', async () => {
      await this.sendDailyDigest()
    })

    // Weekly newsletter
    cron.schedule('0 9 * * 1', async () => {
      await this.sendWeeklyNewsletter()
    })

    // Birthday emails
    cron.schedule('0 9 * * *', async () => {
      await this.sendBirthdayEmails()
    })
  }

  async sendDailyDigest() {
    try {
      const users = await this.getUsersForDigest()
      
      for (const user of users) {
        const digestContent = await this.generateDigestContent(user)
        
        await emailService.sendCustomEmail(user.email, {
          subject: 'Your Daily Digest',
          html: digestContent
        })
      }
      
      console.log(`Daily digest sent to ${users.length} users`)
    } catch (error) {
      console.error('Error sending daily digest:', error)
    }
  }

  async sendWeeklyNewsletter() {
    try {
      const subscribers = await this.getNewsletterSubscribers()
      const newsletterContent = await this.generateNewsletterContent()
      
      for (const subscriber of subscribers) {
        await emailService.sendCustomEmail(subscriber.email, {
          subject: 'This Week in Tech',
          html: newsletterContent
        })
      }
      
      console.log(`Weekly newsletter sent to ${subscribers.length} subscribers`)
    } catch (error) {
      console.error('Error sending weekly newsletter:', error)
    }
  }

  async sendBirthdayEmails() {
    try {
      const usersWithBirthday = await this.getUsersWithBirthdayToday()
      
      for (const user of usersWithBirthday) {
        const birthdayTemplate = {
          subject: 'Happy Birthday! 🎂',
          html: `
            <h2>Happy Birthday, ${user.name}! 🎉</h2>
            <p>We hope you have a wonderful day filled with joy and celebration.</p>
            <p>As a birthday gift, here's a special discount code for your next purchase:</p>
            <div style="background: #f0f0f0; padding: 20px; border-radius: 5px; text-align: center;">
              <h3>BIRTHDAY20</h3>
              <p>20% off your next order!</p>
            </div>
          `
        }
        
        await emailService.sendCustomEmail(user.email, birthdayTemplate)
      }
      
      console.log(`Birthday emails sent to ${usersWithBirthday.length} users`)
    } catch (error) {
      console.error('Error sending birthday emails:', error)
    }
  }

  // Helper methods (would connect to your database)
  async getUsersForDigest() {
    // Return users who opted in for daily digest
    return []
  }

  async getNewsletterSubscribers() {
    // Return newsletter subscribers
    return []
  }

  async getUsersWithBirthdayToday() {
    // Return users with birthday today
    return []
  }

  async generateDigestContent(user) {
    // Generate personalized digest content
    return '<p>Your daily digest content here...</p>'
  }

  async generateNewsletterContent() {
    // Generate newsletter content
    return '<p>Newsletter content here...</p>'
  }
}

export const scheduledEmailService = new ScheduledEmailService()
```

## 6. Email Analytics

### Track Email Events
```javascript
// lib/email-analytics.js
import resend from '@/lib/resend'

class EmailAnalytics {
  constructor() {
    this.setupWebhookHandler()
  }

  setupWebhookHandler() {
    // This would be set up in your API routes
    // See webhook section below
  }

  async getEmailAnalytics(emailId) {
    try {
      const analytics = await resend.emails.get(emailId)
      return analytics
    } catch (error) {
      console.error('Error fetching email analytics:', error)
      return null
    }
  }

  async getBatchAnalytics(emailIds) {
    const analyticsPromises = emailIds.map(id => this.getEmailAnalytics(id))
    const analyticsResults = await Promise.all(analyticsPromises)
    
    return {
      total: emailIds.length,
      delivered: analyticsResults.filter(a => a?.last_event?.type === 'delivered').length,
      opened: analyticsResults.filter(a => a?.last_event?.type === 'opened').length,
      clicked: analyticsResults.filter(a => a?.last_event?.type === 'clicked').length,
      bounced: analyticsResults.filter(a => a?.last_event?.type === 'bounced').length,
      results: analyticsResults
    }
  }

  generateAnalyticsReport(analytics) {
    return {
      summary: {
        total: analytics.total,
        delivered: analytics.delivered,
        opened: analytics.opened,
        clicked: analytics.clicked,
        bounced: analytics.bounced,
        deliveryRate: (analytics.delivered / analytics.total * 100).toFixed(2) + '%',
        openRate: (analytics.opened / analytics.delivered * 100).toFixed(2) + '%',
        clickRate: (analytics.clicked / analytics.opened * 100).toFixed(2) + '%'
      },
      details: analytics.results
    }
  }
}

export const emailAnalytics = new EmailAnalytics()
```

### Webhook Handler
```javascript
// app/api/email-webhook.js
import { emailAnalytics } from '@/lib/email-analytics'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const webhookData = req.body
  
  // Verify webhook signature (recommended)
  const signature = req.headers['resend-signature']
  if (!this.verifyWebhookSignature(JSON.stringify(webhookData), signature)) {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  try {
    // Process webhook events
    switch (webhookData.type) {
      case 'email.delivered':
        await this.handleDelivered(webhookData)
        break
        
      case 'email.opened':
        await this.handleOpened(webhookData)
        break
        
      case 'email.clicked':
        await this.handleClicked(webhookData)
        break
        
      case 'email.bounced':
        await this.handleBounced(webhookData)
        break
        
      default:
        console.log('Unhandled webhook type:', webhookData.type)
    }

    res.status(200).json({ received: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

verifyWebhookSignature(payload, signature) {
  // Implement signature verification using your webhook secret
  // This is a placeholder - implement proper verification
  return true
}

async function handleDelivered(data) {
  console.log('Email delivered:', data.data.email_id)
  // Update database, trigger notifications, etc.
}

async function handleOpened(data) {
  console.log('Email opened:', data.data.email_id)
  // Track open rates, update user engagement, etc.
}

async function handleClicked(data) {
  console.log('Email clicked:', data.data.email_id)
  // Track click-through rates, update analytics, etc.
}

async function handleBounced(data) {
  console.log('Email bounced:', data.data.email_id)
  // Handle bounced emails, update user status, etc.
}
```

## 7. Error Handling & Retry Logic

### Robust Email Service
```javascript
// lib/robust-email-service.js
import resend from '@/lib/resend'

class RobustEmailService {
  constructor() {
    this.maxRetries = 3
    this.retryDelay = 1000 // 1 second
  }

  async sendEmailWithRetry(emailData, retries = 0) {
    try {
      const { data, error } = await resend.emails.send(emailData)
      
      if (error) {
        // Check if error is retryable
        if (this.isRetryableError(error) && retries < this.maxRetries) {
          console.log(`Email send failed, retrying... (${retries + 1}/${this.maxRetries})`)
          
          // Exponential backoff
          const delay = this.retryDelay * Math.pow(2, retries)
          await new Promise(resolve => setTimeout(resolve, delay))
          
          return await this.sendEmailWithRetry(emailData, retries + 1)
        }
        
        throw error
      }

      return { success: true, data }
    } catch (error) {
      console.error('Email sending error:', error)
      throw error
    }
  }

  isRetryableError(error) {
    const retryableErrors = [
      'rate_limit_exceeded',
      'temporary_failure',
      'timeout',
      'connection_error'
    ]
    
    return retryableErrors.some(retryableError => 
      error.message?.toLowerCase().includes(retryableError)
    )
  }

  async sendEmailWithFallback(emailData) {
    try {
      // Try primary email service
      return await this.sendEmailWithRetry(emailData)
    } catch (error) {
      console.error('Primary email service failed:', error)
      
      // Fallback to backup email service
      return await this.sendBackupEmail(emailData)
    }
  }

  async sendBackupEmail(emailData) {
    // Implement backup email service (SendGrid, AWS SES, etc.)
    console.log('Using backup email service')
    
    // Placeholder implementation
    return { 
      success: true, 
      service: 'backup',
      messageId: 'backup-' + Date.now()
    }
  }
}

export const robustEmailService = new RobustEmailService()
```

## 8. Testing & Development

### Email Testing Setup
```javascript
// lib/email-testing.js
class EmailTestingService {
  constructor() {
    this.testMode = process.env.NODE_ENV === 'development'
    this.testEmails = []
  }

  async sendTestEmail(emailData) {
    if (this.testMode) {
      // In development, store emails for inspection
      const testEmail = {
        id: 'test-' + Date.now(),
        timestamp: new Date().toISOString(),
        ...emailData
      }
      
      this.testEmails.push(testEmail)
      
      return { 
        success: true, 
        data: { id: testEmail.id },
        testMode: true 
      }
    }

    // In production, use real email service
    return await resend.emails.send(emailData)
  }

  getTestEmails() {
    return this.testEmails
  }

  clearTestEmails() {
    this.testEmails = []
  }

  async previewTemplate(templateName, templateData) {
    // Preview email template without sending
    const template = emailTemplates[templateName]
    if (!template) {
      throw new Error(`Template ${templateName} not found`)
    }

    return template(templateData)
  }
}

export const emailTestingService = new EmailTestingService()
```

### Email Preview Component
```javascript
// components/EmailPreview.jsx
'use client'
import { useState } from 'react'
import { emailTestingService } from '@/lib/email-testing'

export default function EmailPreview() {
  const [templateName, setTemplateName] = useState('welcome')
  const [templateData, setTemplateData] = useState({ userName: 'John Doe' })
  const [preview, setPreview] = useState(null)

  const handlePreview = async () => {
    try {
      const emailPreview = await emailTestingService.previewTemplate(templateName, templateData)
      setPreview(emailPreview)
    } catch (error) {
      console.error('Error previewing template:', error)
    }
  }

  return (
    <div className="email-preview">
      <h2>Email Template Preview</h2>
      
      <div className="controls">
        <div>
          <label>Template:</label>
          <select 
            value={templateName} 
            onChange={(e) => setTemplateName(e.target.value)}
          >
            <option value="welcome">Welcome Email</option>
            <option value="passwordReset">Password Reset</option>
            <option value="orderConfirmation">Order Confirmation</option>
          </select>
        </div>
        
        <div>
          <label>User Name:</label>
          <input 
            type="text"
            value={templateData.userName}
            onChange={(e) => setTemplateData({ ...templateData, userName: e.target.value })}
          />
        </div>
        
        <button onClick={handlePreview}>
          Preview Email
        </button>
      </div>
      
      {preview && (
        <div className="preview">
          <h3>Preview:</h3>
          <div dangerouslySetInnerHTML={{ __html: preview.html }} />
          <details>
            <summary>Text Version</summary>
            <pre>{preview.text}</pre>
          </details>
        </div>
      )}
    </div>
  )
}
```

## 9. Best Practices

### Email Design Best Practices
```javascript
const emailBestPractices = {
  // Responsive design
  responsive: {
    maxWidth: '600px',
    useTables: true,
    mobileFirst: true
  },
  
  // Deliverability
  deliverability: {
    includePlainText: true,
    avoidSpamWords: true,
    useAuthentication: true,
    verifyDomain: true
  },
  
  // Performance
  performance: {
    optimizeImages: true,
    minifyHTML: true,
    useCDN: true
  },
  
  // Personalization
  personalization: {
    useRecipientName: true,
    dynamicContent: true,
    segmentation: true
  }
}
```

### Security Considerations
```javascript
const securityConsiderations = {
  // Input validation
  validateInput: (emailData) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(emailData.to)
  },
  
  // Rate limiting
  rateLimit: {
    perEmail: 10, // emails per hour
    perIP: 100,   // emails per hour
    windowMs: 60 * 60 * 1000 // 1 hour
  },
  
  // Content security
  contentSecurity: {
    sanitizeHTML: true,
    escapeUserInput: true,
    validateLinks: true
  }
}
```

## 10. Common Use Cases

### User Registration Flow
```javascript
// lib/user-registration-emails.js
import { emailService } from './email-service'

class UserRegistrationEmails {
  async sendWelcomeEmail(user) {
    await emailService.sendWelcomeEmail(user.email, user.name)
  }

  async sendVerificationEmail(user, verificationToken) {
    const verificationLink = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${verificationToken}`
    
    await emailService.sendCustomEmail(user.email, {
      subject: 'Verify Your Email Address',
      html: `
        <h2>Verify Your Email</h2>
        <p>Hi ${user.name},</p>
        <p>Please click the link below to verify your email address:</p>
        <a href="${verificationLink}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
          Verify Email
        </a>
        <p>This link will expire in 24 hours.</p>
      `
    })
  }

  async sendOnboardingSequence(user) {
    const emails = [
      { delay: 0, template: 'welcome', data: { userName: user.name } },
      { delay: 24 * 60 * 60 * 1000, template: 'getting-started', data: { userName: user.name } },
      { delay: 3 * 24 * 60 * 60 * 1000, template: 'tips', data: { userName: user.name } },
      { delay: 7 * 24 * 60 * 60 * 1000, template: 'feedback', data: { userName: user.name } }
    ]

    for (const email of emails) {
      setTimeout(async () => {
        await emailService.sendCustomEmail(user.email, {
          subject: email.subject,
          html: email.html
        })
      }, email.delay)
    }
  }
}

export const userRegistrationEmails = new UserRegistrationEmails()
```

### E-commerce Email System
```javascript
// lib/ecommerce-emails.js
import { emailService } from './email-service'

class EcommerceEmails {
  async sendOrderConfirmation(order, customer) {
    const orderDetails = {
      orderId: order.id,
      orderDate: order.createdAt,
      items: order.items,
      total: order.total,
      shippingAddress: order.shippingAddress
    }

    await emailService.sendOrderConfirmationEmail(customer.email, orderDetails)
  }

  async sendShippingNotification(order, customer) {
    await emailService.sendCustomEmail(customer.email, {
      subject: `Your Order #${order.id} Has Shipped!`,
      html: `
        <h2>Good News! Your Order Has Shipped 📦</h2>
        <p>Hi ${customer.name},</p>
        <p>Your order #${order.id} has been shipped and is on its way to you.</p>
        <p><strong>Tracking Number:</strong> ${order.trackingNumber}</p>
        <p><strong>Estimated Delivery:</strong> ${new Date(order.estimatedDelivery).toLocaleDateString()}</p>
        <a href="${order.trackingUrl}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
          Track Package
        </a>
      `
    })
  }

  async sendAbandonedCartEmail(cart, customer) {
    const cartItems = cart.items.map(item => 
      `<li>${item.name} - $${item.price} (Quantity: ${item.quantity})</li>`
    ).join('')

    await emailService.sendCustomEmail(customer.email, {
      subject: 'Did You Forget Something? 🛒',
      html: `
        <h2>Your Cart is Waiting for You!</h2>
        <p>Hi ${customer.name},</p>
        <p>We noticed you have items in your cart. Don't miss out!</p>
        <ul>${cartItems}</ul>
        <p><strong>Total:</strong> $${cart.total}</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/cart" style="background: #ffc107; color: black; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
          Complete Your Order
        </a>
        <p>This offer expires in 24 hours.</p>
      `
    })
  }
}

export const ecommerceEmails = new EcommerceEmails()
```

## Resources
- [Resend Documentation](https://resend.com/docs)
- [Resend API Reference](https://resend.com/docs/api-reference)
- [Resend GitHub](https://github.com/resend)
- [Email Marketing Best Practices](https://resend.com/blog/email-marketing-best-practices)
