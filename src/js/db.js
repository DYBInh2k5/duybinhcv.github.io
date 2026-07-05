(function(){
    // db.js - central Supabase init and small helper API for blog
    // Usage:
    // 1) In your HTML (e.g., blog.html) keep the Supabase SDK <script> tags
    // 2) In same HTML define `const supabaseConfig = { ... }` with your project values (or replace values in SUPABASE_BLOG_SETUP.md guidance)
    // 3) Include this script AFTER Supabase SDK scripts
    // This file will initialize Supabase and expose `window.db` and `window.SupabaseAPI` helpers.

    const cfg = window.supabaseConfig || null;
    let initialized = false;

    function isPlaceholder(c){
        if (!c) return true;
        return !c.url || c.url.includes('YOUR_SUPABASE_URL') || c.anonKey.includes('YOUR_SUPABASE_ANON_KEY');
    }

    function init(){
        if (!cfg || isPlaceholder(cfg)){
            console.info('Supabase config missing or placeholder; Supabase will NOT be initialized. Follow SUPABASE_BLOG_SETUP.md to enable it.');
            return;
        }
        if (!window.supabase){
            console.warn('Supabase SDK not found. Ensure @supabase/supabase-js is loaded before db.js');
            return;
        }
        try{
            // initialize only once
            if (!window.supabaseClient) {
                window.supabaseClient = window.supabase.createClient(cfg.url, cfg.anonKey);
                window.db = window.supabaseClient;
                
                // init auth if available
                try{
                    if (window.supabase.auth) {
                        window.auth = window.supabaseClient.auth;
                        // listen for auth changes
                        window.supabase.auth.onAuthStateChange((user) => {
                            window.currentUser = user || null;
                            // dispatch event for other modules
                            window.dispatchEvent(new CustomEvent('supabaseAuthStateChanged', { detail: { user } }));
                        });
                    }
                }catch(e){
                    console.warn('Supabase Auth not available or failed to init:', e);
                }
                initialized = true;
                console.info('Supabase initialized (db available).');
            }
        }catch(err){
            console.error('Error initializing Supabase:', err);
        }
    }

    // helper API using Supabase client (matches existing code structure)
    const SupabaseAPI = {
        isAvailable: () => !!window.db,
        
        // Auth helpers
        isSignedIn: () => !!window.currentUser,
        getCurrentUser: () => window.currentUser || null,
        
        // Auth methods (if available)
        signInWithGoogle: async () => {
            if (!window.supabase.auth) throw new Error('Supabase Auth not initialized');
            const { data, error } = await window.supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/blog.html`
                }
            });
            return { data, error };
        },
        signOut: async () => {
            if (!window.supabase.auth) throw new Error('Supabase Auth not initialized');
            return await window.supabase.auth.signOut();
        },
        
        // Post helpers
        addPost: async (post) => {
            if (!window.db) throw new Error('Supabase not initialized');
            
            const { data, error } = await window.db
                .from('blog_posts')
                .insert([{
                    title: post.title,
                    slug: post.slug || generateSlug(post.title),
                    content: post.content,
                    excerpt: post.excerpt || generateExcerpt(post.content),
                    cover_image: post.cover_image || '',
                    published: post.published || false,
                    featured: post.featured || false,
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
        },
        
        getAllPosts: async () => {
            if (!window.db) throw new Error('Supabase not initialized');
            
            const { data, error } = await window.db
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
        },
        
        clearAllPosts: async () => {
            if (!window.db) throw new Error('Supabase not initialized');
            
            const { data, error } = await window.db
                .from('blog_posts')
                .select('id')
                .then((response) => response.data || []);
            
            if (error) {
                console.error('Error getting posts for deletion:', error);
                return false;
            }

            if (data.length === 0) {
                console.log('No posts to delete');
                return true;
            }

            const { error: deleteError } = await window.db
                .from('blog_posts')
                .delete()
                .in('id', `(${data.map(d => `'${d.id}'`).join(',')})`);

            if (deleteError) {
                console.error('Error deleting posts:', deleteError);
                return false;
            }

            showNotification('All blog posts deleted successfully!', 'success');
            return true;
        },
        
        deletePost: async (postId) => {
            if (!window.db) throw new Error('Supabase not initialized');
            
            const { error } = await window.db
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
        },
        
        // Storage helpers
        uploadCoverImage: async (file) => {
            if (!window.db) throw new Error('Supabase not initialized');
            
            try {
                const fileExt = file.name.split('.').pop();
                const fileName = `cover-${Date.now()}.${fileExt}`;
                
                const { data, error } = await window.supabase.storage
                    .from('blog-images')
                    .upload(fileName, file, {
                        cacheControl: '3600',
                        upsert: true
                    });

                if (error) {
                    console.error('Error uploading image:', error);
                    return null;
                }

                const { data: { publicUrl } } = window.supabase.storage
                    .from('blog-images')
                    .getPublicUrl(fileName);

                return publicUrl;
            } catch (error) {
                console.error('Error in uploadCoverImage:', error);
                return null;
            }
        }
    };

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
        // Can get from Supabase Auth or localStorage
        return window.currentUser?.id || localStorage.getItem('userId') || 'anonymous';
    }

    // Run init immediately
    init();

    // Expose API
    window.SupabaseAPI = SupabaseAPI;
})();
