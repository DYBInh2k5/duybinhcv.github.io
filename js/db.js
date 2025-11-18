(function(){
    // db.js - central Firebase init and small helper API for Firestore
    // Usage:
    // 1) In your HTML (e.g., blog.html) keep the Firebase SDK <script> tags (firebase-app.js, firebase-firestore.js)
    // 2) In the same HTML define `const firebaseConfig = { ... }` with your project values (or replace values in FIREBASE_SETUP.md guidance)
    // 3) Include this script AFTER the Firebase SDK scripts
    // This file will initialize Firebase (compat-style) and expose `window.db` and `window.FirestoreAPI` helpers.

    const cfg = window.firebaseConfig || null;
    let initialized = false;

    function isPlaceholder(c){
        if (!c) return true;
        return !c.apiKey || c.apiKey.includes('YOUR_FIREBASE_API_KEY') || c.projectId && c.projectId.includes('YOUR_PROJECT');
    }

    function init(){
        if (!cfg || isPlaceholder(cfg)){
            console.info('Firebase config missing or placeholder; Firestore will NOT be initialized. Follow FIREBASE_SETUP.md to enable it.');
            return;
        }
        if (!window.firebase){
            console.warn('Firebase SDK not found. Ensure firebase-app.js and firebase-firestore.js are loaded before db.js');
            return;
        }
        try{
            // initialize only once
            if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(cfg);
            window.db = firebase.firestore();
            // init auth if available
            try{
                if (firebase.auth) {
                    window.auth = firebase.auth();
                    // listen for auth changes
                    window.auth.onAuthStateChanged(user => {
                        window.currentUser = user || null;
                        // dispatch event for other modules
                        window.dispatchEvent(new CustomEvent('firebaseAuthStateChanged', { detail: { user } }));
                    });
                }
            }catch(e){
                console.warn('Firebase Auth not available or failed to init', e);
            }
            initialized = true;
            console.info('Firebase initialized (db available).');
        }catch(err){
            console.error('Error initializing Firebase:', err);
        }
    }

    // helper API using compat-style Firestore (matches existing code in project)
    const FirestoreAPI = {
        isAvailable: () => !!window.db,
        // Auth helpers
        isSignedIn: () => !!window.currentUser,
        getCurrentUser: () => window.currentUser || null,
        signInWithGoogle: async () => {
            if (!window.auth) throw new Error('Firebase Auth not initialized');
            const provider = new firebase.auth.GoogleAuthProvider();
            return window.auth.signInWithPopup(provider);
        },
        signOut: async () => {
            if (!window.auth) throw new Error('Firebase Auth not initialized');
            return window.auth.signOut();
        },
        addPost: async (post) => {
            if (!window.db) throw new Error('Firestore not initialized');
            return window.db.collection('blog_posts').doc(post.id).set(post);
        },
        getAllPosts: async () => {
            if (!window.db) return [];
            const snap = await window.db.collection('blog_posts').get();
            return snap.docs.map(d=>d.data());
        },
        clearAllPosts: async () => {
            if (!window.db) throw new Error('Firestore not initialized');
            const snap = await window.db.collection('blog_posts').get();
            const batch = window.db.batch();
            snap.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        },
        syncPosts: async (posts) => {
            if (!window.db) throw new Error('Firestore not initialized');
            const batch = window.db.batch();
            const postsRef = window.db.collection('blog_posts');
            // remove existing docs then set new ones
            const snapshot = await postsRef.get();
            snapshot.forEach(doc => batch.delete(doc.ref));
            posts.forEach(post => {
                const docRef = postsRef.doc(post.id);
                batch.set(docRef, post);
            });
            await batch.commit();
        }
    };

    // Run init immediately
    init();

    // Expose API
    window.FirestoreAPI = FirestoreAPI;

})();
