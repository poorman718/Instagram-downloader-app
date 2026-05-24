(function() {
    'use strict';

    // ========== THEME ==========
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('light');
            localStorage.setItem('theme', document.body.classList.contains('light') ? 'light' : 'dark');
        });
        const saved = localStorage.getItem('theme');
        if (saved === 'light') document.body.classList.add('light');
        else document.body.classList.remove('light');
    }

    // ========== DROPDOWN ==========
    const toolsBtn = document.getElementById('toolsDropdownBtn');
    const toolsMenu = document.getElementById('toolsDropdownMenu');
    if (toolsBtn && toolsMenu) {
        toolsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toolsBtn.classList.toggle('open');
            toolsMenu.classList.toggle('show');
        });
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!toolsBtn.contains(e.target) && !toolsMenu.contains(e.target)) {
                toolsBtn.classList.remove('open');
                toolsMenu.classList.remove('show');
            }
        });
        // Dropdown items – just demo action
        toolsMenu.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const platform = item.getAttribute('data-platform');
                showToast(`${platform} downloader coming soon!`, 'info');
                toolsBtn.classList.remove('open');
                toolsMenu.classList.remove('show');
            });
        });
    }

    // ========== MODALS ==========
    const overlay = document.getElementById('modalOverlay');
    const modalContent = document.getElementById('modalContent');
    const modalClose = document.getElementById('modalClose');

    const modalData = {
        disclaimer: {
            title: 'Disclaimer',
            text: 'DownReels is an independent tool and is not affiliated with Instagram or Meta. We do not host any content. Users are responsible for ensuring they have the right to download the media. This tool is intended for personal use only.'
        },
        policy: {
            title: 'Privacy Policy',
            text: 'We do not collect, store, or share any personal information. All processing is done client‑side. We use a third‑party API only for fetching public Instagram media. No cookies or tracking technologies are used.'
        },
        terms: {
            title: 'Terms of Service',
            text: 'By using DownReels you agree to download only content you own or have permission to use. Misuse of this tool is strictly prohibited. We reserve the right to discontinue the service at any time without notice.'
        },
        about: {
            title: 'About DownReels',
            text: 'DownReels is a fast, free Instagram video downloader built for creators. Our mission is to provide a seamless downloading experience with no watermarks, no logins, and maximum quality. We support Reels, Videos, and more.'
        }
    };

    function openModal(key) {
        const data = modalData[key];
        if (!data) return;
        modalContent.innerHTML = `<h2>${data.title}</h2><p>${data.text}</p>`;
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (overlay && modalClose) {
        modalClose.addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay.classList.contains('active')) closeModal();
        });
    }

    // Footer links
    document.querySelectorAll('.footer-link').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalKey = btn.getAttribute('data-modal');
            openModal(modalKey);
        });
    });

    // ========== VIDEO DOWNLOAD APP (unchanged) ==========
    const urlInput = document.getElementById('urlInput');
    const pasteBtn = document.getElementById('pasteBtn');
    const errorMsg = document.getElementById('errorMsg');
    const loader = document.getElementById('loader');
    const results = document.getElementById('results');
    const resultsGrid = document.getElementById('resultsGrid');

    if (!pasteBtn || !urlInput) return;

    let isFetching = false;

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

    urlInput.addEventListener('paste', () => {
        setTimeout(async () => {
            const url = urlInput.value.trim();
            if (url && (url.includes('instagram.com') || url.includes('instagr.am'))) {
                await startDownload();
            }
        }, 200);
    });

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
            const videos = data.filter(item => item.type === 'video' || (item.url && item.url.includes('.mp4')));
            if (videos.length === 0) throw new Error('No video found.');
            renderResults(videos);
            results.style.display = 'block';
            document.body.classList.add('results-active');
            showToast(`${videos.length} video(s) ready!`, 'success');
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

    function renderResults(videos) {
        resultsGrid.innerHTML = '';
        videos.forEach((item, i) => {
            const card = document.createElement('div');
            card.className = 'result-row';
            card.style.animation = `fadeIn 0.3s ${i * 0.1}s both`;

            const title = item.title || 'Instagram Video';
            const shortTitle = title.split(' ').slice(0, 6).join(' ') + (title.split(' ').length > 6 ? '...' : '');
            const safeFilename = `${sanitize(title)}_${item.username || 'instagram'}.mp4`;

            card.innerHTML = `
                <div class="result-preview">
                    <video class="result-video" controls muted loop playsinline src="${item.url}"></video>
                    ${item.duration ? `<span class="result-duration-badge">${item.duration}s</span>` : ''}
                </div>
                <div class="result-content">
                    <div>
                        <h3 class="result-title" title="Click to copy full title">${shortTitle}</h3>
                        <div class="result-creator"><span class="creator-dot"></span>${item.username || '@instagram'}</div>
                        <div class="result-meta">
                            <span class="meta-tag">🎥 Video</span>
                            ${item.likes ? `<span class="meta-tag">❤️ ${formatNum(item.likes)}</span>` : ''}
                            ${item.views ? `<span class="meta-tag">👁 ${formatNum(item.views)}</span>` : ''}
                        </div>
                    </div>
                    <div class="result-actions">
                        <button class="btn-dl-row" data-url="${item.url}" data-filename="${safeFilename}">⬇ Download Video</button>
                        <button class="btn-new-link">+ New Link</button>
                    </div>
                </div>
            `;

            card.querySelector('.btn-dl-row').addEventListener('click', async function(e) {
                e.stopPropagation();
                const btn = this;
                const videoUrl = btn.getAttribute('data-url');
                const filename = btn.getAttribute('data-filename');
                btn.disabled = true;
                btn.innerHTML = '<span class="btn-spinner"></span> Downloading…';
                try {
                    const downloaded = await downloadBlob(videoUrl, filename);
                    if (downloaded) {
                        btn.innerHTML = '✓ Downloaded';
                        showToast('Download complete!', 'success');
                    } else {
                        triggerAnchorDownload(videoUrl, filename);
                        btn.innerHTML = '✓ Downloaded';
                        showToast('Download started', 'success');
                    }
                } catch (err) {
                    triggerAnchorDownload(videoUrl, filename);
                    btn.innerHTML = '✓ Downloaded';
                    showToast('Download started', 'success');
                }
                setTimeout(() => {
                    btn.disabled = false;
                    btn.innerHTML = '⬇ Download Video';
                }, 2500);
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
        });
    }

    async function downloadBlob(url, filename) {
        try {
            const response = await fetch(url, { mode: 'cors' });
            if (!response.ok) return false;
            const blob = await response.blob();
            if (blob.size === 0) return false;
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(blobUrl); }, 1000);
            return true;
        } catch (e) { return false; }
    }

    function triggerAnchorDownload(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.target = '_self';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => document.body.removeChild(a), 500);
    }

    function formatNum(n) {
        if (!n) return '0';
        n = parseInt(n);
        if (n >= 1000000) return (n/1000000).toFixed(1)+'M';
        if (n >= 1000) return (n/1000).toFixed(1)+'K';
        return n.toString();
    }

    function sanitize(str) {
        return (str || 'video').replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, '_').substring(0, 40);
    }

    // FAQ
    document.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', () => btn.closest('.faq-item').classList.toggle('open'));
    });

    // Toast (global)
    window.showToast = function(msg, type = 'success') {
        const t = document.getElementById('toast');
        const tm = document.getElementById('toastMsg');
        if (!t || !tm) return;
        tm.textContent = msg;
        t.className = 'toast show';
        t.style.borderLeft = type === 'error' ? '4px solid #ed4956' : type === 'info' ? '4px solid #0095f6' : '4px solid #78de45';
        clearTimeout(t._t);
        t._t = setTimeout(() => t.classList.remove('show'), 3500);
    };
    window.hideToast = function() {
        const t = document.getElementById('toast');
        if (t) t.classList.remove('show');
    };
})();

// Animation
const animStyle = document.createElement('style');
animStyle.textContent = `@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`;
document.head.appendChild(animStyle);
