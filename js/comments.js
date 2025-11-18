/* comments.js
 * Basic comments client: load and post comments for a given post id.
 * Uses Firestore collection 'comments' with documents:
 * { postId, authorName, authorId, content, createdAt }
 */
(function(){
    async function loadComments(postId){
        const container = document.getElementById('post-comments-list');
        if (!container) return;
        container.innerHTML = '<p class="text-sm text-gray-500">Loading comments...</p>';
        // If Firestore available, query; otherwise load from localStorage
        if (window.db){
            try{
                const snapshot = await db.collection('comments').where('postId','==',postId).orderBy('createdAt','desc').get();
                if (snapshot.empty) {
                    container.innerHTML = '<p class="text-sm text-gray-500">Chưa có bình luận nào.</p>';
                    return;
                }
                container.innerHTML = '';
                snapshot.forEach(doc=>{
                    const c = doc.data();
                    const el = document.createElement('div');
                    el.className = 'mb-3 border-b pb-2';
                    el.innerHTML = `<div class="text-sm font-semibold">${escapeHtml(c.authorName||'User')}</div><div class="text-sm text-gray-700">${escapeHtml(c.content)}</div><div class="text-xs text-gray-400">${new Date(c.createdAt).toLocaleString()}</div>`;
                    container.appendChild(el);
                });
            }catch(err){
                console.error('Failed to load comments', err);
                container.innerHTML = '<p class="text-sm text-gray-500">Không thể tải bình luận.</p>';
            }
        } else {
            // fallback from localStorage
            const raw = localStorage.getItem('comments_' + postId) || '[]';
            const list = JSON.parse(raw);
            if (!list.length) { container.innerHTML = '<p class="text-sm text-gray-500">Chưa có bình luận nào.</p>'; return; }
            container.innerHTML = '';
            list.forEach(c=>{
                const el = document.createElement('div');
                el.className = 'mb-3 border-b pb-2';
                el.innerHTML = `<div class="text-sm font-semibold">${escapeHtml(c.authorName||'User')}</div><div class="text-sm text-gray-700">${escapeHtml(c.content)}</div><div class="text-xs text-gray-400">${new Date(c.createdAt).toLocaleString()}</div>`;
                container.appendChild(el);
            });
        }
    }

    async function postComment(postId, content){
        if (!content || !postId) return;
        const author = (window.currentUser && (window.currentUser.displayName || window.currentUser.email)) || 'Anonymous';
        const payload = { postId, content, authorName: author, authorId: window.currentUser ? window.currentUser.uid : null, createdAt: new Date().toISOString() };
        if (window.db){
            try{
                await db.collection('comments').add(payload);
                return true;
            }catch(err){
                console.error('Failed to post comment', err);
                throw err;
            }
        } else {
            const key = 'comments_' + postId;
            const raw = localStorage.getItem(key) || '[]';
            const list = JSON.parse(raw);
            list.push(payload);
            localStorage.setItem(key, JSON.stringify(list));
            return true;
        }
    }

    function escapeHtml(str){
        if (!str) return '';
        return String(str).replace(/[&<>"']/g, (s)=>{ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[s]; });
    }

    window.Comments = { loadComments, postComment };
})();
