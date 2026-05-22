window.addEventListener('load', () => {
    const urlInput = document.getElementById('urlInput');
    const downloadBtn = document.getElementById('downloadBtn');
    const errorMsg = document.getElementById('errorMsg');
    const loader = document.getElementById('loader');
    const results = document.getElementById('results');
    const resultsGrid = document.getElementById('resultsGrid');

    if (!downloadBtn || !urlInput) {
        console.error('Required elements not found');
        return;
    }

    downloadBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        errorMsg.textContent = '';
        results.style.display = 'none';
        
        if (!url) {
            errorMsg.textContent = '❌ Please paste an Instagram URL.';
            return;
        }
        if (!url.includes('instagram.com') && !url.includes('instagr.am')) {
            errorMsg.textContent = '❌ Please enter a valid Instagram link.';
            return;
        }

        loader.style.display = 'flex';
        downloadBtn.disabled = true;
        downloadBtn.style.opacity = '0.7';

        try {
            const data = await fetchInstagramMedia(url);
            console.log('API Response:', data);
            renderResults(data, resultsGrid);
            results.style.display = 'block';
            showToast('✅ Download ready! Click the download button.', 'success');
            results.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (err) {
            errorMsg.textContent = `❌ ${err.message || 'Download failed. Please try again.'}`;
            showToast('❌ Failed to fetch media. Check the URL.', 'error');
        } finally {
            loader.style.display = 'none';
            downloadBtn.disabled = false;
            downloadBtn.style.opacity = '1';
        }
    });

    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') downloadBtn.click();
    });
});

function renderResults(data, grid) {
    grid.innerHTML = '';
    
    let mediaItems = [];

    if (data && data.items) {
        mediaItems = data.items;
    } else if (data && data.media) {
        mediaItems = data.media;
    } else if (data && data.data) {
        mediaItems = Array.isArray(data.data) ? data.data : [data.data];
    } else if (Array.isArray(data)) {
        mediaItems = data;
    } else if (data && (data.video_url || data.download_url || data.url)) {
        mediaItems = [data];
    }

    console.log('Processed media items:', mediaItems);

    if (mediaItems.length === 0) {
        grid.innerHTML = `
            <div style="text-align:center;padding:2rem;">
                <p style="color:#f87171;">No downloadable media found for this URL.</p>
                <p style="color:#a0a0c0;font-size:0.9rem;">Make sure the link is from a public Instagram account.</p>
            </div>`;
        return;
    }

    mediaItems.forEach((item, index) => {
        const card = createMediaCard(item, index);
        grid.appendChild(card);
    });
}

function createMediaCard(item, index) {
    const card = document.createElement('div');
    card.className = 'media-card glass';
    card.style.animation = `fadeInUp 0.4s ${index * 0.15}s both`;

    // Extract data with fallbacks
    const mediaType = item.type || item.media_type || 'video';
    const videoUrl = item.video_url || item.download_url || item.url || '';
    const thumbnailUrl = item.thumbnail || item.thumb || item.preview || item.thumbnail_url || '';
    const title = item.title || item.caption || item.description || 'Instagram Media';
    const username = item.username || item.owner || item.author || item.uploader || '@instagram';
    const duration = item.duration || '';
    const quality = item.quality || item.resolution || 'HD';
    const views = item.views || item.plays || '';
    const likes = item.likes || item.like_count || '';

    // Video preview section
    const hasVideo = videoUrl && (mediaType === 'video' || mediaType === 'reel' || mediaType === 'clip');
    
    card.innerHTML = `
        <div class="media-preview-wrapper">
            ${thumbnailUrl ? 
                `<img src="${thumbnailUrl}" alt="${title}" class="media-thumbnail" 
                     onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22320%22 height=%22180%22><rect fill=%22%231a1a2e%22 width=%22320%22 height=%22180%22/><text fill=%22%23a0a0c0%22 x=%22160%22 y=%2295%22 text-anchor=%22middle%22 font-size=%2214%22>📸 Preview</text></svg>'" 
                     loading="lazy">` 
                : `<div class="media-placeholder"><span>📸</span></div>`
            }
            ${hasVideo ? 
                `<div class="video-preview-overlay">
                    <button class="play-preview-btn" data-video-url="${videoUrl}">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                            <polygon points="5,3 19,12 5,21"></polygon>
                        </svg>
                    </button>
                </div>` : ''
            }
            ${duration ? `<span class="duration-badge">⏱ ${duration}s</span>` : ''}
        </div>
        
        <div class="media-info">
            <div class="media-header">
                <span class="media-type-badge">${mediaType.toUpperCase()}</span>
                ${quality ? `<span class="quality-badge">${quality}</span>` : ''}
            </div>
            
            <h3 class="media-title" title="${title}">${title.length > 50 ? title.substring(0, 50) + '...' : title}</h3>
            
            <div class="creator-info">
                <div class="creator-avatar">${username.charAt(0).toUpperCase()}</div>
                <span class="creator-username">${username}</span>
            </div>
            
            ${(views || likes) ? `
                <div class="media-stats">
                    ${views ? `<span>👁 ${formatNumber(views)} views</span>` : ''}
                    ${likes ? `<span>❤️ ${formatNumber(likes)} likes</span>` : ''}
                </div>` : ''
            }
            
            <div class="download-actions">
                <button class="btn-download-media" data-url="${videoUrl}" data-filename="${sanitizeFilename(title)}_${username}.mp4">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download ${mediaType}
                </button>
                <span class="download-size">Preparing...</span>
            </div>
        </div>
    `;

    // Attach event listeners after card is in DOM
    setTimeout(() => {
        attachDownloadListeners(card, videoUrl, `${sanitizeFilename(title)}_${username}`);
        attachPreviewListener(card, videoUrl);
    }, 0);

    return card;
}

function attachDownloadListeners(card, videoUrl, filename) {
    const downloadBtn = card.querySelector('.btn-download-media');
    const sizeSpan = card.querySelector('.download-size');
    
    if (!downloadBtn || !videoUrl) return;

    downloadBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Update button state
        downloadBtn.disabled = true;
        downloadBtn.innerHTML = `
            <div class="btn-spinner"></div>
            Downloading...
        `;
        sizeSpan.textContent = 'Starting download...';

        try {
            await downloadFile(videoUrl, filename, sizeSpan, downloadBtn);
        } catch (error) {
            console.error('Download error:', error);
            sizeSpan.textContent = '❌ Download failed';
            downloadBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Retry Download
            `;
            downloadBtn.disabled = false;
            
            // Fallback: open in new tab
            setTimeout(() => {
                if (confirm('Direct download failed. Open in new tab?')) {
                    window.open(videoUrl, '_blank');
                }
            }, 1000);
        }
    });
}

function attachPreviewListener(card, videoUrl) {
    const playBtn = card.querySelector('.play-preview-btn');
    const thumbnail = card.querySelector('.media-thumbnail');
    
    if (!playBtn || !videoUrl || !thumbnail) return;

    playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Create video element
        const video = document.createElement('video');
        video.src = videoUrl;
        video.controls = true;
        video.autoplay = true;
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.objectFit = 'cover';
        video.style.borderRadius = '12px';
        video.style.position = 'absolute';
        video.style.top = '0';
        video.style.left = '0';
        
        // Replace thumbnail with video
        const wrapper = card.querySelector('.media-preview-wrapper');
        thumbnail.style.display = 'none';
        playBtn.style.display = 'none';
        wrapper.appendChild(video);
        
        // Show controls on hover
        video.addEventListener('mouseenter', () => video.controls = true);
        video.addEventListener('mouseleave', () => video.controls = false);
    });
}

async function downloadFile(url, filename, sizeSpan, button) {
    try {
        // Try direct download
        const response = await fetch(url, { mode: 'cors' });
        
        if (!response.ok) throw new Error('Network error');
        
        const contentLength = response.headers.get('content-length');
        const contentType = response.headers.get('content-type');
        
        if (contentLength) {
            const sizeMB = (parseInt(contentLength) / (1024 * 1024)).toFixed(2);
            sizeSpan.textContent = `${sizeMB} MB`;
        }
        
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        // Create download link
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${filename}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Cleanup
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
        
        // Reset button
        button.disabled = false;
        button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Downloaded ✓
        `;
        sizeSpan.textContent = '✅ Download complete';
        
        showToast('✅ Download completed successfully!', 'success');
        
    } catch (error) {
        // If direct download fails, open in same tab with download attribute
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.mp4`;
        a.click();
        
        button.disabled = false;
        button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Downloaded ✓
        `;
        sizeSpan.textContent = 'Download complete';
    }
}

// Helper functions
function sanitizeFilename(name) {
    return name.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
}

function formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

// FAQ Toggle
window.addEventListener('load', () => {
    setTimeout(() => {
        document.querySelectorAll('.faq-question').forEach(btn => {
            btn.addEventListener('click', function() {
                const item = this.closest('.faq-item');
                if (item) {
                    item.classList.toggle('open');
                    this.setAttribute('aria-expanded', item.classList.contains('open'));
                }
            });
        });
    }, 500);
});

// Add styles
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    .btn-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255,255,255,0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
        display: inline-block;
    }
`;
document.head.appendChild(style);
