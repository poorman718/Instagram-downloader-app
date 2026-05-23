async function fetchInstagramMedia(url) {
    const apiUrl = `${CONFIG.API_BASE_URL}?url=${encodeURIComponent(url)}`;
    
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
    try {
        data = JSON.parse(text);
    } catch (e) {
        console.error('Invalid JSON response:', text);
        throw new Error('Invalid response from server');
    }

    if (!response.ok) {
        throw new Error(data.message || `HTTP Error ${response.status}`);
    }

    console.log('API Response:', data);
    return data;
}
