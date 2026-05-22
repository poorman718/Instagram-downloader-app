// Wait for everything to load including components
window.addEventListener('load', () => {
    const urlInput = document.getElementById('urlInput');
    const downloadBtn = document.getElementById('downloadBtn');
    const errorMsg = document.getElementById('errorMsg');
    const loader = document.getElementById('loader');
    const results = document.getElementById('results');
    const resultsGrid = document.getElementById('resultsGrid');

    // Check if elements exist (safety check)
    if (!downloadBtn || !urlInput) {
        console.error('Required elements not found');
        return;
    }

    downloadBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        
        // Clear previous state
        errorMsg.textContent = '';
        results.style.display = 'none';
        
        // Validate URL
        if (!url) {
            errorMsg.textContent = 'Please paste an Instagram URL.';
            return;
        }
        if (!url.includes('instagram.com') && !url.includes('instagr.am')) {
            errorMsg.textContent = 'Please enter a valid Instagram link.';
            return;
        }

        // Show loader
        loader.style.display = 'flex';
        downloadBtn.disabled = true;
        downloadBtn.style.opacity = '0.7';

        try {
            const data = await fetchInstagramMedia(url);
            renderResultsToGrid(data, resultsGrid);
            results.style.display = 'block';
            showToast('✅ Download ready! Click the download button.', 'success');
        } catch (err) {
            errorMsg.textContent = err.message || 'Download failed. Please check the link.';
            showToast('❌ ' + (err.message || 'Something went wrong'), 'error');
        } finally {
            loader.style.display = 'none';
            downloadBtn.disabled = false;
            downloadBtn.style.opacity = '1';
        }
    });

    // Enter key support
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            downloadBtn.click();
        }
    });
});

// Separate render function
function renderResultsToGrid(data, grid) {
    grid.innerHTML = '';
    
    // Handle different API response structures
    let items = [];
    if (Array.isArray(data)) {
        items = data;
    } else if (data.media) {
        items = data.media;
    } else if (data.data) {
        items = data.data;
    } else if (data.url || data.download_url) {
        items = [data];
    }

    if (items.length === 0) {
        grid.innerHTML = '<p style="color:#f87171;text-align:center;">No downloadable media found.</p>';
        return;
    }

    items.forEach((item, index) => {
        const type = item.type || item.media_type || 'Video';
        const downloadUrl = item.url || item.download_url || item.src || item.video_url;
        const thumbnail = item.thumbnail || item.preview || item.thumb || downloadUrl;
        const quality = item.quality || item.resolution || 'HD';

        const card = document.createElement('div');
        card.className = 'media-card glass';
        card.style.animation = `fadeInUp 0.4s ${index * 0.1}s both`;
        
        card.innerHTML = `
            ${thumbnail ? `<img src="${thumbnail}" alt="Preview" class="media-preview" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22><rect fill=%22%231a1a2e%22 width=%22100%22 height=%22100%22/><text fill=%22%23a0a0c0%22 x=%2250%22 y=%2255%22 text-anchor=%22middle%22>No Preview</text></svg>'" loading="lazy">` : ''}
            <span class="media-type">${type.toUpperCase()}</span>
            ${quality ? `<span style="font-size:0.75rem;color:#a0a0c0;margin-left:0.5rem;">${quality}</span>` : ''}
            <br>
            <a href="${downloadUrl}" class="download-link" download target="_blank" rel="noopener noreferrer">
                ⬇ Download ${type}
            </a>
        `;
        grid.appendChild(card);
    });
}

// FAQ Toggle - Initialize after load
window.addEventListener('load', () => {
    setTimeout(() => {
        document.querySelectorAll('.faq-question').forEach(btn => {
            btn.addEventListener('click', function() {
                const item = this.closest('.faq-item');
                if (item) {
                    item.classList.toggle('open');
                    const isOpen = item.classList.contains('open');
                    this.setAttribute('aria-expanded', isOpen);
                }
            });
        });
    }, 500);
});

// Add fadeInUp animation if not in style.css
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;
document.head.appendChild(style);
