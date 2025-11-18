/* skills.js
 * Page script for src/skills.html
 * Loads skills from Firestore collection 'skills' (if available) or localStorage 'site_skills'
 * Renders grid, supports client-side search and `?focus=` query param to filter results.
 */
(function(){
    // Use a page-local localStorage key so adding skills here doesn't modify the site's admin-managed skills
    const KEY = 'site_skills_page';

    async function loadSkills(){
        if (window.db){
            try{
                const snap = await db.collection('skills').get();
                return snap.docs.map(d => Object.assign({}, d.data(), { id: d.id }));
            }catch(err){ console.warn('Failed to load skills from Firestore', err); }
        }
        const raw = localStorage.getItem(KEY);
        if (!raw) return [];
        try{ return JSON.parse(raw); }catch(e){ return []; }
    }

    function slug(s){ return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'').slice(0,40); }

    function makeId(){ return 's_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,6); }

    function renderGrid(skills){
        const container = document.getElementById('skillsContainer');
        const emptyEl = document.getElementById('skills-empty');
        if (!container) return;
        container.innerHTML = '';
        if (!skills || !skills.length){ emptyEl.classList.remove('hidden'); return; }
        emptyEl.classList.add('hidden');
        skills.forEach(s => {
            const el = document.createElement('div');
            el.className = 'bg-white p-6 rounded-2xl shadow hover:shadow-lg relative';
            el.innerHTML = `
                <div class="flex items-center gap-4">
                    <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                        ${s.image ? `<img src="${s.image}" alt="${escapeHtml(s.name)}" class="w-full h-full object-cover" />` : '<i class="fas fa-code text-2xl text-gray-400"></i>'}
                    </div>
                    <div class="flex-1">
                        <div class="font-semibold text-lg">${escapeHtml(s.name || '')}</div>
                        <div class="text-sm text-gray-600">${escapeHtml(s.desc || '')}</div>
                    </div>
                </div>
                <div class="absolute top-3 right-3 flex gap-2">
                    <button class="edit-skill text-sm px-2 py-1 bg-blue-600 text-white rounded" data-id="${s.id}">Edit</button>
                    <button class="delete-skill text-sm px-2 py-1 bg-red-100 text-red-800 rounded" data-id="${s.id}">Delete</button>
                </div>
            `;
            el.dataset.slug = slug(s.name);
            container.appendChild(el);

            // attach handlers for edit/delete
            const editBtn = el.querySelector('.edit-skill');
            const delBtn = el.querySelector('.delete-skill');
            if (editBtn){
                editBtn.addEventListener('click', (e)=>{
                    e.stopPropagation();
                    openEditModal(s);
                });
            }
            if (delBtn){
                delBtn.addEventListener('click', async (e)=>{
                    e.stopPropagation();
                    if (!confirm('Xóa kỹ năng này?')) return;
                    try{
                        // remove locally
                        skills = skills.filter(x=>x.id !== s.id);
                        try{ localStorage.setItem(KEY, JSON.stringify(skills)); }catch(e){ console.warn('local save failed', e); }
                        // try remove from Firestore
                        if (window.db){
                            try{ await db.collection('skills').doc(s.id).delete(); }catch(err){ console.warn('Failed to delete from Firestore', err); }
                        }
                        renderGrid(skills);
                    }catch(err){ console.error('delete error', err); alert('Xóa thất bại'); }
                });
            }
        });
    }

    function escapeHtml(str){ if (!str) return ''; return String(str).replace(/[&<>"'`]/g, function(s){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'})[s]; }); }

    function getQueryParam(name){ const u = new URL(location.href); return u.searchParams.get(name); }

    document.addEventListener('DOMContentLoaded', async ()=>{
        try{
            let skills = await loadSkills();
            // initial render
            renderGrid(skills);

            // wire Add Skill UI
            const addBtn = document.getElementById('addSkillBtn');
            const modal = document.getElementById('addSkillModal');
            const closeBtn = document.getElementById('closeAddSkill');
            const cancelBtn = document.getElementById('add-skill-cancel');
            const saveBtn = document.getElementById('add-skill-save');
            const fileInput = document.getElementById('add-skill-image');
            const preview = document.getElementById('add-skill-image-preview');

            if (addBtn && modal){
                addBtn.addEventListener('click', ()=>{ modal.classList.remove('hidden'); modal.classList.add('flex'); });
            }
            if (closeBtn) closeBtn.addEventListener('click', ()=>{ modal.classList.add('hidden'); modal.classList.remove('flex'); });
            if (cancelBtn) cancelBtn.addEventListener('click', ()=>{ modal.classList.add('hidden'); modal.classList.remove('flex'); });

            if (fileInput){
                fileInput.addEventListener('change', (e)=>{
                    const f = e.target.files && e.target.files[0];
                    if (!f) return;
                    const r = new FileReader(); r.onload = (ev)=>{ if (preview){ preview.src = ev.target.result; preview.classList.remove('hidden'); } }; r.readAsDataURL(f);
                });
            }

            if (saveBtn){
                saveBtn.addEventListener('click', async ()=>{
                    const name = document.getElementById('add-skill-name').value.trim();
                    const desc = document.getElementById('add-skill-desc').value.trim();
                    const file = fileInput && fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
                    if (!name){ alert('Please enter a skill name'); return; }
                    let imageUrl = '';
                    try{
                        if (file && window.StorageAPI && window.StorageAPI.uploadImage){
                            saveBtn.disabled = true; saveBtn.textContent = 'Uploading...';
                            imageUrl = await window.StorageAPI.uploadImage(file, 'skills');
                        }
                    }catch(err){ console.error('upload failed', err); alert('Image upload failed, continuing without image'); }

                    // create skill object and save locally + try Firestore
                    const newSkill = { id: makeId(), name, desc, image: imageUrl || '' };
                    // update local list and storage
                    skills = skills || [];
                    skills.push(newSkill);
                    try{ localStorage.setItem(KEY, JSON.stringify(skills)); }catch(e){ console.warn('local save failed', e); }

                    // try Firestore save (add doc) if db available and user signed in
                    if (window.db){
                        try{
                            const user = window.currentUser || (window.FirestoreAPI && window.FirestoreAPI.getCurrentUser && window.FirestoreAPI.getCurrentUser());
                            if (user){
                                const col = db.collection('skills');
                                const docRef = col.doc(newSkill.id);
                                await docRef.set({ name: newSkill.name, desc: newSkill.desc, image: newSkill.image });
                            } else {
                                console.info('Not signed in - skipped Firestore write for new skill');
                            }
                        }catch(err){ console.warn('Failed to write new skill to Firestore', err); }
                    }

                    // re-render
                    renderGrid(skills);
                    // reset & close modal
                    document.getElementById('add-skill-name').value = '';
                    document.getElementById('add-skill-desc').value = '';
                    if (fileInput) fileInput.value = null;
                    if (preview){ preview.src = ''; preview.classList.add('hidden'); }
                    modal.classList.add('hidden'); modal.classList.remove('flex');
                    saveBtn.disabled = false; saveBtn.textContent = 'Save';
                });
            }

            // support focus param
            const focus = getQueryParam('focus');
            if (focus){
                const f = String(focus).toLowerCase();
                const filtered = skills.filter(s => (s.name||'').toLowerCase().indexOf(f) !== -1 || slug(s.name) === f);
                if (filtered.length) renderGrid(filtered);
            }

            // search box
            const search = document.getElementById('skills-search');
            if (search){
                search.addEventListener('input', (e)=>{
                    const q = (e.target.value||'').trim().toLowerCase();
                    if (!q){ renderGrid(skills); return; }
                    const filtered = skills.filter(s => ((s.name||'')+ ' ' + (s.desc||'')).toLowerCase().indexOf(q) !== -1);
                    renderGrid(filtered);
                });
            }
        }catch(err){ console.error('skills page error', err); }
    });

})();
