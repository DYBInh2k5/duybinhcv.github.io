# Supabase Implementation Guide

## Overview
Supabase là open-source alternative của Firebase, cung cấp PostgreSQL database, authentication, storage, và real-time subscriptions.

## 1. Setup Project

### Bước 1: Tạo Project
1. Truy cập [supabase.com](https://supabase.com)
2. Sign up/Sign in
3. Click "New Project"
4. Đặt tên project: `my-app`
5. Chọn database password (lưu lại!)
6. Chọn region gần nhất (Singapore)

### Bước 2: Get API Keys
1. Vào Project Settings > API
2. Copy **Project URL** và **anon public key**
3. Lưu vào environment variables:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 2. Database Setup

### Tạo Tables qua Dashboard
```sql
-- Users table
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Posts table
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  content TEXT,
  published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
```

### Row Level Security Policies
```sql
-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Posts policies
CREATE POLICY "Anyone can view published posts" ON posts
  FOR SELECT USING (published = TRUE);

CREATE POLICY "Users can manage own posts" ON posts
  FOR ALL USING (auth.uid() = user_id);
```

## 3. Client-side Integration

### Install Supabase Client
```bash
npm install @supabase/supabase-js
```

### Initialize Supabase
```javascript
// lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Authentication Examples
```javascript
import { supabase } from '@/lib/supabase'

// Sign up
const signUp = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: 'User Name'
      }
    }
  })
  return { data, error }
}

// Sign in
const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  return { data, error }
}

// Sign out
const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

// Get current user
const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
```

### Database Operations
```javascript
// Create post
const createPost = async (postData) => {
  const { data, error } = await supabase
    .from('posts')
    .insert([postData])
    .select()
  return { data, error }
}

// Get posts
const getPosts = async (publishedOnly = true) => {
  let query = supabase
    .from('posts')
    .select(`
      *,
      users (
        name,
        avatar_url
      )
    `)
    .order('created_at', { ascending: false })
  
  if (publishedOnly) {
    query = query.eq('published', true)
  }
  
  const { data, error } = await query
  return { data, error }
}

// Update post
const updatePost = async (id, updates) => {
  const { data, error } = await supabase
    .from('posts')
    .update(updates)
    .eq('id', id)
    .select()
  return { data, error }
}

// Delete post
const deletePost = async (id) => {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', id)
  return { error }
}
```

## 4. Real-time Subscriptions

```javascript
// Listen to new posts
const subscribeToPosts = () => {
  const subscription = supabase
    .channel('posts')
    .on('postgres_changes', 
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'posts' 
      },
      (payload) => {
        console.log('New post:', payload.new)
        // Update UI with new post
      }
    )
    .subscribe()

  return subscription
}

// Listen to user profile changes
const subscribeToUser = (userId) => {
  return supabase
    .channel(`user:${userId}`)
    .on('postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'users',
        filter: `id=eq.${userId}`
      },
      (payload) => {
        console.log('User updated:', payload)
        // Update user profile in UI
      }
    )
    .subscribe()
}
```

## 5. File Upload (Storage)

```javascript
// Upload avatar
const uploadAvatar = async (file, userId) => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}/avatar.${fileExt}`
  
  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    })
  
  if (error) return { error }
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName)
  
  return { data: publicUrl, error: null }
}

// Delete file
const deleteFile = async (path) => {
  const { error } = await supabase.storage
    .from('avatars')
    .remove([path])
  return { error }
}
```

## 6. Server-side (API Routes)

```javascript
// pages/api/posts.js
import { supabase } from '@/lib/supabase'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      return res.status(500).json({ error: error.message })
    }
    
    return res.status(200).json(data)
  }
  
  if (req.method === 'POST') {
    const { title, content, published } = req.body
    
    const { data, error } = await supabase
      .from('posts')
      .insert([{ title, content, published }])
      .select()
    
    if (error) {
      return res.status(500).json({ error: error.message })
    }
    
    return res.status(201).json(data[0])
  }
  
  return res.status(405).json({ error: 'Method not allowed' })
}
```

## 7. Best Practices

### Security
- Luôn enable Row Level Security (RLS)
- Sử dụng service role key chỉ ở server-side
- Validate input data trước khi insert/update
- Sử dụng environment variables cho sensitive data

### Performance
- Sử dụng database indexes cho columns thường query
- Limit results với `.limit()`
- Sử dụng select cụ thể thay vì `select('*')`
- Cache frequent queries

### Error Handling
```javascript
const handleSupabaseError = (error) => {
  console.error('Supabase error:', error)
  
  switch (error.code) {
    case 'PGRST116':
      return 'Invalid API key'
    case 'PGRST301':
      return 'Resource not found'
    case '23505':
      return 'Duplicate entry'
    default:
      return 'Database error occurred'
  }
}
```

## 8. Deployment

### Environment Variables
```bash
# Production
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_prod_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_prod_service_key
```

### Migration Scripts
```sql
-- migrations/001_create_users.sql
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 9. Common Use Cases

### User Profile System
- Authentication với Supabase Auth
- Profile data trong users table
- Avatar uploads với Storage
- Real-time profile updates

### Blog/CMS System
- Posts với categories và tags
- Draft/published states
- Real-time comments
- Image uploads

### E-commerce
- Products và inventory
- Orders và payments
- User profiles và addresses
- Real-time stock updates

## Resources
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase GitHub](https://github.com/supabase/supabase)
- [Supabase Discord Community](https://discord.supabase.com)
