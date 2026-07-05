# Supabase Blog Setup Guide

## Overview
Thay thế Firebase bằng Supabase cho blog system của bạn. Supabase cung cấp PostgreSQL database, authentication, storage, và real-time subscriptions với open-source alternative.

## Step 1: Tạo Supabase Project

1. Truy cập [supabase.com](https://supabase.com)
2. Sign up/Sign in
3. Click "New Project"
4. Đặt tên project: `my-cv-blog`
5. Đặt database password (lưu lại!)
6. Chọn region gần nhất (Singapore recommended)

## Step 2: Get API Keys

1. Vào Project Settings > API
2. Copy **Project URL** và **anon public key**
3. Lưu vào environment variables:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Step 3: Update Blog Configuration

1. Mở `src/blog.html` trong editor
2. Tìm `firebaseConfig` object trong script section
3. Thay thế bằng Supabase config:

```javascript
// Tìm đoạn này trong blog.html
const firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// THAY THẾ BẰNG:
const supabaseConfig = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
};
```

## Step 4: Cập nhật Blog Functions

1. Thay thế các Firebase functions bằng Supabase functions:

```javascript
// Thay thế import
// import { initializeApp } from "firebase/app";
// import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
// import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { createClient } from '@supabase/supabase-js';

// Thay thế initialization
// const app = initializeApp(firebaseConfig);
// const db = getFirestore(app);
// const storage = getStorage(app);

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
```

## Step 5: Cập nhật Admin Functions

### Tạo Table trong Supabase
1. Vào Supabase Dashboard > SQL Editor
2. Run query sau để tạo table:

```sql
-- Tạo blog_posts table
CREATE TABLE IF NOT EXISTS blog_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    cover_image TEXT,
    published BOOLEAN DEFAULT FALSE,
    featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    author_id UUID REFERENCES auth.users(id)
);

-- Tạo blog_categories table
CREATE TABLE IF NOT EXISTS blog_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tạo blog_tags table
CREATE TABLE IF NOT EXISTS blog_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    color TEXT DEFAULT '#6B7280',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tạo blog_post_categories junction table
CREATE TABLE IF NOT EXISTS blog_post_categories (
    post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
    category_id UUID REFERENCES blog_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, category_id)
);

-- Tạo blog_post_tags junction table
CREATE TABLE IF NOT EXISTS blog_post_tags (
    post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES blog_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);

-- Enable Row Level Security
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_tags ENABLE ROW LEVEL SECURITY;
```

### Row Level Security Policies
```sql
-- Public có thể đọc published posts
CREATE POLICY "Public posts are viewable by everyone" ON blog_posts
    FOR SELECT USING (published = true);

-- Authenticated users có thể quản lý posts
CREATE POLICY "Users can manage their own posts" ON blog_posts
    FOR ALL USING (auth.uid() = author_id);

-- Public có thể đọc categories
CREATE POLICY "Categories are viewable by everyone" ON blog_categories
    FOR SELECT USING (true);

-- Authenticated users có thể quản lý categories
CREATE POLICY "Authenticated users can manage categories" ON blog_categories
    FOR ALL USING (auth.role() = 'authenticated');

-- Public có thể đọc tags
CREATE POLICY "Tags are viewable by everyone" ON blog_tags
    FOR SELECT USING (true);

-- Authenticated users có thể quản lý tags
CREATE POLICY "Authenticated users can manage tags" ON blog_tags
    FOR ALL USING (auth.role() = 'authenticated');
```

## Step 6: Cập nhật Blog Functions

Thay thế các Firebase functions trong blog.html:

```javascript
// Thay thế saveBlog function
async function saveBlogPost(postData) {
    try {
        const { data, error } = await supabase
            .from('blog_posts')
            .insert([{
                title: postData.title,
                slug: postData.slug || generateSlug(postData.title),
                content: postData.content,
                excerpt: postData.excerpt || generateExcerpt(postData.content),
                cover_image: postData.cover_image || '',
                published: postData.published || false,
                featured: postData.featured || false,
                author_id: getCurrentUserId() // Implement this function
            }])
            .select();

        if (error) {
            console.error('Error saving post:', error);
            showNotification('Error saving post', 'error');
            return null;
        }

        showNotification('Blog post saved successfully!', 'success');
        return data[0];
    } catch (error) {
        console.error('Error in saveBlogPost:', error);
        showNotification('Error saving post', 'error');
        return null;
    }
}

// Thay thế loadBlogPosts function
async function loadBlogPosts() {
    try {
        const { data, error } = await supabase
            .from('blog_posts')
            .select(`
                *,
                blog_categories(name, slug),
                blog_post_categories!inner(blog_categories(id, name, slug))
            `)
            .eq('published', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading posts:', error);
            return [];
        }

        return data.map(post => ({
            ...post,
            category: post.blog_categories || null
        }));
    } catch (error) {
        console.error('Error in loadBlogPosts:', error);
        return [];
    }
}

// Thay thế deleteBlogPost function
async function deleteBlogPost(postId) {
    try {
        const { error } = await supabase
            .from('blog_posts')
            .delete()
            .eq('id', postId);

        if (error) {
            console.error('Error deleting post:', error);
            showNotification('Error deleting post', 'error');
            return false;
        }

        showNotification('Blog post deleted successfully!', 'success');
        return true;
    } catch (error) {
        console.error('Error in deleteBlogPost:', error);
        showNotification('Error deleting post', 'error');
        return false;
    }
}

// Thay thế uploadCoverImage function
async function uploadCoverImage(file) {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `cover-${Date.now()}.${fileExt}`;
        
        const { data, error } = await supabase.storage
            .from('blog-images')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (error) {
            console.error('Error uploading image:', error);
            return null;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('blog-images')
            .getPublicUrl(fileName);

        return publicUrl;
    } catch (error) {
        console.error('Error in uploadCoverImage:', error);
        return null;
    }
}

// Helper functions
function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

function generateExcerpt(content, length = 150) {
    const plainText = content.replace(/<[^>]*>/g, '');
    return plainText.length > length 
        ? plainText.substring(0, length) + '...'
        : plainText;
}

function getCurrentUserId() {
    // Implement user authentication logic
    // Có thể lấy từ Clerk hoặc localStorage
    return localStorage.getItem('userId') || 'anonymous';
}
```

## Step 7: Cập nhật Admin Panel

1. Thay thế các Firebase references trong admin panel
2. Cập nhật save/load functions để sử dụng Supabase
3. Test admin functionality

## Step 8: Real-time Features (Optional)

### Thêm real-time subscriptions
```javascript
// Real-time blog updates
function subscribeToBlogUpdates() {
    const subscription = supabase
        .channel('blog_posts')
        .on('postgres_changes', 
            { 
                event: '*', 
                schema: 'public', 
                table: 'blog_posts' 
            },
            (payload) => {
                console.log('Blog update:', payload);
                handleRealtimeUpdate(payload);
            }
        )
        .subscribe();

    return subscription;
}

function handleRealtimeUpdate(payload) {
    switch (payload.eventType) {
        case 'INSERT':
            console.log('New post published:', payload.new);
            break;
        case 'UPDATE':
            console.log('Post updated:', payload.new);
            break;
        case 'DELETE':
            console.log('Post deleted:', payload.old);
            break;
    }
}
```

## Step 9: Migration Script

### Export từ Firebase (nếu cần)
```javascript
// Script để export data từ Firebase
async function exportFromFirebase() {
    const posts = await getDocs(collection(db, 'blog_posts'));
    const exportData = posts.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
    
    console.log('Exported posts:', exportData);
    return exportData;
}

// Import vào Supabase
async function importToSupabase(posts) {
    for (const post of posts) {
        await supabase
            .from('blog_posts')
            .insert([{
                title: post.title,
                slug: post.slug || generateSlug(post.title),
                content: post.content,
                excerpt: post.excerpt || generateExcerpt(post.content),
                cover_image: post.cover_image || '',
                published: post.published || false,
                featured: post.featured || false,
                created_at: post.createdAt,
                updated_at: post.updatedAt
            }]);
    }
    
    console.log('Imported posts to Supabase');
}
```

## Step 10: Testing

### Test Local Development
1. Start local development server
2. Test admin panel functionality
3. Test blog post creation/editing
4. Test image uploads
5. Verify data trong Supabase dashboard

### Test Production
1. Deploy đến production
2. Test với production database
3. Verify real-time updates
4. Monitor với Supabase logs

## Benefits của Supabase so với Firebase

| Feature | Firebase | Supabase | Winner |
|---------|----------|-----------|---------|
| Database | Firestore (NoSQL) | PostgreSQL (SQL) | Supabase |
| Queries | Limited | Full SQL support | Supabase |
| Pricing | Complex pricing | Simple pricing | Supabase |
| Open Source | No | Yes | Supabase |
| Row Level Security | No | Yes | Supabase |
| Real-time | Yes | Yes | Tie |
| Storage | Yes | Yes | Tie |
| Edge Functions | Yes | Yes | Tie |

## Cleanup

### Remove Firebase dependencies
```bash
# Uninstall Firebase packages
npm uninstall firebase @firebase/app @firebase/firestore @firebase/storage

# Remove Firebase config files
rm -f firebaseConfig.js
```

## Next Steps

1. **Backup current data** từ Firebase
2. **Run migration script** để import vào Supabase
3. **Update all references** trong codebase
4. **Test thoroughly** trước khi deploy
5. **Monitor performance** với Supabase dashboard

## Troubleshooting

### Common Issues:
- **CORS errors:** Enable CORS trong Supabase settings
- **RLS policies:** Make sure policies are correct
- **Environment variables:** Check .env.local configuration
- **Authentication:** Implement proper user management

### Debug Tools:
- Supabase Dashboard logs
- Browser console errors
- Network tab inspection
- Local development server logs

---

**Chúc mừng!** Bạn đã chuyển sang Supabase thành công. Giờ bạn có thể tận hưởng sức mạnh của PostgreSQL và các tính năng hiện đại của Supabase! 🚀
