(function() {
    'use strict';

    // Theme Toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('light');
            localStorage.setItem('theme', document.body.classList.contains('light') ? 'light' : 'dark');
        });
        if (localStorage.getItem('theme') === 'light') document.body.classList.add('light');
    }

    // App Elements
    const urlInput = document.getElementById('urlInput');
    const pasteBtn = document.getElementById('pasteBtn');
    const errorMsg = document.getElementById('errorMsg');
    const loader = document.getElementById('loader');
    const results = document.getElementById('results');
    const resultsGrid = document.getElementById('resultsGrid');

    if (!pasteBtn || !urlInput) return;
    let isFetching = false;

    // Paste Button
    pasteBtn.addEventListener('click', async () => {
        if (isFetching) return;
        try {
            const text = await navigator.clipboard.readText();
            if (text && text.trim()) {
                urlInput.value = text.trim();
                await startDownload();
            } else {
                showToast('Clipboard is empty', 'info');
            }
        } catch {
            urlInput.focus();
            showToast('Paste manually (Ctrl+V)', 'info');
        }
    });

    // Manual Paste
    urlInput.addEventListener('paste', () => {
        setTimeout(async () => {
            const url = urlInput.value.trim();
            if (url && (url.includes('instagram.com') || url.includes('instagr.am'))) {
                await startDownload();
            }
        }, 200);
    });

    // Enter key
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); startDownload(); }
    });

    async function startDownload() {
        const url = urlInput.value.trim();
        if (!url) { errorMsg.textContent = 'Please enter a URL'; return; }
        if (!url.includes('instagram.com') && !url.includes('instagr.am')) {
            errorMsg.textContent = 'Invalid Instagram URL'; return;
        }
        if (isFetching) return;

        isFetching = true;
        errorMsg.textContent = '';
        results.style.display = 'none';
        loader.style.display = 'flex';
        pasteBtn.disabled = true;
        urlInput.disabled = true;

        try {
            const items = await fetchInstagramMedia(url);
            if (!items || items.length === 0) throw new Error('No media found');
            renderResults(items);
            results.style.display = 'block';
            document.body.classList.add('results-active');
            showToast('Media ready!', 'success');
            setTimeout(() => results.scrollIntoView({ behavior: 'smooth' }), 100);
        } catch (err) {
            errorMsg.textContent = err.message;
            showToast(err.message, 'error');
        } finally {
            loader.style.display = 'none';
            pasteBtn.disabled = false;
            urlInput.disabled = false;
            isFetching = false;
        }
    }

    // ========== RENDER RESULTS ==========
    function renderResults(items) {
        resultsGrid.innerHTML = '';
        
        // Group all media into one card
        const card = document.createElement('div');
        card.className = 'result-row';
        card.style.animation = 'fadeIn 0.3s both';

        // Build preview container with switcher
        const previewHTML = createMediaPreview(items);
        const infoHTML = createMediaInfo(items);
        const actionsHTML = createActions(items);

        card.innerHTML = `
            <div class="result-preview-wrapper">
                ${previewHTML}
            </div>
            <div class="result-content">
                ${infoHTML}
                ${actionsHTML}
            </div>
        `;

        // Attach events
        attachCardEvents(card, items);
        resultsGrid.appendChild(card);
    }

    function createMediaPreview(items) {
        if (items.length === 1) {
            const item = items[0];
            const isVideo = item.type === 'video' || (item.url && item.url.includes('.mp4'));
            return `
                <div class="preview-main" data-index="0">
                    ${isVideo ? 
                        `<video class="preview-video" controls muted loop playsinline src="${item.url}"></video>` :
                        `<img class="preview-img" src="${item.thumbnail || item.url}" alt="media">`
                    }
                    ${item.duration ? `<span class="duration-badge">${item.duration}s</span>` : ''}
                </div>
            `;
        }

        // Multiple media – show first as main, and thumbnails below
        let mainMedia = '';
        const firstItem = items[0];
        const isFirstVideo = firstItem.type === 'video' || (firstItem.url && firstItem.url.includes('.mp4'));
        mainMedia = `
            <div class="preview-main" data-index="0">
                ${isFirstVideo ? 
                    `<video class="preview-video" controls muted loop playsinline src="${firstItem.url}"></video>` :
                    `<img class="preview-img" src="${firstItem.thumbnail || firstItem.url}" alt="media">`
                }
                ${firstItem.duration ? `<span class="duration-badge">${firstItem.duration}s</span>` : ''}
            </div>
        `;

        let thumbnails = '<div class="preview-thumbs">';
        items.forEach((item, i) => {
            const isVideo = item.type === 'video' || (item.url && item.url.includes('.mp4'));
            thumbnails += `
                <div class="thumb-item ${i === 0 ? 'active' : ''}" data-index="${i}">
                    ${isVideo ? 
                        `<video class="thumb-video" muted src="${item.thumbnail || item.url}"></video>` :
                        `<img class="thumb-img" src="${item.thumbnail || item.url}" alt="thumb">`
                    }
                </div>
            `;
        });
        thumbnails += '</div>';

        return mainMedia + thumbnails;
    }

    function createMediaInfo(items) {
        // Use first item's caption/username, but show total count
        const item = items[0];
        const title = item.title || 'Instagram Media';
        const shortTitle = title.split(' ').slice(0, 6).join(' ') + (title.split(' ').length > 6 ? '...' : '');
        const username = item.username || '@instagram';
        const total = items.length;

        return `
            <h3 class="result-title" title="Click to copy">${shortTitle}</h3>
            <div class="result-creator"><span class="creator-dot"></span>${username}</div>
            <div class="result-meta">
                <span class="meta-tag">📸 ${total} media</span>
                ${item.likes ? `<span class="meta-tag">❤️ ${formatNum(item.likes)}</span>` : ''}
                ${item.views ? `<span class="meta-tag">👁 ${formatNum(item.views)}</span>` : ''}
            </div>
        `;
    }

    function createActions(items) {
        // Show one download button per media item
        let buttons = '';
        if (items.length === 1) {
            buttons = `<button class="btn-dl-row" data-index="0">⬇ Download</button>`;
        } else {
            buttons = items.map((_, i) => `<button class="btn-dl-row" data-index="${i}">⬇ Media ${i+1}</button>`).join('');
        }
        return `
            <div class="result-actions">
                ${buttons}
                <button class="btn-new-link">+ New Link</button>
            </div>
        `;
    }

    function attachCardEvents(card, items) {
        // Thumbnail click to switch main preview
        const thumbs = card.querySelectorAll('.thumb-item');
        const mainPreview = card.querySelector('.preview-main');
        
        thumbs.forEach(thumb => {
            thumb.addEventListener('click', () => {
                const index = parseInt(thumb.dataset.index);
                // Update active state
                card.querySelectorAll('.thumb-item').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
                // Replace main preview content
                const item = items[index];
                const isVideo = item.type === 'video' || (item.url && item.url.includes('.mp4'));
                mainPreview.innerHTML = `
                    ${isVideo ? 
                        `<video class="preview-video" controls muted loop playsinline src="${item.url}"></video>` :
                        `<img class="preview-img" src="${item.thumbnail || item.url}" alt="media">`
                    }
                    ${item.duration ? `<span class="duration-badge">${item.duration}s</span>` : ''}
                `;
                mainPreview.dataset.index = index;
            });
        });

        // Download buttons
        card.querySelectorAll('.btn-dl-row').forEach(btn => {
            btn.addEventListener('click', async function(e) {
                e.preventDefault();
                const index = parseInt(this.dataset.index);
                const item = items[index];
                const url = item.url;
                const isVideo = item.type === 'video' || (url && url.includes('.mp4'));
                const ext = isVideo ? 'mp4' : 'jpg';
                const filename = `instagram_${Date.now()}.${ext}`;

                this.disabled = true;
                this.innerHTML = '<span class="btn-spinner"></span>';

                // Try direct fetch first
                let downloaded = await tryDownload(url, filename);
                if (!downloaded) {
                    // Fallback: CORS proxy
                    const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(url);
                    downloaded = await tryDownload(proxyUrl, filename);
                }
                if (!downloaded) {
                    // Last resort: anchor with download attribute (may open in same tab)
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    a.target = '_self';
                    a.click();
                }

                this.innerHTML = '✓ Done';
                showToast('Download complete!', 'success');
                setTimeout(() => {
                    this.disabled = false;
                    this.innerHTML = '⬇ Download';
                }, 2000);
            });
        });

        // New Link button
        card.querySelector('.btn-new-link').addEventListener('click', () => {
            document.body.classList.remove('results-active');
            results.style.display = 'none';
            urlInput.value = '';
            errorMsg.textContent = '';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        // Title copy
        card.querySelector('.result-title').addEventListener('click', async () => {
            await navigator.clipboard.writeText(items[0].title);
            showToast('Title copied!', 'success');
        });
    }

    async function tryDownload(url, filename) {
        try {
            const response = await fetch(url, { mode: 'cors' });
            if (!response.ok) return false;
            const blob = await response.blob();
            if (blob.size === 0) return false;
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            a.click();
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
            return true;
        } catch (e) {
            return false;
        }
    }

    function formatNum(n) {
        if (!n) return '0';
        n = parseInt(n);
        if (n >= 1000000) return (n/1000000).toFixed(1)+'M';
        if (n >= 1000) return (n/1000).toFixed(1)+'K';
        return n.toString();
    }

    // FAQ
    document.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', () => btn.closest('.faq-item').classList.toggle('open'));
    });

    // Toast
    window.showToast = function(msg, type = 'success') {
        const t = document.getElementById('toast');
        const tm = document.getElementById('toastMsg');
        tm.textContent = msg;
        t.className = 'toast show';
        t.style.borderLeftColor = type === 'error' ? '#ed4956' : type === 'info' ? '#0095f6' : '#78de45';
        clearTimeout(t._t);
        t._t = setTimeout(() => t.classList.remove('show'), 3500);
    };
    window.hideToast = () => document.getElementById('toast').classList.remove('show');
})();

// Animations
const s = document.createElement('style');
s.textContent = `@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`;
document.head.appendChild(s);
