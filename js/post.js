// Load and display individual blog post from Firestore or localStorage
(function(){
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const postContent = document.getElementById('postContent');
    const postTitle = document.getElementById('postTitle');
    const postDate = document.getElementById('postDate');
    const postReadTime = document.getElementById('postReadTime');
    const postBody = document.getElementById('postBody');
    const postImage = document.getElementById('postImage');
    const postImageContainer = document.getElementById('postImageContainer');

    // Get post ID from URL param
    const params = new URLSearchParams(window.location.search);
    const postId = params.get('id');

    function showError() {
        if (loadingState) loadingState.classList.add('hidden');
        if (errorState) errorState.classList.remove('hidden');
    }

    function showPost(post) {
        if (loadingState) loadingState.classList.add('hidden');
        if (postContent) postContent.classList.remove('hidden');

        if (postTitle) postTitle.textContent = post.title;
        if (postDate) postDate.textContent = new Date(post.createdAt).toLocaleString();

        // Calculate read time (rough: 200 words per minute)
        const wordCount = post.content.replace(/<[^>]*>/g, '').split(/\s+/).length;
        const readMinutes = Math.ceil(wordCount / 200);
        if (postReadTime) postReadTime.textContent = `${readMinutes} min read`;

        if (postBody) postBody.innerHTML = post.content;

        if (post.image) {
            if (postImage) postImage.src = post.image;
            if (postImageContainer) postImageContainer.classList.remove('hidden');
        }
    }

    async function loadPost() {
        if (!postId) return showError();

        // If Firebase is available and configured, try Firestore first
        if (typeof db !== 'undefined' && db) {
            try {
                const docSnap = await db.collection('blog_posts').doc(postId).get();
                if (docSnap.exists) {
                    showPost(docSnap.data());
                    return;
                }
            } catch (err) {
                console.warn('Firebase error, falling back to localStorage:', err);
            }
        }

        // Fallback to localStorage
        const postsStr = localStorage.getItem('blog_posts');
        if (!postsStr) return showError();

        try {
            const posts = JSON.parse(postsStr);
            const post = posts.find(p => p.id === postId);
            if (post) {
                showPost(post);
            } else {
                showError();
            }
        } catch (err) {
            console.error('Error loading post:', err);
            showError();
        }
    }

    loadPost();
})();
