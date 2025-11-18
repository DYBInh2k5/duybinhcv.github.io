/* admin-index.js
 * Site admin for editing hero, about, avatar, and projects on index.html
 * Persists to localStorage under 'site_data' and to Firestore (collection 'site_settings', doc 'default') when available.
 */
(function(){
    const KEY = 'site_data';
    const KEY_SKILLS = 'site_skills';

    function defaultData(){
        return {
            heroName: document.getElementById('hero-name') ? document.getElementById('hero-name').textContent.trim() : 'Your Name',
            heroTitle: document.getElementById('hero-title') ? document.getElementById('hero-title').textContent.trim() : 'Your Title',
            aboutHtml: document.getElementById('about-bio') ? document.getElementById('about-bio').innerHTML.trim() : '',
            avatar: '',
            projectsHtml: (function(){
                const projectsGrid = document.querySelector('#projects .grid');
                return projectsGrid ? projectsGrid.innerHTML : '';
            })()
            ,
            // skills will be managed separately (array of {id,name,desc,image})
            skills: []
        };
    }

    async function loadSiteData(){
        // try Firestore first if available
        if (window.db){
            try{
                const doc = await db.collection('site_settings').doc('default').get();
                if (doc.exists){
                    const data = doc.data();
                    // keep local copy
                    localStorage.setItem(KEY, JSON.stringify(data));
                    return data;
                }
            }catch(err){ console.warn('Failed to read site_settings from Firestore', err); }
        }
        // fallback to localStorage
        const raw = localStorage.getItem(KEY);
        if (!raw) return defaultData();
        try{ return JSON.parse(raw); }catch(e){ return defaultData(); }
    }

    async function saveSiteData(data){
        localStorage.setItem(KEY, JSON.stringify(data));
        // try to save to Firestore if available and user is signed in
        if (window.db){
            const user = window.currentUser || (window.FirestoreAPI && window.FirestoreAPI.getCurrentUser && window.FirestoreAPI.getCurrentUser());
            if (!user){
                console.info('Firestore available but no signed-in user; skipping cloud save.');
                return;
            }
            try{
                await db.collection('site_settings').doc('default').set(data);
                console.info('Site settings saved to Firestore.');
            }catch(err){
                console.error('Failed to save site settings to Firestore', err);
            }
        }
    }

    function applySiteDataToDOM(data){
        if (!data) return;
        const heroNameEl = document.getElementById('hero-name');
        if (heroNameEl && data.heroName !== undefined) heroNameEl.textContent = data.heroName;
        const heroTitleEl = document.getElementById('hero-title');
        if (heroTitleEl && data.heroTitle !== undefined) heroTitleEl.textContent = data.heroTitle;
        const aboutEl = document.getElementById('about-bio');
        if (aboutEl && data.aboutHtml !== undefined) aboutEl.innerHTML = data.aboutHtml;
        const avatarEl = document.getElementById('profile-avatar');
        const avatarFallback = document.getElementById('profile-avatar-fallback');
        if (avatarEl && data.avatar){
            avatarEl.src = data.avatar;
            avatarEl.classList.remove('hidden');
            if (avatarFallback) avatarFallback.classList.add('hidden');
        }
        // projects
        const projectsGrid = document.querySelector('#projects .grid');
        if (projectsGrid && data.projectsHtml !== undefined){
            projectsGrid.innerHTML = data.projectsHtml;
        }
    }

    // wire admin UI (navAdminBtn may be used instead of floating button)
    const openBtn = document.getElementById('openSiteAdminBtn') || document.getElementById('navAdminBtn');
    const panel = document.getElementById('siteAdminPanel');
    const closeBtn = document.getElementById('closeSiteAdmin');
    const saveBtn = document.getElementById('site-admin-save');
    const loadBtn = document.getElementById('site-admin-load');
    const resetBtn = document.getElementById('site-admin-reset');

    async function openPanel(){
        if (!panel) return;
        panel.classList.remove('hidden');
        // load current data and populate fields
        const data = await loadSiteData();
        document.getElementById('admin-hero-name').value = data.heroName || '';
        document.getElementById('admin-hero-title').value = data.heroTitle || '';
        document.getElementById('admin-about').value = data.aboutHtml || '';
        document.getElementById('admin-projects').value = data.projectsHtml || '';
        if (data.avatar){
            const p = document.getElementById('admin-avatar-preview-site');
            if (p){ p.src = data.avatar; p.classList.remove('hidden'); }
        }
        // load skills into admin list
        try{
            const skills = await loadSkills();
            renderAdminSkillsList(skills);
        }catch(e){ console.warn('Failed to load skills for admin', e); }
    }

    function closePanel(){
        if (!panel) return;
        panel.classList.add('hidden');
    }

    async function onSave(){
        const heroName = document.getElementById('admin-hero-name').value.trim();
        const heroTitle = document.getElementById('admin-hero-title').value.trim();
        const aboutHtml = document.getElementById('admin-about').value.trim();
        const projectsHtml = document.getElementById('admin-projects').value.trim();
        let avatarUrl = null;
        const fileInput = document.getElementById('admin-avatar-file-site');
        try{
            if (fileInput && fileInput.files && fileInput.files[0] && window.StorageAPI && window.StorageAPI.uploadImage){
                avatarUrl = await window.StorageAPI.uploadImage(fileInput.files[0]);
            }
        }catch(err){
            console.error('Avatar upload failed', err);
            alert('Không thể upload avatar. Thay đổi vẫn được lưu (không có avatar).');
        }
        const existing = await loadSiteData();
        const payload = Object.assign({}, existing, {
            heroName: heroName || existing.heroName,
            heroTitle: heroTitle || existing.heroTitle,
            aboutHtml: aboutHtml || existing.aboutHtml,
            projectsHtml: projectsHtml || existing.projectsHtml,
            avatar: avatarUrl || existing.avatar || ''
        });
        await saveSiteData(payload);
        applySiteDataToDOM(payload);
        alert('Saved site settings.');
    }

    async function onLoadClick(){
        const data = await loadSiteData();
        document.getElementById('admin-hero-name').value = data.heroName || '';
        document.getElementById('admin-hero-title').value = data.heroTitle || '';
        document.getElementById('admin-about').value = data.aboutHtml || '';
        document.getElementById('admin-projects').value = data.projectsHtml || '';
        if (data.avatar){
            const p = document.getElementById('admin-avatar-preview-site');
            if (p){ p.src = data.avatar; p.classList.remove('hidden'); }
        }
        alert('Loaded site settings into admin form.');
    }

    function onReset(){
        if (!confirm('Reset local site settings to defaults? This will clear local changes.')) return;
        localStorage.removeItem(KEY);
        const defaults = defaultData();
        applySiteDataToDOM(defaults);
        alert('Reset to defaults.');
    }

    // preview avatar when chosen
    const avatarInput = document.getElementById('admin-avatar-file-site');
    if (avatarInput){
        avatarInput.addEventListener('change', (e)=>{
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(ev){
                const p = document.getElementById('admin-avatar-preview-site');
                if (p){ p.src = ev.target.result; p.classList.remove('hidden'); }
            };
            reader.readAsDataURL(file);
        });
    }

    // ---------- Skills management (localStorage fallback + Firestore) ----------
    function makeId(){ return 's_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,6); }

    async function loadSkills(){
        // try Firestore collection 'skills' first
        if (window.db){
            try{
                const snap = await db.collection('skills').get();
                const arr = snap.docs.map(d => Object.assign({}, d.data(), { id: d.id }));
                // keep local copy
                localStorage.setItem(KEY_SKILLS, JSON.stringify(arr));
                return arr;
            }catch(err){ console.warn('Failed to read skills from Firestore', err); }
        }
        // fallback to localStorage
        const raw = localStorage.getItem(KEY_SKILLS);
        if (!raw) return [];
        try{ return JSON.parse(raw); }catch(e){ return []; }
    }

    async function saveSkillsArray(skills){
        // save locally
        localStorage.setItem(KEY_SKILLS, JSON.stringify(skills));
        // try to save to Firestore (replace all docs) if user signed in
        if (window.db){
            const user = window.currentUser || (window.FirestoreAPI && window.FirestoreAPI.getCurrentUser && window.FirestoreAPI.getCurrentUser());
            if (!user){ console.info('Firestore available but no signed-in user; skipping cloud skills save.'); return; }
            try{
                const batch = db.batch();
                const col = db.collection('skills');
                const existing = await col.get();
                existing.forEach(doc => batch.delete(doc.ref));
                skills.forEach(s => {
                    const ref = s.id ? col.doc(s.id) : col.doc();
                    batch.set(ref, { name: s.name || '', desc: s.desc || '', image: s.image || '' });
                });
                await batch.commit();
                console.info('Skills synced to Firestore.');
            }catch(err){ console.error('Failed to sync skills to Firestore', err); }
        }
    }

    function renderAdminSkillsList(skills){
        const list = document.getElementById('admin-skills-list');
        if (!list) return;
        list.innerHTML = '';
        if (!skills || !skills.length){
            list.innerHTML = '<div class="text-sm text-gray-500">No skills yet.</div>';
            return;
        }
        skills.forEach(s => {
            const el = document.createElement('div');
            el.className = 'flex items-center justify-between p-2 bg-white rounded shadow-sm';
            el.innerHTML = `
                <div class="flex items-center gap-3">
                    ${s.image ? `<img src="${s.image}" class="w-10 h-10 object-cover rounded" />` : '<div class="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-400"> <i class="fas fa-code"></i></div>'}
                    <div>
                        <div class="font-medium">${escapeHtml(s.name || '')}</div>
                        <div class="text-sm text-gray-500">${escapeHtml(s.desc || '')}</div>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button data-id="${s.id}" class="admin-skill-edit px-2 py-1 bg-blue-600 text-white rounded text-sm">Edit</button>
                    <button data-id="${s.id}" class="admin-skill-delete px-2 py-1 bg-red-100 text-red-800 rounded text-sm">Delete</button>
                </div>
            `;
            list.appendChild(el);
        });

        // attach handlers
        list.querySelectorAll('.admin-skill-edit').forEach(btn => btn.addEventListener('click', async (e)=>{
            const id = btn.getAttribute('data-id');
            const skills = await loadSkills();
            const s = skills.find(x=>x.id===id);
            openSkillForm(s);
        }));
        list.querySelectorAll('.admin-skill-delete').forEach(btn => btn.addEventListener('click', async (e)=>{
            const id = btn.getAttribute('data-id');
            if (!confirm('Delete this skill?')) return;
            try{
                // remove locally
                const skills = (await loadSkills()).filter(x=>x.id!==id);
                await saveSkillsArray(skills);
                renderAdminSkillsList(skills);
                renderSkillsOnPage(skills);
                // also try delete from Firestore
                if (window.db){
                    try{ await db.collection('skills').doc(id).delete(); }catch(e){ /*ignore*/ }
                }
                alert('Skill deleted.');
            }catch(err){ console.error('Failed to delete skill', err); alert('Failed to delete skill'); }
        }));
    }

    function openSkillForm(skill){
        const form = document.getElementById('admin-skill-form');
        if (!form) return;
        document.getElementById('admin-skill-id').value = skill && skill.id ? skill.id : '';
        document.getElementById('admin-skill-name').value = skill && skill.name ? skill.name : '';
        document.getElementById('admin-skill-desc').value = skill && skill.desc ? skill.desc : '';
        const preview = document.getElementById('admin-skill-image-preview');
        if (preview){
            if (skill && skill.image){ preview.src = skill.image; preview.classList.remove('hidden'); }
            else { preview.src = ''; preview.classList.add('hidden'); }
        }
        form.classList.remove('hidden');
    }

    function closeSkillForm(){
        const form = document.getElementById('admin-skill-form');
        if (!form) return;
        form.classList.add('hidden');
        document.getElementById('admin-skill-id').value = '';
        document.getElementById('admin-skill-name').value = '';
        document.getElementById('admin-skill-desc').value = '';
        const input = document.getElementById('admin-skill-image'); if (input) input.value = null;
        const preview = document.getElementById('admin-skill-image-preview'); if (preview){ preview.src=''; preview.classList.add('hidden'); }
    }

    async function onSkillSave(){
        const id = document.getElementById('admin-skill-id').value || '';
        const name = document.getElementById('admin-skill-name').value.trim();
        const desc = document.getElementById('admin-skill-desc').value.trim();
        const fileInput = document.getElementById('admin-skill-image');
        let imageUrl = '';
        try{
            if (fileInput && fileInput.files && fileInput.files[0] && window.StorageAPI && window.StorageAPI.uploadImage){
                imageUrl = await window.StorageAPI.uploadImage(fileInput.files[0], 'skills');
            }
        }catch(err){ console.error('Skill image upload failed', err); alert('Image upload failed; skill will be saved without image.'); }

        // load current skills, update or add
        const skills = await loadSkills();
        if (id){
            const idx = skills.findIndex(s=>s.id===id);
            if (idx !== -1){
                skills[idx].name = name;
                skills[idx].desc = desc;
                if (imageUrl) skills[idx].image = imageUrl;
            }
        }else{
            const newSkill = { id: makeId(), name, desc, image: imageUrl || '' };
            skills.push(newSkill);
        }
        await saveSkillsArray(skills);
        renderAdminSkillsList(skills);
        renderSkillsOnPage(skills);
        closeSkillForm();
        alert('Skill saved.');
    }

    // preview for skill image
    const skillImageInput = document.getElementById('admin-skill-image');
    if (skillImageInput){
        skillImageInput.addEventListener('change', (e)=>{
            const f = e.target.files && e.target.files[0];
            if (!f) return;
            const r = new FileReader(); r.onload = (ev)=>{
                const p = document.getElementById('admin-skill-image-preview'); if (p){ p.src = ev.target.result; p.classList.remove('hidden'); }
            }; r.readAsDataURL(f);
        });
    }

    // add button wiring
    const skillAddBtn = document.getElementById('admin-skill-add');
    if (skillAddBtn) skillAddBtn.addEventListener('click', ()=> openSkillForm(null));
    const skillSaveBtn = document.getElementById('admin-skill-save');
    if (skillSaveBtn) skillSaveBtn.addEventListener('click', onSkillSave);
    const skillCancelBtn = document.getElementById('admin-skill-cancel');
    if (skillCancelBtn) skillCancelBtn.addEventListener('click', closeSkillForm);

    async function renderSkillsOnPage(skills){
        try{
            const grid = document.getElementById('skillsGrid');
            if (!grid) return;
            // render cards for each skill
            if (!skills || !skills.length){
                // keep existing static markup if present
                return;
            }
            grid.innerHTML = '';
            skills.forEach(s=>{
                const div = document.createElement('div');
                div.className = 'bg-gradient-to-br from-gray-50 to-gray-100 p-8 rounded-2xl shadow-md hover:shadow-lg transition transform hover:-translate-y-1';
                div.innerHTML = `\n                    <div class="text-4xl mb-4">${s.image ? `<img src="${s.image}" class="w-12 h-12 object-cover inline-block rounded" />` : '<i class="fas fa-code text-orange-500"></i>'}</div>\n                    <h3 class="text-xl font-bold text-gray-900 mb-2">${escapeHtml(s.name || '')}</h3>\n                    <p class="text-gray-600">${escapeHtml(s.desc || '')}</p>\n                `;
                grid.appendChild(div);
            });
        }catch(e){ console.warn('renderSkillsOnPage error', e); }
    }

    // tiny helper to avoid XSS in admin-rendered text
    function escapeHtml(str){ if (!str) return ''; return String(str).replace(/[&<>"'`]/g, function(s){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'})[s]; }); }

    // on page load, render skills
    document.addEventListener('DOMContentLoaded', async ()=>{
        try{
            const skills = await loadSkills();
            renderSkillsOnPage(skills);
        }catch(e){ /*ignore*/ }
    });

    if (openBtn) openBtn.addEventListener('click', openPanel);
    if (closeBtn) closeBtn.addEventListener('click', closePanel);
    if (saveBtn) saveBtn.addEventListener('click', onSave);
    if (loadBtn) loadBtn.addEventListener('click', onLoadClick);
    if (resetBtn) resetBtn.addEventListener('click', onReset);

    // on page load, apply saved site data if any
    document.addEventListener('DOMContentLoaded', async ()=>{
        try{
            const data = await loadSiteData();
            applySiteDataToDOM(data);
        }catch(e){ console.warn('Failed to apply site data', e); }
    });

})();
