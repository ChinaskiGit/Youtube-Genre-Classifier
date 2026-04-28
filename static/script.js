let reviewData = {};

// Utility functions
function showStatus(elementId, message, type) {
    const status = document.getElementById(elementId);
    status.textContent = message;
    status.className = `status show ${type}`;
    setTimeout(() => {
        status.classList.remove('show');
    }, 5000);
}

function showStep(stepId) {
    document.querySelectorAll('.step').forEach(step => {
        step.classList.add('hidden');
    });
    document.getElementById(stepId).classList.remove('hidden');
}

function setButtonLoading(buttonId, isLoading) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;
    btn.disabled = isLoading;
    if (isLoading) {
        btn.setAttribute('data-original-text', btn.textContent);
        btn.innerHTML = '<span class="spinner"></span>Loading...';
    } else {
        btn.innerHTML = btn.getAttribute('data-original-text') || btn.textContent;
    }
}

// Step 1: Authenticate
async function authenticate() {
    setButtonLoading('auth-btn', true);
    
    try {
        const response = await fetch('/api/authenticate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('user-name').textContent = data.user.name;
            document.getElementById('user-avatar').src = data.user.picture;
            showStep('step-playlist');
            showStatus('auth-status', '✓ Authentication successful!', 'success');
        } else {
            showStatus('auth-status', `Error: ${data.error}`, 'error');
        }
    } catch (error) {
        showStatus('auth-status', `Error: ${error.message}`, 'error');
    } finally {
        setButtonLoading('auth-btn', false);
    }
}

// Step 2: Fetch Playlist
async function fetchPlaylist() {
    const urlInput = document.getElementById('playlist-url');
    const playlistUrl = urlInput.value.trim();
    if (!playlistUrl) {
        showStatus('fetch-status', 'Please paste a playlist URL', 'error');
        return;
    }

    setButtonLoading('fetch-btn', true);
    
    try {
        const response = await fetch('/api/fetch-playlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playlist_url: playlistUrl })
        });
        const data = await response.json();
        
        if (data.success) {
            reviewData = data.classified || {};
            renderGenreSummary(data.genres);
            document.getElementById('total-videos').textContent = data.total_videos;
            showStep('step-results');
            showStatus('fetch-status', '✓ Playlist analyzed successfully!', 'success');
        } else {
            showStatus('fetch-status', `Error: ${data.error}`, 'error');
        }
    } catch (error) {
        showStatus('fetch-status', `Error: ${error.message}`, 'error');
    } finally {
        setButtonLoading('fetch-btn', false);
    }
}

function renderGenreSummary(genres) {
    const genreGrid = document.getElementById('genre-grid');
    genreGrid.innerHTML = '';
    const genreIcons = {
        'Soul': '🎤',
        'Reggae': '🌴',
        'Ska': '⚡',
        'Hip-Hop': '🎧',
        'Rock': '🎸',
        'Pop': '⭐',
        'Jazz': '🎺',
        'Blues': '💙',
        'Funk': '🎵',
        'Unknown': '❓'
    };

    for (const [genre, count] of Object.entries(genres)) {
        const card = document.createElement('div');
        card.className = 'genre-card';
        card.innerHTML = `
            <div class="genre-icon">${genreIcons[genre] || '🎵'}</div>
            <div class="genre-name">${genre}</div>
            <div class="genre-count">${count} song${count !== 1 ? 's' : ''}</div>
        `;
        genreGrid.appendChild(card);
    }
}

function showReview() {
    renderReviewBoard();
    showStep('step-review');
}

function renderReviewBoard() {
    const board = document.getElementById('review-board');
    board.innerHTML = '';

    for (const [genre, videos] of Object.entries(reviewData)) {
        const column = document.createElement('div');
        column.className = 'genre-column';
        column.dataset.genre = genre;
        column.innerHTML = `
            <div class="column-header">
                <input type="text" class="playlist-title-input" data-genre="${genre}" value="${genre}" />
                <span class="column-count">${videos.length} video${videos.length !== 1 ? 's' : ''}</span>
            </div>
            <div class="video-list" data-genre="${genre}"></div>
        `;
        board.appendChild(column);
    }

    Object.values(reviewData).forEach(videos => {
        videos.forEach(video => addVideoCard(video));
    });

    document.querySelectorAll('.video-card').forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
    });
    document.querySelectorAll('.video-list').forEach(list => {
        list.addEventListener('dragover', handleDragOver);
        list.addEventListener('drop', handleDrop);
    });
}

function addVideoCard(video) {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.draggable = true;
    card.dataset.videoId = video.videoId;
    card.dataset.genre = video.genre;
    card.innerHTML = `
        <div class="video-title">${video.title}</div>
        <div class="video-meta">${video.channelTitle}</div>
    `;
    const list = document.querySelector(`.video-list[data-genre="${video.genre}"]`);
    if (list) list.appendChild(card);
}

function handleDragStart(event) {
    event.dataTransfer.setData('text/plain', event.target.dataset.videoId);
    event.dataTransfer.setData('text/genre', event.target.closest('.video-list').dataset.genre);
    event.target.classList.add('dragging');
}

function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('drag-over');
}

function handleDrop(event) {
    event.preventDefault();
    const list = event.currentTarget;
    list.classList.remove('drag-over');
    const videoId = event.dataTransfer.getData('text/plain');
    const fromGenre = event.dataTransfer.getData('text/genre');
    const toGenre = list.dataset.genre;
    if (!videoId || !toGenre || fromGenre === toGenre) return;

    const card = document.querySelector(`.video-card[data-video-id="${videoId}"]`);
    if (!card) return;

    list.appendChild(card);
    card.dataset.genre = toGenre;
    updateReviewData(videoId, fromGenre, toGenre);
    updateColumnCount(fromGenre);
    updateColumnCount(toGenre);
}

function updateReviewData(videoId, fromGenre, toGenre) {
    const fromArray = reviewData[fromGenre] || [];
    const index = fromArray.findIndex(video => video.videoId === videoId);
    if (index === -1) return;
    const [video] = fromArray.splice(index, 1);
    video.genre = toGenre;
    reviewData[toGenre] = reviewData[toGenre] || [];
    reviewData[toGenre].push(video);
}

function updateColumnCount(genre) {
    const count = reviewData[genre]?.length || 0;
    const input = document.querySelector(`.playlist-title-input[data-genre="${genre}"]`);
    if (input) {
        input.closest('.column-header').querySelector('.column-count').textContent = `${count} video${count !== 1 ? 's' : ''}`;
    }
}

async function confirmPlaylists() {
    setButtonLoading('confirm-btn', true);
    showStatus('confirm-status', 'Creating playlists based on your review...', 'loading');

    const playlistMap = {};
    document.querySelectorAll('.playlist-title-input').forEach(input => {
        const genre = input.dataset.genre;
        const title = input.value.trim() || genre;
        const videoIds = Array.from(document.querySelectorAll(`.video-list[data-genre="${genre}"] .video-card`)).map(card => card.dataset.videoId);
        playlistMap[genre] = { title, video_ids: videoIds };
    });

    try {
        const response = await fetch('/api/create-playlists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playlist_map: playlistMap })
        });
        const data = await response.json();

        if (data.success) {
            const playlistsList = document.getElementById('playlists-list');
            playlistsList.innerHTML = '';
            for (const info of Object.values(data.playlists)) {
                const item = document.createElement('div');
                item.className = 'playlist-item';
                item.innerHTML = `
                    <div class="playlist-info">
                        <h3>${info.title}</h3>
                        <p>${info.video_count} song${info.video_count !== 1 ? 's' : ''}</p>
                    </div>
                    <a href="${info.url}" target="_blank" class="playlist-link">Open →</a>
                `;
                playlistsList.appendChild(item);
            }
            showStep('step-success');
            showStatus('confirm-status', '✓ Playlists created successfully!', 'success');
        } else {
            showStatus('confirm-status', `Error: ${data.error}`, 'error');
        }
    } catch (error) {
        showStatus('confirm-status', `Error: ${error.message}`, 'error');
    } finally {
        setButtonLoading('confirm-btn', false);
    }
}

async function exportJSON() {
    try {
        const response = await fetch('/api/export-json');
        const data = await response.json();
        
        if (data.success) {
            const jsonString = JSON.stringify(data.data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'playlist_classification.json';
            a.click();
            URL.revokeObjectURL(url);
            showStatus('confirm-status', '✓ JSON exported successfully!', 'success');
        } else {
            showStatus('confirm-status', `Error: ${data.error}`, 'error');
        }
    } catch (error) {
        showStatus('confirm-status', `Error: ${error.message}`, 'error');
    }
}
