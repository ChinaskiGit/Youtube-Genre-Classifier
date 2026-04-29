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
        column.draggable = true;
        column.innerHTML = `
            <div class="column-header">
                <div class="header-top">
                    <input type="text" class="playlist-title-input" data-genre="${genre}" value="${genre}" />
                    <button type="button" class="collapse-btn" data-genre="${genre}" aria-expanded="true">Collapse</button>
                </div>
                <span class="column-count">${videos.length} video${videos.length !== 1 ? 's' : ''}</span>
            </div>
            <div class="video-list" data-genre="${genre}"></div>
        `;
        board.appendChild(column);
    }

    for (const [genre, videos] of Object.entries(reviewData)) {
        videos.forEach(video => {
            video.genre = genre;
            addVideoCard(video);
        });
    }

    document.querySelectorAll('.video-card').forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', event => {
            event.target.classList.remove('dragging');
            document.querySelectorAll('.video-list').forEach(list => {
                list.classList.remove('drag-over');
            });
        });
    });
    document.querySelectorAll('.video-list').forEach(list => {
        list.addEventListener('dragover', handleDragOver);
        list.addEventListener('dragleave', handleDragLeave);
        list.addEventListener('drop', handleDrop);
    });
    document.querySelectorAll('.collapse-btn').forEach(button => {
        button.addEventListener('click', toggleColumnCollapse);
    });
    document.querySelectorAll('.genre-column').forEach(column => {
        column.addEventListener('dragstart', handleColumnDragStart);
        column.addEventListener('dragend', handleColumnDragEnd);
        column.addEventListener('dragover', handleColumnDragOver);
        column.addEventListener('drop', handleColumnDrop);
    });
}

function handleColumnDragStart(event) {
    if (event.target.closest('.playlist-title-input') || event.target.closest('.collapse-btn')) {
        event.preventDefault();
        return;
    }
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/genre-column', event.currentTarget.dataset.genre);
    event.currentTarget.classList.add('dragging-column');
}

function handleColumnDragEnd(event) {
    event.currentTarget.classList.remove('dragging-column');
}

function handleColumnDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
}

function handleColumnDrop(event) {
    event.preventDefault();
    const draggedGenre = event.dataTransfer.getData('text/genre-column');
    const targetGenre = event.currentTarget.dataset.genre;
    if (!draggedGenre || draggedGenre === targetGenre) return;

    const board = document.getElementById('review-board');
    const draggedColumn = document.querySelector(`.genre-column[data-genre="${draggedGenre}"]`);
    const targetColumn = event.currentTarget;

    if (draggedColumn && targetColumn) {
        board.insertBefore(draggedColumn, targetColumn);
    }
}

function toggleColumnCollapse(event) {
    const button = event.target;
    const genre = button.dataset.genre;
    const column = document.querySelector(`.genre-column[data-genre="${genre}"]`);
    if (!column) return;

    const collapsed = column.classList.toggle('collapsed');
    button.textContent = collapsed ? 'Expand' : 'Collapse';
    button.setAttribute('aria-expanded', (!collapsed).toString());

    const board = document.getElementById('review-board');
    if (collapsed) {
        board.appendChild(column);
    }

    const videoList = column.querySelector('.video-list');
    if (videoList) {
        videoList.removeEventListener('dragover', handleDragOver);
        videoList.removeEventListener('dragleave', handleDragLeave);
        videoList.removeEventListener('drop', handleDrop);
        videoList.addEventListener('dragover', handleDragOver);
        videoList.addEventListener('dragleave', handleDragLeave);
        videoList.addEventListener('drop', handleDrop);
    }
}

function addVideoCard(video) {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.draggable = true;
    card.dataset.videoId = video.videoId;
    card.dataset.genre = video.genre;
    const thumbnailHtml = video.thumbnail ? `<img src="${video.thumbnail}" alt="thumbnail" class="video-thumb">` : '';
    card.innerHTML = `
        ${thumbnailHtml}
        <div class="video-info">
            <div class="video-title">${video.title}</div>
            <div class="video-meta">${video.channelTitle}</div>
        </div>
    `;
    const list = document.querySelector(`.video-list[data-genre="${video.genre}"]`);
    if (list) list.appendChild(card);
}

function handleDragStart(event) {
    const card = event.target.closest('.video-card');
    if (!card) return;
    event.dataTransfer.setData('text/plain', card.dataset.videoId);
    event.dataTransfer.setData('text/genre', card.dataset.genre);
    card.classList.add('dragging');
    document.querySelectorAll('.video-list').forEach(list => {
        list.classList.remove('drag-over');
    });
}

function handleDragOver(event) {
    event.preventDefault();
    const list = event.currentTarget;
    if (list.classList.contains('video-list')) {
        list.classList.add('drag-over');
    }
}

function handleDragLeave(event) {
    if (event.currentTarget !== event.target) return;
    event.currentTarget.classList.remove('drag-over');
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.video-card:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset, element: child };
        }
        return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function handleDrop(event) {
    event.preventDefault();
    const list = event.currentTarget;

    document.querySelectorAll('.video-list').forEach(l => {
        l.classList.remove('drag-over');
    });
    document.querySelectorAll('.video-card').forEach(card => {
        card.classList.remove('dragging');
    });

    const videoId = event.dataTransfer.getData('text/plain');
    const fromGenre = event.dataTransfer.getData('text/genre');
    const toGenre = list.dataset.genre;
    if (!videoId || !toGenre) return;

    const card = document.querySelector(`.video-card[data-video-id="${videoId}"]`);
    if (!card) return;

    const afterElement = getDragAfterElement(list, event.clientY);
    if (afterElement) {
        list.insertBefore(card, afterElement);
    } else {
        list.appendChild(card);
    }

    card.dataset.genre = toGenre;
    updateReviewData(videoId, fromGenre, toGenre, afterElement?.dataset.videoId || null);
    updateColumnCount(fromGenre);
    if (fromGenre !== toGenre) updateColumnCount(toGenre);
}

function updateReviewData(videoId, fromGenre, toGenre, afterVideoId = null) {
    const fromArray = reviewData[fromGenre] || [];
    const index = fromArray.findIndex(video => video.videoId === videoId);
    if (index === -1) return;

    const [video] = fromArray.splice(index, 1);
    video.genre = toGenre;
    reviewData[toGenre] = reviewData[toGenre] || [];

    if (toGenre === fromGenre) {
        const targetIndex = reviewData[toGenre].findIndex(item => item.videoId === afterVideoId);
        if (targetIndex === -1 || afterVideoId === null) {
            reviewData[toGenre].push(video);
        } else {
            reviewData[toGenre].splice(targetIndex, 0, video);
        }
    } else {
        const toArray = reviewData[toGenre];
        const insertIndex = afterVideoId ? toArray.findIndex(item => item.videoId === afterVideoId) : -1;
        if (insertIndex === -1) {
            toArray.push(video);
        } else {
            toArray.splice(insertIndex, 0, video);
        }
    }
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
