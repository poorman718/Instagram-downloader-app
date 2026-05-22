async function fetchInstagramMedia(url) {
    const options = {
        method: 'GET',
        headers: {
            'X-RapidAPI-Key': CONFIG.API_KEY,
            'X-RapidAPI-Host': CONFIG.API_HOST
        }
    };
    const apiUrl = `${CONFIG.API_BASE_URL}?url=${encodeURIComponent(url)}`;

    const response = await fetch(apiUrl, options);
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || `Request failed with status ${response.status}`);
    }
    return response.json();
}
