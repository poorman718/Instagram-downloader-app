async function triggerDownload(url) {
    if (isFetching) return;
    
    if (!url.includes('instagram.com') && !url.includes('instagr.am')) {
        errorMsg.textContent = '❌ Please enter a valid Instagram link.';
        return;
    }

    isFetching = true;
    errorMsg.textContent = '';
    results.style.display = 'none';
    loader.style.display = 'flex';
    pasteBtn.disabled = true;
    pasteBtn.style.opacity = '0.7';

    try {
        console.log('🚀 Starting download for URL:', url);
        const data = await fetchInstagramMedia(url);
        console.log('📦 Received data:', data);
        
        if (!data || data.length === 0) {
            throw new Error('No media found. The post may be private or deleted.');
        }
        
        renderResults(data);
        results.style.display = 'block';
        showToast('✅ Media ready! Click Download button.', 'success');
        results.scrollIntoView({ behavior: 'smooth', block: 'center' });
        document.body.classList.add('results-active');
        
    } catch (err) {
        console.error('❌ Download failed:', err);
        errorMsg.textContent = `❌ ${err.message || 'Download failed. Please try a different URL.'}`;
        showToast('❌ ' + (err.message || 'Failed to fetch media'), 'error');
    } finally {
        loader.style.display = 'none';
        pasteBtn.disabled = false;
        pasteBtn.style.opacity = '1';
        isFetching = false;
    }
}
