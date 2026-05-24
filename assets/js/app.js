(function() {
    'use strict';

    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('light');
            localStorage.setItem('theme', document.body.classList.contains('light') ? 'light' : 'dark');
        });
        if (localStorage.getItem('theme') === 'light') document.body.classList.add('light');
    }

    // Elements
    const urlInput = document.getElementById('urlInput');
    const pasteBtn = document.getElementById('pasteBtn');
    const errorMsg = document.getElementById('errorMsg');
    const loader = document.getElementById('loader');
    const results = document.getElementById('results');
    const resultsGrid = document.getElementById('resultsGrid');

    if (!pasteBtn || !urlInput) return;
    let isFetching = false;

    // Paste button
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

    // Manual paste
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

    function renderResults(items) {
        resultsGrid.innerHTML = '';

        // Use the first item for main display (could be video or photo)
        const mainItem = items[0];
        const isVideo = mainItem.type === 'video' || (mainItem.url && mainItem.url.includes('.mp4'));
        const thumbnailUrl = mainItem.thumbnail || mainItem.url;
        const videoUrl = isVideo ? mainItem.url : null;
        const title = mainItem.title || 'Instagram Media';
        const shortTitle = title.split(' ').slice(0, 6).join(' ') + (title.split(' ').length > 6 ? '...' : '');
        const username = mainItem.username || '@instagram';

        const card = document.createElement('div');
        card.className = 'result-row';
        card.style.animation = 'fadeIn 0.3s both';

        card.innerHTML = `
            <div class="result-preview">
                ${isVideo ? 
                    `<video class="preview-video" controls muted loop playsinline src="${videoUrl}"></video>` :
                    `<img class="preview-img" src="${thumbnailUrl}" alt="media">`
                }
                ${mainItem.duration ? `<span class="duration-badge">${mainItem.duration}s</span>` : ''}
            </div>
            <div class="result-content">
                <h3 class="result-title" title="Click to copy">${shortTitle}</h3>
                <div class="result-creator"><span class="creator-dot"></span>${username}</div>
                <div class="result-meta">
                    ${mainItem.likes ? `<span class="meta-tag">❤️ ${formatNum(mainItem.likes)}</span>` : ''}
                    ${mainItem.views ? `<span class="meta-tag">👁 ${formatNum(mainItem.views)}</span>` : ''}
                </div>
                <div class="result-actions">
                    <button class="btn-thumbnail" data-url="${thumbnailUrl}">📷 Thumbnail</button>
                    ${videoUrl ? `<button class="btn-video" data-url="${videoUrl}">⬇ Video</button>` : ''}
                    <button class="btn-new-link">+ New Link</button>
                </div>
            </div>
        `;

        // Attach events
        card.querySelector('.btn-thumbnail')?.addEventListener('click', function() {
            downloadFile(this, thumbnailUrl, 'thumbnail_' + Date.now() + '.jpg');
        });
        card.querySelector('.btn-video')?.addEventListener('click', function() {
            downloadFile(this, videoUrl, 'video_' + Date.now() + '.mp4');
        });
        card.querySelector('.btn-new-link').addEventListener('click', () => {
            document.body.classList.remove('results-active');
            results.style.display = 'none';
            urlInput.value = '';
            errorMsg.textContent = '';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        card.querySelector('.result-title').addEventListener('click', async () => {
            await navigator.clipboard.writeText(title);
            showToast('Title copied!', 'success');
        });

        resultsGrid.appendChild(card);
    }

    async function downloadFile(button, url, filename) {
        button.disabled = true;
        const originalText = button.innerHTML;
        button.innerHTML = '<span class="btn-spinner"></span>';

        // Try direct fetch
        let success = false;
        try {
            const res = await fetch(url, { mode: 'cors' });
            if (res.ok) {
                const blob = await res.blob();
                if (blob.size > 0) {
                    const blobUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = blobUrl;
                    a.download = filename;
                    a.click();
                    URL.revokeObjectURL(blobUrl);
                    success = true;
                }
            }
        } catch (e) { /* fallback */ }

        // Fallback: cors proxy
        if (!success) {
            try {
                const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(url);
                const res = await fetch(proxyUrl);
                if (res.ok) {
                    const blob = await res.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = blobUrl;
                    a.download = filename;
                    a.click();
                    URL.revokeObjectURL(blobUrl);
                    success = true;
                }
            } catch (e) { /* final fallback */ }
        }

        // Absolute last resort: anchor (same tab)
        if (!success) {
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.target = '_self';
            a.click();
        }

        button.innerHTML = '✓ Done';
        showToast('Download complete!', 'success');
        setTimeout(() => {
            button.disabled = false;
            button.innerHTML = originalText;
        }, 2000);
    }

    function formatNum(n) {
        if (!n) return '0';
        n = parseInt(n);
        if (n >= 1000000) return (n/1000000).toFixed(1)+'M';
        if (n >= 1000) return (n/1000).toFixed(1)+'K';
        return n.toString();
    }

    // FAQ toggle
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

// Animation
const style = document.createElement('style');
style.textContent = `@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`;
document.head.appendChild(style);
