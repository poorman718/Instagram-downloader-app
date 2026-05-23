window.addEventListener('load', () => {
    const urlInput = document.getElementById('urlInput');
    const pasteBtn = document.getElementById('pasteBtn');
    const errorMsg = document.getElementById('errorMsg');
    const loader = document.getElementById('loader');
    const results = document.getElementById('results');
    const resultsGrid = document.getElementById('resultsGrid');

    if (!pasteBtn || !urlInput) {
        console.error('Required elements not found');
        return;
    }

    let isFetching = false;

    // Icon helper functions (returns SVG strings)
    const icons = {
        clipboard: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
        download: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
        newLink: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
        video: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>',
        photo: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
        audio: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>',
        reel: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="3"/></svg>',
        profile: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
    };

    function getMediaIcon(type) {
        switch(type) {
            case 'video': return icons.video;
            case 'reel': return icons.reel;
            case 'story': return icons.video; // same video icon
            case 'photo': case 'profile_picture': return icons.photo;
            case 'audio': return icons.audio;
            default: return icons.photo;
        }
    }

    // Toast messages now use icons
    function showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const toastMsg = document.getElementById('toastMsg');
        if (!toast || !toastMsg) return;
        let icon = '';
        if (type === 'success') icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
        else if (type === 'error') icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
        else if (type === 'info') icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
        toastMsg.innerHTML = icon + ' ' + message;
        toast.className = `toast toast-${type} show`;
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(hideToast, 4000);
    }

    // Paste button handler
    pasteBtn.addEventListener('click', async () => {
        if (isFetching) return;
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                urlInput.value = text;
                showToast('Link pasted! Auto-downloading...', 'info');
                await triggerDownload(text);
            } else {
                showToast('Clipboard is empty.', 'info');
            }
        } catch (err) {
            showToast('Unable to read clipboard.', 'error');
        }
    });

    urlInput.addEventListener('paste', async () => {
        setTimeout(async () => {
            const url = urlInput.value.trim();
            if (url && (url.includes('instagram.com') || url.includes('instagr.am'))) {
                await triggerDownload(url);
            }
        }, 100);
    });

    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const url = urlInput.value.trim();
            if (url) triggerDownload(url);
        }
    });

    async function triggerDownload(url) {
        if (isFetching) return;
        if (!url.includes('instagram.com') && !url.includes('instagr.am')) {
            errorMsg.textContent = 'Please enter a valid Instagram link.';
            return;
        }

        isFetching = true;
        errorMsg.textContent = '';
        results.style.display = 'none';
        loader.style.display = 'flex';
        pasteBtn.disabled = true;
        pasteBtn.style.opacity = '0.7';

        try {
            const data = await fetchInstagramMedia(url);
            console.log('Normalized Data:', data);
            renderResults(data);
            results.style.display = 'block';
            showToast('Media ready!', 'success');
            results.scrollIntoView({ behavior: 'smooth', block: 'center' });
            document.body.classList.add('results-active');
        } catch (err) {
            errorMsg.textContent = err.message || 'Download failed.';
            showToast('Failed to fetch media.', 'error');
        } finally {
            loader.style.display = 'none';
            pasteBtn.disabled = false;
            pasteBtn.style.opacity = '1';
            isFetching = false;
        }
    }

    function renderResults(mediaItems) {
        resultsGrid.innerHTML = '';
        if (!mediaItems || mediaItems.length === 0) {
            resultsGrid.innerHTML = '<div style="text-align:center;padding:2rem;">No downloadable media found.</div>';
            return;
        }
        const validItems = mediaItems.filter(item => item.url);
        if (validItems.length === 0) {
            resultsGrid.innerHTML = '<div style="text-align:center;padding:2rem;">No downloadable media found.</div>';
            return;
        }
        validItems.forEach((item, index) => {
            const card = createHorizontalCard(item, index);
            resultsGrid.appendChild(card);
        });
    }

    function createHorizontalCard(item, index) {
        const card = document.createElement('div');
        card.className = 'result-row';
        card.style.animation = `fadeInUp 0.4s ${index * 0.1}s both`;

        const mediaType = item.type || 'video';
        const downloadUrl = item.url;
        const thumbnail = item.thumbnail || downloadUrl;
        const title = item.title || 'Instagram Media';
        const username = item.username || '@instagram';
        const duration = item.duration || '';
        const quality = item.quality || 'HD';
        const words = title.split(' ');
        const shortTitle = words.slice(0, 8).join(' ') + (words.length > 8 ? '...' : '');
        const typeLabel = getTypeLabel(mediaType);
        const isVideo = downloadUrl.includes('.mp4') || mediaType === 'video' || mediaType === 'reel' || mediaType === 'story';

        card.innerHTML = `
            <div class="result-preview">
                ${isVideo ? 
                    `<video class="result-video" controls autoplay muted loop playsinline>
                        <source src="${downloadUrl}" type="video/mp4">
                    </video>` :
                    thumbnail && thumbnail.startsWith('http') ?
                    `<img src="${thumbnail}" alt="${typeLabel}" class="result-video" style="object-fit:cover;">` :
                    `<div class="result-video-placeholder">${getMediaIcon(mediaType)}</div>`
                }
                ${duration ? `<span style="position:absolute;bottom:10px;right:10px;background:rgba(0,0,0,0.6);color:#fff;padding:2px 8px;border-radius:6px;font-size:0.75rem;">${duration}s</span>` : ''}
            </div>
            <div class="result-content">
                <div>
                    <h3 class="result-title" data-full-title="${escapeHtml(title)}" title="Click to copy title">${shortTitle}</h3>
                    <div class="result-creator"><span class="creator-dot"></span> ${username}</div>
                    <div class="result-meta">
                        <span>${getMediaIcon(mediaType)} ${typeLabel}</span>
                        <span>✨ ${quality}</span>
                        ${duration ? `<span>⏱ ${duration}s</span>` : ''}
                    </div>
                </div>
                <div class="result-actions">
                    <button class="btn-dl-row" data-url="${downloadUrl}" data-filename="${sanitizeFilename(title)}_${username}.${getExtension(downloadUrl, mediaType)}">
                        ${icons.download} Download ${typeLabel}
                    </button>
                    <button class="btn-new-link">
                        ${icons.newLink} New Link
                    </button>
                </div>
            </div>
        `;

        setTimeout(() => attachRowEvents(card, downloadUrl, title, username, mediaType), 0);
        return card;
    }

    function getTypeLabel(type) {
        const labels = {'video':'Video','reel':'Reel','story':'Story','photo':'Photo','profile_picture':'Profile Pic','audio':'Audio'};
        return labels[type] || 'Media';
    }
    function getExtension(url, type) {
        if (type === 'audio') return 'mp3';
        if (type === 'photo' || type === 'profile_picture') return 'jpg';
        if (url.includes('.jpg')||url.includes('.jpeg')) return 'jpg';
        if (url.includes('.png')) return 'png';
        return 'mp4';
    }

    function attachRowEvents(card, downloadUrl, fullTitle, username, mediaType) {
        const dlBtn = card.querySelector('.btn-dl-row');
        if (dlBtn && downloadUrl) {
            dlBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                dlBtn.disabled = true;
                dlBtn.innerHTML = '<span class="btn-spinner"></span> Preparing...';
                const filename = `${sanitizeFilename(fullTitle)}_${username}.${getExtension(downloadUrl, mediaType)}`;
                try {
                    const downloaded = await downloadFileDirect(downloadUrl, filename);
                    if (downloaded) {
                        dlBtn.innerHTML = '✓ Downloaded';
                        showToast('Download complete!', 'success');
                    } else {
                        await downloadFileIframe(downloadUrl, filename);
                        dlBtn.innerHTML = '✓ Downloaded';
                        showToast('Download complete!', 'success');
                    }
                } catch (err) {
                    downloadFileAnchor(downloadUrl, filename);
                    dlBtn.innerHTML = '✓ Downloaded';
                    showToast('Download started!', 'success');
                } finally {
                    setTimeout(() => {
                        dlBtn.disabled = false;
                        dlBtn.innerHTML = `${icons.download} Download ${getTypeLabel(mediaType)}`;
                    }, 2000);
                }
            });
        }
        const newBtn = card.querySelector('.btn-new-link');
        if (newBtn) {
            newBtn.addEventListener('click', () => {
                document.body.classList.remove('results-active');
                document.getElementById('results').style.display = 'none';
                document.getElementById('urlInput').value = '';
                document.getElementById('errorMsg').textContent = '';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
        const titleEl = card.querySelector('.result-title');
        if (titleEl) {
            titleEl.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(fullTitle);
                    showToast('Title copied!', 'success');
                } catch { showToast('Copy failed', 'error'); }
            });
        }
    }

    // Download methods (same as before)
    async function downloadFileDirect(url, filename) {
        try {
            const response = await fetch(url, { mode: 'cors' });
            if (!response.ok) throw new Error('Network error');
            const blob = await response.blob();
            if (blob.size === 0) throw new Error('Empty file');
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(blobUrl);
            }, 1000);
            return true;
        } catch (error) {
            console.warn('Direct download failed:', error.message);
            return false;
        }
    }

    async function downloadFileIframe(url, filename) {
        return new Promise((resolve) => {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
            const iframeLink = document.createElement('a');
            iframeLink.href = url;
            iframeLink.download = filename;
            iframeLink.target = '_self';
            iframe.contentDocument.body.appendChild(iframeLink);
            iframeLink.click();
            setTimeout(() => {
                if (document.body.contains(iframe)) document.body.removeChild(iframe);
                resolve(true);
            }, 1500);
        });
    }

    function downloadFileAnchor(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.target = '_self';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => document.body.removeChild(a), 1000);
    }

    function sanitizeFilename(name) {
        return name.replace(/[^a-z0-9\s]/gi,'').replace(/\s+/g,'_').substring(0,50);
    }
    function escapeHtml(text) {
        const d=document.createElement('div'); d.textContent=text; return d.innerHTML;
    }

    // FAQ toggle
    document.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', function() {
            const item = this.closest('.faq-item');
            if (item) {
                item.classList.toggle('open');
                this.setAttribute('aria-expanded', item.classList.contains('open'));
            }
        });
    });
});

const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
    .btn-spinner { width:14px; height:14px; border:2px solid rgba(255,255,255,0.3); border-top-color:white; border-radius:50%; animation: spin 0.6s linear infinite; display:inline-block; }
    @keyframes spin { to { transform:rotate(360deg); } }
`;
document.head.appendChild(style);

// Copy the showToast / hideToast from ui.js if needed, but it's already there.
