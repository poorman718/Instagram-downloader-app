(function() {
    'use strict';

    // Theme Toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('light');
            const isLight = document.body.classList.contains('light');
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
        });
        // Load saved theme
        const saved = localStorage.getItem('theme');
        if (saved === 'light') document.body.classList.add('light');
        else document.body.classList.remove('light');
    }

    // App Elements
    const urlInput = document.getElementById('urlInput');
    const pasteBtn = document.getElementById('pasteBtn');
    const errorMsg = document.getElementById('errorMsg');
    const loader = document.getElementById('loader');
    const results = document.getElementById('results');
    const resultsGrid = document.getElementById('resultsGrid');
    const downloaderCard = document.getElementById('downloaderCard');

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
            const data = await fetchInstagramMedia(url);
            if (!data || data.length === 0) throw new Error('No media found');
            renderResults(data);
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
        items.forEach((item, i) => {
            const card = document.createElement('div');
            card.className = 'result-row';
            card.style.animation = `fadeIn 0.3s ${i * 0.1}s both`;

            const isVideo = item.type === 'video' || (item.url && item.url.includes('.mp4'));
            const title = item.title || 'Instagram Media';
            const shortTitle = title.split(' ').slice(0, 6).join(' ') + (title.split(' ').length > 6 ? '...' : '');

            card.innerHTML = `
                <div class="result-preview">
                    ${isVideo ? `<video class="result-video" controls muted loop playsinline src="${item.url}"></video>` :
                    `<img class="result-video" src="${item.thumbnail || item.url}" alt="preview" onerror="this.style.opacity='0.3'">`}
                    ${item.duration ? `<span class="result-duration-badge">${item.duration}s</span>` : ''}
                </div>
                <div class="result-content">
                    <div>
                        <h3 class="result-title" title="Click to copy">${shortTitle}</h3>
                        <div class="result-creator"><span class="creator-dot"></span>${item.username || '@instagram'}</div>
                        <div class="result-meta">
                            <span class="meta-tag">${isVideo ? '🎥 Video' : '📷 Photo'}</span>
                            ${item.likes ? `<span class="meta-tag">❤️ ${formatNum(item.likes)}</span>` : ''}
                            ${item.views ? `<span class="meta-tag">👁 ${formatNum(item.views)}</span>` : ''}
                        </div>
                    </div>
                    <div class="result-actions">
                        <button class="btn-dl-row" data-url="${item.url}">⬇ Download</button>
                        <button class="btn-new-link">+ New Link</button>
                    </div>
                </div>
            `;

            // Download button
            card.querySelector('.btn-dl-row').addEventListener('click', async function() {
                this.disabled = true;
                this.innerHTML = '<span class="btn-spinner"></span>';
                try {
                    const res = await fetch(item.url);
                    const blob = await res.blob();
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `instagram_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`;
                    a.click();
                    this.innerHTML = '✓ Done';
                    showToast('Download complete!', 'success');
                } catch {
                    window.open(item.url, '_self');
                    this.innerHTML = '✓ Opened';
                }
                setTimeout(() => { this.disabled = false; this.innerHTML = '⬇ Download'; }, 2000);
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
                await navigator.clipboard.writeText(title);
                showToast('Title copied!', 'success');
            });

            resultsGrid.appendChild(card);
        });
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
        btn.addEventListener('click', () => {
            btn.closest('.faq-item').classList.toggle('open');
        });
    });

    // Toast
    window.showToast = function(msg, type = 'success') {
        const t = document.getElementById('toast');
        const tm = document.getElementById('toastMsg');
        tm.textContent = msg;
        t.className = `toast show`;
        t.style.borderLeft = type === 'error' ? '4px solid #ed4956' : type === 'info' ? '4px solid #0095f6' : '4px solid #78de45';
        clearTimeout(t._t);
        t._t = setTimeout(() => t.classList.remove('show'), 3500);
    };
    window.hideToast = function() {
        document.getElementById('toast').classList.remove('show');
    };
})();

// Animations
const s = document.createElement('style');
s.textContent = `@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`;
document.head.appendChild(s);
