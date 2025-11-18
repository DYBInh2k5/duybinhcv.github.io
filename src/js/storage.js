/* storage.js
 * Helper for uploading images to Firebase Storage (if available).
 * Exposes window.StorageAPI.uploadImage(file) which returns a Promise<string> downloadURL
 */
(function(){
    async function uploadImage(file, pathPrefix = 'blog_images'){
        if (!file) throw new Error('No file provided');
        if (!window.firebase || !firebase.storage) throw new Error('Firebase Storage SDK not available');
        try{
            const storage = firebase.storage();
            const ext = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`;
            const fullPath = `${pathPrefix}/${fileName}`;
            const ref = storage.ref().child(fullPath);
            const snap = await ref.put(file);
            const url = await snap.ref.getDownloadURL();
            return url;
        }catch(err){
            console.error('Storage upload failed', err);
            throw err;
        }
    }

    window.StorageAPI = { uploadImage };
})();
