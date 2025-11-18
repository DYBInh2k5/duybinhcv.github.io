// Admin panel: client-side edits persisted to localStorage
// Keys used: profile_name, profile_title, profile_about, profile_avatar (data URL)

document.addEventListener('DOMContentLoaded', () => {
    const openBtn = document.getElementById('openAdminBtn');
    const panel = document.getElementById('adminPanel');
    const closeBtn = document.getElementById('closeAdminBtn');
    const saveBtn = document.getElementById('admin-save');
    const resetBtn = document.getElementById('admin-reset');
    const loadBtn = document.getElementById('admin-load');

    const nameInput = document.getElementById('admin-name');
    const titleInput = document.getElementById('admin-title');
    const aboutInput = document.getElementById('admin-about');
    const avatarFile = document.getElementById('admin-avatar-file');
    const avatarPreview = document.getElementById('admin-avatar-preview');

    const heroName = document.getElementById('hero-name');
    const heroTitle = document.getElementById('hero-title');
    const aboutBio = document.getElementById('about-bio');
    const profileAvatar = document.getElementById('profile-avatar');
    const profileFallback = document.getElementById('profile-avatar-fallback');

    let pendingAvatarDataUrl = null;

    function openPanel() {
        panel.classList.remove('hidden');
        // populate fields from storage
        const storedName = localStorage.getItem('profile_name') || '';
        const storedTitle = localStorage.getItem('profile_title') || '';
        const storedAbout = localStorage.getItem('profile_about') || '';
        const storedAvatar = localStorage.getItem('profile_avatar') || '';

        nameInput.value = storedName;
        titleInput.value = storedTitle;
        aboutInput.value = storedAbout;

        if (storedAvatar) {
            avatarPreview.src = storedAvatar;
            avatarPreview.classList.remove('hidden');
            pendingAvatarDataUrl = storedAvatar;
        } else {
            avatarPreview.classList.add('hidden');
            avatarPreview.src = '';
            pendingAvatarDataUrl = null;
        }
    }

    function closePanel() {
        panel.classList.add('hidden');
    }

    function applyProfile({ name, title, about, avatar }) {
        if (name !== undefined && heroName) heroName.textContent = name || 'Võ Duy Bình';
        if (title !== undefined && heroTitle) heroTitle.textContent = title || 'Software Engineering Student';
        if (about !== undefined && aboutBio) aboutBio.innerHTML = about || aboutBio.innerHTML;

        if (avatar) {
            profileAvatar.src = avatar;
            profileAvatar.classList.remove('hidden');
            if (profileFallback) profileFallback.classList.add('hidden');
        } else {
            // no avatar -> show fallback icon
            profileAvatar.src = '';
            profileAvatar.classList.add('hidden');
            if (profileFallback) profileFallback.classList.remove('hidden');
        }
    }

    function loadProfile() {
        const storedName = localStorage.getItem('profile_name');
        const storedTitle = localStorage.getItem('profile_title');
        const storedAbout = localStorage.getItem('profile_about');
        const storedAvatar = localStorage.getItem('profile_avatar');

        applyProfile({ name: storedName, title: storedTitle, about: storedAbout, avatar: storedAvatar });
    }

    // initial load
    loadProfile();

    // file input -> preview dataURL
    avatarFile.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(ev) {
            pendingAvatarDataUrl = ev.target.result;
            avatarPreview.src = pendingAvatarDataUrl;
            avatarPreview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    });

    saveBtn.addEventListener('click', () => {
        const name = nameInput.value.trim();
        const title = titleInput.value.trim();
        const about = aboutInput.value.trim();

        if (name) localStorage.setItem('profile_name', name);
        else localStorage.removeItem('profile_name');

        if (title) localStorage.setItem('profile_title', title);
        else localStorage.removeItem('profile_title');

        if (about) localStorage.setItem('profile_about', about);
        else localStorage.removeItem('profile_about');

        if (pendingAvatarDataUrl) localStorage.setItem('profile_avatar', pendingAvatarDataUrl);
        else localStorage.removeItem('profile_avatar');

        loadProfile();
        alert('Saved to localStorage. These changes are local to this browser.');
    });

    resetBtn.addEventListener('click', () => {
        if (!confirm('Reset profile data stored in this browser?')) return;
        localStorage.removeItem('profile_name');
        localStorage.removeItem('profile_title');
        localStorage.removeItem('profile_about');
        localStorage.removeItem('profile_avatar');
        pendingAvatarDataUrl = null;
        avatarPreview.src = '';
        avatarPreview.classList.add('hidden');
        nameInput.value = '';
        titleInput.value = '';
        aboutInput.value = '';
        loadProfile();
        alert('Local profile data cleared.');
    });

    loadBtn.addEventListener('click', () => {
        openPanel();
        alert('Fields loaded from localStorage (if any).');
    });

    openBtn.addEventListener('click', openPanel);
    closeBtn.addEventListener('click', closePanel);

    // close panel when clicking outside content
    panel.addEventListener('click', (e) => {
        if (e.target === panel) closePanel();
    });
});
