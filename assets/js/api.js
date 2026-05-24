async function fetchInstagramMedia(url) {
    const apiUrl = `${CONFIG.API_BASE_URL}?postUrl=${encodeURIComponent(url)}`;
    const options = {
        method: 'GET',
        headers: {
            'x-rapidapi-key': CONFIG.API_KEY,
            'x-rapidapi-host': CONFIG.API_HOST,
            'Content-Type': 'application/json'
        }
    };

    const response = await fetch(apiUrl, options);
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch (e) { throw new Error('Invalid server response'); }
    if (!response.ok) throw new Error(data.message || 'API Error');
    
    return normalizeResponse(data);
}

function normalizeResponse(data) {
    let items = [];
    const post = data.post || data.data || data;
    
    if (!post) return items;
    
    const caption = post.caption || post.text || '';
    const username = post.owner?.username || post.username || '@instagram';
    const likes = post.like_count || post.likes || '';
    const views = post.view_count || post.play_count || '';
    
    // Carousel media
    if (post.carousel_media && Array.isArray(post.carousel_media)) {
        post.carousel_media.forEach(media => {
            const item = extractItem(media, caption, username, likes, views);
            if (item) items.push(item);
        });
    }
    
    // Single media
    if (items.length === 0) {
        const item = extractItem(post, caption, username, likes, views);
        if (item) items.push(item);
    }
    
    return items;
}

function extractItem(media, caption, username, likes, views) {
    let type = 'photo';
    let url = '';
    
    if (media.video_url || media.video_versions) {
        type = 'video';
        url = media.video_url || media.video_versions?.[0]?.url || '';
    } else if (media.display_url) {
        url = media.display_url;
    } else if (media.image_versions2?.candidates?.[0]?.url) {
        url = media.image_versions2.candidates[0].url;
    } else if (media.url || media.src) {
        url = media.url || media.src;
    }
    
    if (!url) return null;
    
    return {
        type,
        url,
        thumbnail: media.thumbnail_url || media.display_url || url,
        title: caption || 'Instagram Media',
        username,
        duration: media.video_duration || '',
        likes,
        views,
        quality: 'HD'
    };
}
