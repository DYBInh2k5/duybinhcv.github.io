// Client-side blog using localStorage with optional Firebase Firestore sync
// Storage key: blog_posts (JSON array of posts)
// Post shape: { id, title, content (HTML), excerpt, createdAt (ISO), image (dataURL) }
// Firebase: If db is available (from blog.html or post.html), sync posts to Firestore

(function(){
    const STORAGE_KEY = 'blog_posts';
    // detect Firestore availability via new helper API (db or FirestoreAPI)
    let useFirebase = (typeof db !== 'undefined' && db !== null) || (window.FirestoreAPI && window.FirestoreAPI.isAvailable && window.FirestoreAPI.isAvailable());

    function uid() {
        return 'post_' + Date.now() + '_' + Math.random().toString(36).slice(2,9);
    }

    function loadPosts(){
        try{
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        }catch(err){
            console.error('Failed to parse blog posts', err);
            return [];
        }
    }

    function savePosts(posts){
        localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
        // Sync to Firebase if available
        if (useFirebase) syncToFirebase(posts);
    }

    async function syncToFirebase(posts){
        if (!useFirebase) return;
        try{
            if (window.FirestoreAPI && window.FirestoreAPI.syncPosts){
                await window.FirestoreAPI.syncPosts(posts);
            } else if (typeof db !== 'undefined' && db){
                // fallback to direct compat-style batch
                const batch = db.batch();
                const postsRef = db.collection('blog_posts');
                const snapshot = await postsRef.get();
                snapshot.forEach(doc=> batch.delete(doc.ref));
                posts.forEach(post=> {
                    const docRef = postsRef.doc(post.id);
                    batch.set(docRef, post);
                });
                await batch.commit();
            }
            console.info('Blog posts synced to Firebase.');
        }catch(err){
            console.error('Firebase sync error:', err);
        }
    }

    // Load posts from Firebase if available, otherwise from localStorage
    async function loadPostsWithFallback(){
        // Prefer Firestore via helper API if available
        if (useFirebase){
            try{
                if (window.FirestoreAPI && window.FirestoreAPI.getAllPosts){
                    const posts = await window.FirestoreAPI.getAllPosts();
                    if (posts && posts.length){
                        savePosts(posts);
                        return posts;
                    }
                } else if (typeof db !== 'undefined' && db){
                    const snapshot = await db.collection('blog_posts').get();
                    if (!snapshot.empty){
                        const posts = snapshot.docs.map(doc=> doc.data());
                        savePosts(posts);
                        return posts;
                    }
                }
            }catch(err){
                console.warn('Firebase read error, using localStorage:', err);
            }
        }
        return loadPosts();
    }

    function renderList(){
        const container = document.getElementById('blog-list');
        if (!container) return;
        const posts = loadPosts().sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
        container.innerHTML = '';
        if (posts.length === 0) {
            container.innerHTML = '<p class="text-gray-600">Chưa có bài viết nào. Mở Admin -> Manage Blog để thêm bài viết.</p>';
            return;
        }
        posts.forEach(post => {
            const el = document.createElement('article');
            el.className = 'bg-white p-6 rounded-2xl shadow-md';
            const readLink = useFirebase ? `post.html?id=${post.id}` : '#';
            el.innerHTML = `
                ${post.image ? `<div class=\"h-44 bg-gray-100 rounded-lg mb-4 overflow-hidden\"><img src=\"${post.image}\" class=\"w-full h-full object-cover\"></div>` : ''}
                <h3 class=\"text-xl font-bold mb-2\">${escapeHtml(post.title)}</h3>
                <p class=\"text-gray-600 mb-4\">${post.excerpt || post.content.slice(0,120) + '...'}</p>
                <div class=\"flex items-center justify-between gap-4\"> 
                    <div class=\"text-sm text-gray-500\">${new Date(post.createdAt).toLocaleString()}</div>
                    <div class=\"flex gap-2\">
                        <a href=\"${readLink}\" class=\"open-post-btn px-3 py-1 bg-blue-50 text-blue-700 rounded-md\" data-id=\"${post.id}\">Đọc</a>
                        <button class=\"edit-post-btn px-3 py-1 bg-yellow-50 text-yellow-800 rounded-md\" data-id=\"${post.id}\">Sửa</button>
                        <button class=\"delete-post-btn px-3 py-1 bg-red-50 text-red-700 rounded-md\" data-id=\"${post.id}\">Xóa</button>
                    </div>
                </div>
            `;
            container.appendChild(el);
        });

        // attach handlers
        container.querySelectorAll('.open-post-btn').forEach(btn=> btn.addEventListener('click', (e)=>{
            const id = e.currentTarget.dataset.id;
            // If Firebase, link goes to post.html - no need for modal
            if (!useFirebase) openPost(id);
            if (useFirebase) e.preventDefault();
        }));
        container.querySelectorAll('.edit-post-btn').forEach(btn=> btn.addEventListener('click', (e)=>{
            const id = e.currentTarget.dataset.id;
            openEditor(id);
        }));
        container.querySelectorAll('.delete-post-btn').forEach(btn=> btn.addEventListener('click', (e)=>{
            const id = e.currentTarget.dataset.id;
            if (!confirm('Xóa bài viết này?')) return;
            deletePost(id);
        }));
    }

    // On load: try to load from Firestore first (if available), then render
    (async function initLoad(){
        try{
            const posts = await loadPostsWithFallback();
            renderList();
            // notify if using Firestore
            if (useFirebase) console.info('Using Firestore for blog posts (if configured).');
        }catch(e){
            console.warn('Failed to load posts on init:', e);
            renderList();
        }
        // ensure admin UI wiring
        ensureAdminUI();
        renderAdminList();
        setupAdminEditorHandlers();
    })();

    function escapeHtml(str){
        if (!str) return '';
        return String(str).replace(/[&<>\"']/g, (s)=>{
            return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[s];
        });
    }

    function openPost(id){
        const posts = loadPosts();
        const post = posts.find(p=>p.id===id);
        if (!post) return alert('Bài viết không tồn tại');
        const modal = document.getElementById('postModal');
        const titleEl = document.getElementById('postModalTitle');
        const bodyEl = document.getElementById('postModalBody');
        titleEl.textContent = post.title;
        // If content looks like Markdown (we store raw MD), render to HTML; otherwise assume it's HTML
        let html = post.content || '';
        try{
            if (typeof marked !== 'undefined'){
                html = marked.parse(html);
            }
            if (typeof DOMPurify !== 'undefined'){
                html = DOMPurify.sanitize(html);
            }
        }catch(e){ console.warn('Markdown render error', e); }
        bodyEl.innerHTML = html;
        modal.classList.remove('hidden');
        // load comments for this post (if comments module available)
        try{
            if (window.Comments && window.Comments.loadComments){
                // ensure comment form bindings
                document.getElementById('post-comment-submit').onclick = async ()=>{
                    const input = document.getElementById('post-comment-input');
                    if (!input) return;
                    const text = input.value.trim();
                    if (!text) return alert('Bình luận trống');
                    try{
                        if (window.currentUser == null && useFirebase){
                            alert('Bạn cần đăng nhập để bình luận. Vui lòng đăng nhập.');
                            const adminPanel = document.getElementById('adminPanel'); if (adminPanel) adminPanel.classList.remove('hidden');
                            return;
                        }
                        await window.Comments.postComment(post.id, text);
                        input.value = '';
                        await window.Comments.loadComments(post.id);
                    }catch(err){
                        console.error('Comment post failed', err);
                        alert('Không thể gửi bình luận.');
                    }
                };
                window.Comments.loadComments(post.id);
            }
        }catch(e){ console.warn('Comments init failed', e); }
    }

    function closePostModal(){
        const modal = document.getElementById('postModal');
        if (modal) modal.classList.add('hidden');
    }

    function deletePost(id){
        const posts = loadPosts();
        const idx = posts.findIndex(p=>p.id===id);
        if (idx === -1) return;
        posts.splice(idx,1);
        savePosts(posts);
        renderList();
        renderAdminList();
    }

    // Admin editor integration
    function renderAdminList(){
        const container = document.getElementById('admin-blog-list');
        if (!container) return;
        const posts = loadPosts().sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
        container.innerHTML = '';
        if (posts.length===0){
            container.innerHTML = '<p class="text-gray-600">No posts yet.</p>';
            return;
        }
        posts.forEach(p=>{
            const row = document.createElement('div');
            row.className = 'flex items-center justify-between gap-3 bg-gray-50 p-3 rounded-md';
            row.innerHTML = `
                <div>
                    <div class=\"font-semibold\">${escapeHtml(p.title)}</div>
                    <div class=\"text-sm text-gray-500\">${new Date(p.createdAt).toLocaleString()}</div>
                </div>
                <div class=\"flex gap-2\">
                    <button class=\"admin-edit-post px-3 py-1 bg-yellow-50 text-yellow-800 rounded-md\" data-id=\"${p.id}\">Edit</button>
                    <button class=\"admin-delete-post px-3 py-1 bg-red-50 text-red-700 rounded-md\" data-id=\"${p.id}\">Delete</button>
                </div>
            `;
            container.appendChild(row);
        });

        container.querySelectorAll('.admin-edit-post').forEach(b=> b.addEventListener('click', (e)=> openEditor(e.currentTarget.dataset.id)));
        container.querySelectorAll('.admin-delete-post').forEach(b=> b.addEventListener('click', (e)=>{
            if (!confirm('Delete this post?')) return;
            deletePost(e.currentTarget.dataset.id);
        }));
    }

    function openEditor(id){
        // show editor area inside admin panel
        const editorPanel = document.getElementById('admin-blog-editor');
        const editorTitle = document.getElementById('editor-title');
        const editorContent = document.getElementById('editor-content');
        const editorExcerpt = document.getElementById('editor-excerpt');
        const editorImagePreview = document.getElementById('editor-image-preview');
        const editorImageFile = document.getElementById('editor-image-file');
        editorPanel.classList.remove('hidden');
        if (!id) {
            editorTitle.value = '';
            editorContent.value = '';
            editorExcerpt.value = '';
            editorImagePreview.src = '';
            editorImagePreview.classList.add('hidden');
            editorPanel.dataset.editing = '';
            return;
        }
        const posts = loadPosts();
        const post = posts.find(p=>p.id===id);
        if (!post) return alert('Post not found');
        editorPanel.dataset.editing = id;
        editorTitle.value = post.title;
        // content may contain HTML; put raw HTML into textarea (admin can edit HTML)
        editorContent.value = post.content;
        editorExcerpt.value = post.excerpt || '';
        if (post.image) {
            editorImagePreview.src = post.image;
            editorImagePreview.classList.remove('hidden');
        } else {
            editorImagePreview.src = '';
            editorImagePreview.classList.add('hidden');
        }
    }

    function closeEditor(){
        const editorPanel = document.getElementById('admin-blog-editor');
        if (editorPanel) {
            editorPanel.classList.add('hidden');
            editorPanel.dataset.editing = '';
        }
    }

    async function saveEditor(){
        const editorPanel = document.getElementById('admin-blog-editor');
        const editorTitle = document.getElementById('editor-title');
        const editorContent = document.getElementById('editor-content');
        const editorExcerpt = document.getElementById('editor-excerpt');
        const editorImagePreview = document.getElementById('editor-image-preview');
        const editingId = editorPanel.dataset.editing;

        const title = editorTitle.value.trim();
        const content = editorContent.value.trim();
        const excerpt = editorExcerpt.value.trim();
        const image = editorImagePreview.src && !editorImagePreview.classList.contains('hidden') ? editorImagePreview.src : null;

        // If Firestore is enabled, require sign-in for edits/saves
        const requiresAuth = useFirebase;
        const isSignedIn = (window.FirestoreAPI && window.FirestoreAPI.isSignedIn && window.FirestoreAPI.isSignedIn()) || (!!window.currentUser);
        if (requiresAuth && !isSignedIn) {
            alert('Bạn cần đăng nhập để lưu/ chỉnh sửa bài trên cloud. Vui lòng đăng nhập trong Admin panel.');
            const adminPanel = document.getElementById('adminPanel');
            if (adminPanel) adminPanel.classList.remove('hidden');
            return;
        }

        if (!title || !content) return alert('Title and content required');

        // If there's a new file selected, upload it
        try{
            const editorFileInput = document.getElementById('editor-image-file');
            if (editorFileInput && editorFileInput.files && editorFileInput.files[0] && window.StorageAPI && window.StorageAPI.uploadImage){
                const uploaded = await window.StorageAPI.uploadImage(editorFileInput.files[0]);
                // use uploaded url
                image = uploaded;
            }
        }catch(err){
            console.error('Editor image upload failed', err);
            alert('Không thể upload ảnh. Bài sẽ lưu mà không có ảnh.');
        }

        const posts = loadPosts();
        if (editingId) {
            const idx = posts.findIndex(p=>p.id===editingId);
            if (idx !== -1) {
                posts[idx].title = title;
                posts[idx].content = content;
                posts[idx].excerpt = excerpt;
                posts[idx].image = image;
                // keep createdAt
            }
        } else {
            const post = { id: uid(), title, content, excerpt, image, createdAt: new Date().toISOString() };
            posts.push(post);
        }
        savePosts(posts);
        renderList();
        renderAdminList();
        closeEditor();
    }

    function setupAdminEditorHandlers(){
        const newBtn = document.getElementById('admin-new-post');
        const editorPanel = document.getElementById('admin-blog-editor');
        const closeEditorBtn = document.getElementById('editor-close');
        const saveEditorBtn = document.getElementById('editor-save');
        const imageFile = document.getElementById('editor-image-file');
        const imagePreview = document.getElementById('editor-image-preview');

        if (newBtn) newBtn.addEventListener('click', ()=> openEditor());
        if (closeEditorBtn) closeEditorBtn.addEventListener('click', ()=> closeEditor());
        if (saveEditorBtn) saveEditorBtn.addEventListener('click', ()=> saveEditor());

        if (imageFile) imageFile.addEventListener('change', (e)=>{
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(ev){
                imagePreview.src = ev.target.result;
                imagePreview.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        });

        // Initialize SimpleMDE for editor content if available
        if (typeof SimpleMDE !== 'undefined'){
            try{
                if (!window.editorSimpleMDE && document.getElementById('editor-content')){
                    window.editorSimpleMDE = new SimpleMDE({ element: document.getElementById('editor-content'), spellChecker: false, autosave: { enabled: false } });
                }
            }catch(e){ console.warn('SimpleMDE init failed', e); }
        }

        // Auth UI bindings (if present)
        const signInBtn = document.getElementById('signInBtn');
        const signOutBtn = document.getElementById('signOutBtn');
        const authInfo = document.getElementById('auth-info');
        if (signInBtn) signInBtn.addEventListener('click', async ()=>{
            try{
                if (window.FirestoreAPI && window.FirestoreAPI.signInWithGoogle){
                    await window.FirestoreAPI.signInWithGoogle();
                } else if (window.auth && window.auth.signInWithPopup){
                    const provider = new firebase.auth.GoogleAuthProvider();
                    await window.auth.signInWithPopup(provider);
                } else alert('Auth not available. Make sure Firebase config + auth SDK are loaded.');
            }catch(err){
                console.error('Sign-in failed:', err);
                alert('Sign-in failed: ' + (err.message || err));
            }
        });
        if (signOutBtn) signOutBtn.addEventListener('click', async ()=>{
            try{
                if (window.FirestoreAPI && window.FirestoreAPI.signOut){
                    await window.FirestoreAPI.signOut();
                } else if (window.auth && window.auth.signOut){
                    await window.auth.signOut();
                }
            }catch(err){
                console.error('Sign-out failed:', err);
            }
        });

        // react to auth state changes
        window.addEventListener('firebaseAuthStateChanged', (ev)=>{
            const user = ev.detail.user;
            if (!authInfo) return;
            if (user){
                authInfo.textContent = `Signed in as ${user.displayName || user.email}`;
                if (signInBtn) signInBtn.classList.add('hidden');
                if (signOutBtn) signOutBtn.classList.remove('hidden');
            } else {
                authInfo.textContent = 'Not signed in';
                if (signInBtn) signInBtn.classList.remove('hidden');
                if (signOutBtn) signOutBtn.classList.add('hidden');
            }
        });
    }

    // wire admin panel toggles (within adminPanel existing modal)
    function ensureAdminUI(){
        const adminPanel = document.getElementById('adminPanel');
        if (!adminPanel) return;
        // add blog management area if not present
        if (!document.getElementById('admin-blog-section')){
            const container = document.createElement('div');
            container.id = 'admin-blog-section';
            container.className = 'mt-6';
            container.innerHTML = `
                <h4 class=\"text-lg font-bold mb-2\">Manage Blog Posts</h4>
                <div class=\"flex gap-2 mb-3\">
                    <button id=\"admin-new-post\" class=\"px-3 py-1 bg-indigo-600 text-white rounded-md\">New Post</button>
                </div>
                <div id=\"admin-blog-list\" class=\"space-y-2\"></div>

                <div id=\"admin-blog-editor\" class=\"mt-4 bg-white p-4 rounded-md border hidden\">
                    <div class=\"flex items-center justify-between mb-2\">
                        <strong>Editor</strong>
                        <div class=\"flex gap-2\">
                            <button id=\"editor-close\" class=\"px-2 py-1 bg-gray-200 rounded\">Close</button>
                            <button id=\"editor-save\" class=\"px-2 py-1 bg-green-600 text-white rounded\">Save</button>
                        </div>
                    </div>
                    <div class=\"mb-2\">
                        <input id=\"editor-title\" placeholder=\"Post title\" class=\"w-full px-3 py-2 border rounded\"> 
                    </div>
                    <div class=\"mb-2\">
                        <input id=\"editor-excerpt\" placeholder=\"Short excerpt (optional)\" class=\"w-full px-3 py-2 border rounded\"> 
                    </div>
                    <div class=\"mb-2\">
                        <textarea id=\"editor-content\" rows=\"8\" placeholder=\"Full content (HTML allowed)\" class=\"w-full px-3 py-2 border rounded\"></textarea>
                    </div>
                    <div class=\"mb-2\">
                        <label class=\"block text-sm font-medium text-gray-700\">Image (optional)</label>
                        <input id=\"editor-image-file\" type=\"file\" accept=\"image/*\" class=\"mt-1\"> 
+                    <div class=\"mb-2\"> 
+                        <img id=\"editor-image-preview\" src=\"\" class=\"w-32 h-20 object-cover rounded hidden\"> 
+                    </div> 
                    </div>
                </div>
            `;
            const form = adminPanel.querySelector('#admin-form');
            form.appendChild(container);
            setupAdminEditorHandlers();
        }
    }

    // wire modal close
    document.addEventListener('click', (e)=>{
        const modal = document.getElementById('postModal');
        if (!modal) return;
        if (e.target === modal) closePostModal();
    });

    const closePostBtn = document.getElementById('closePostModal');
    if (closePostBtn) closePostBtn.addEventListener('click', closePostModal);

    // Quick post UI (open modal next to Blog without Admin)
    const quickBtn = document.getElementById('openQuickPostBtn');
    const quickBtnMobile = document.getElementById('openQuickPostBtnMobile');
    const quickModal = document.getElementById('quickPostModal');
    const quickClose = document.getElementById('quickPostClose');
    const quickTitle = document.getElementById('quick-title');
    const quickExcerpt = document.getElementById('quick-excerpt');
    const quickContent = document.getElementById('quick-content');
    const quickImageFile = document.getElementById('quick-image-file');
    const quickImagePreview = document.getElementById('quick-image-preview');
    const quickSave = document.getElementById('quick-save');
    const quickCancel = document.getElementById('quick-cancel');

    function openQuickModal(){
        if (!quickModal) return;
        // clear inputs
        if (quickTitle) quickTitle.value = '';
        if (quickExcerpt) quickExcerpt.value = '';
        if (quickContent) quickContent.value = '';
        if (quickImagePreview) { quickImagePreview.src = ''; quickImagePreview.classList.add('hidden'); }
        if (quickImageFile) quickImageFile.value = null;
        quickModal.classList.remove('hidden');
        // init simplemde for quick content
        try{
            if (typeof SimpleMDE !== 'undefined' && !window.quickSimpleMDE){
                if (document.getElementById('quick-content')){
                    window.quickSimpleMDE = new SimpleMDE({ element: document.getElementById('quick-content'), spellChecker: false });
                }
            }
            if (window.quickSimpleMDE) window.quickSimpleMDE.value('');
        }catch(e){ console.warn('SimpleMDE quick init failed', e); }
    }

    function closeQuickModal(){
        if (!quickModal) return;
        quickModal.classList.add('hidden');
    }

    if (quickBtn) quickBtn.addEventListener('click', openQuickModal);
    if (quickBtnMobile) quickBtnMobile.addEventListener('click', openQuickModal);
    if (quickClose) quickClose.addEventListener('click', closeQuickModal);
    if (quickCancel) quickCancel.addEventListener('click', closeQuickModal);

        if (quickImageFile) quickImageFile.addEventListener('change', (e)=>{
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(ev){
            if (quickImagePreview) { quickImagePreview.src = ev.target.result; quickImagePreview.classList.remove('hidden'); }
        };
        reader.readAsDataURL(file);
    });

        // init SimpleMDE for quick if not already
        try{
            if (typeof SimpleMDE !== 'undefined' && !window.quickSimpleMDE && document.getElementById('quick-content')){
                window.quickSimpleMDE = new SimpleMDE({ element: document.getElementById('quick-content'), spellChecker: false });
            }
        }catch(e){ console.warn('SimpleMDE quick init error', e); }

    if (quickSave) quickSave.addEventListener('click', async ()=>{
        const title = quickTitle ? quickTitle.value.trim() : '';
        const content = quickContent ? quickContent.value.trim() : '';
        const excerpt = quickExcerpt ? quickExcerpt.value.trim() : '';
        const image = quickImagePreview && !quickImagePreview.classList.contains('hidden') ? quickImagePreview.src : null;
        if (!title || !content) return alert('Tiêu đề và nội dung là bắt buộc');
        // If Firestore is enabled, require sign-in before writing
        const requiresAuth = useFirebase;
        const isSignedIn = (window.FirestoreAPI && window.FirestoreAPI.isSignedIn && window.FirestoreAPI.isSignedIn()) || (!!window.currentUser);
        if (requiresAuth && !isSignedIn){
            if (confirm('Bạn cần đăng nhập để lưu bài lên cloud. Mở panel Admin để đăng nhập?')){
                // open admin panel to allow sign-in
                const adminPanel = document.getElementById('adminPanel');
                if (adminPanel) adminPanel.classList.remove('hidden');
            }
            return;
        }

        // If there's a selected file, try to upload it to Storage first
        let imageUrl = image;
        try{
            if (quickImageFile && quickImageFile.files && quickImageFile.files[0] && window.StorageAPI && window.StorageAPI.uploadImage){
                const uploaded = await window.StorageAPI.uploadImage(quickImageFile.files[0]);
                imageUrl = uploaded;
            }
        }catch(err){
            console.error('Image upload failed:', err);
            alert('Không thể upload ảnh. Bài sẽ được lưu mà không có ảnh.');
            imageUrl = imageUrl; // keep existing
        }

        const posts = loadPosts();
        const post = { id: uid(), title, content, excerpt, image: imageUrl, createdAt: new Date().toISOString() };
        posts.push(post);
        // Save locally first
        savePosts(posts);

        // If using Firestore and signed in, ensure we push to Firestore
        if (requiresAuth && isSignedIn){
            try{
                if (window.FirestoreAPI && window.FirestoreAPI.addPost){
                    await window.FirestoreAPI.addPost(post);
                    console.info('Post saved to Firestore.');
                } else if (typeof db !== 'undefined' && db){
                    await db.collection('blog_posts').doc(post.id).set(post);
                }
            }catch(err){
                console.error('Failed to write post to Firestore:', err);
                alert('Bài đã được lưu cục bộ nhưng không thể sync lên cloud.');
            }
        }

        renderList();
        renderAdminList();
        closeQuickModal();
        alert('Bài viết đã được lưu.');
    });

    // close quick modal when clicking outside
    document.addEventListener('click', (e)=>{
        const modal = document.getElementById('quickPostModal');
        if (!modal) return;
        if (e.target === modal) closeQuickModal();
    });

    // initial render (async if Firebase)
    if (useFirebase){
        loadPostsWithFallback().then(()=> renderList());
    } else {
        renderList();
    }
    ensureAdminUI();
    renderAdminList();

    // expose some functions globally for admin to call if needed
    window.blogApp = { renderList, renderAdminList, openEditor };

    // Wire navbar admin button to open admin panel (if present)
    const navAdminBtn = document.getElementById('navAdminBtn');
    if (navAdminBtn){
        navAdminBtn.classList.remove('hidden');
        navAdminBtn.addEventListener('click', ()=>{
            const adminPanel = document.getElementById('adminPanel');
            if (adminPanel) adminPanel.classList.remove('hidden');
            // also ensure admin UI is prepared
            ensureAdminUI();
            renderAdminList();
        });
    }
})();
