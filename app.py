import os
import re
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from youtube_handler import YouTubePlaylistHandler
from genre_classifier import GenreClassifier

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Global variables for session
youtube_handler = None
classifier = GenreClassifier()
playlist_data = None
user_info = None


def extract_playlist_id(url):
    """Extract playlist ID from YouTube URL or return direct playlist ID."""
    if not url:
        return None

    # Standard playlist URL: https://www.youtube.com/playlist?list=PL...
    match = re.search(r'[?&]list=([^&]+)', url)
    if match:
        return match.group(1)

    # If the user pasted a raw playlist ID directly, accept it too.
    direct_id = url.strip()
    if re.match(r'^[A-Za-z0-9_-]+$', direct_id):
        return direct_id

    return None


@app.route('/')
def index():
    """Serve the main page"""
    return render_template('index.html')


@app.route('/api/authenticate', methods=['POST'])
def authenticate():
    """Authenticate with YouTube and fetch user info"""
    global youtube_handler, user_info
    
    try:
        credentials_path = os.getenv('YOUTUBE_CREDENTIALS_PATH', 'credentials.json')
        
        if not os.path.exists(credentials_path):
            return jsonify({'success': False, 'error': f'{credentials_path} not found'}), 400
        
        youtube_handler = YouTubePlaylistHandler(credentials_path)
        user_info = youtube_handler.get_user_info()
        
        return jsonify({
            'success': True,
            'user': user_info
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/fetch-playlist', methods=['POST'])
def fetch_playlist():
    """Fetch and classify videos from playlist"""
    global playlist_data
    
    try:
        if not youtube_handler:
            return jsonify({'success': False, 'error': 'Not authenticated'}), 401
        
        data = request.json
        playlist_url = data.get('playlist_url', '')
        
        # Extract playlist ID from URL
        playlist_id = extract_playlist_id(playlist_url)
        if not playlist_id:
            return jsonify({'success': False, 'error': 'Invalid YouTube playlist URL'}), 400
        
        # Fetch videos
        videos = youtube_handler.get_playlist_videos(playlist_id)
        
        if not videos:
            return jsonify({'success': False, 'error': 'No videos found in playlist'}), 404
        
        # Classify videos
        classified = classifier.classify_videos(videos)
        
        # Store for later use
        playlist_data = {
            'videos': videos,
            'classified': classified,
            'playlist_id': playlist_id
        }
        
        # Count videos per genre
        genre_counts = {genre: len(vids) for genre, vids in classified.items()}
        
        return jsonify({
            'success': True,
            'total_videos': len(videos),
            'genres': genre_counts,
            'classified': classified
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/create-playlists', methods=['POST'])
def create_playlists():
    """Create YouTube playlists for each custom genre group"""
    global playlist_data, youtube_handler
    
    try:
        if not youtube_handler or not playlist_data:
            return jsonify({'success': False, 'error': 'No playlist data available'}), 400
        
        data = request.json or {}
        playlist_map = data.get('playlist_map')
        if not playlist_map or not isinstance(playlist_map, dict):
            return jsonify({'success': False, 'error': 'Playlist map is required'}), 400
        
        created_playlists = {}
        
        for genreKey, info in playlist_map.items():
            video_ids = info.get('video_ids', [])
            playlist_title = info.get('title', genreKey)
            if not video_ids:
                continue
            
            playlist = youtube_handler.create_playlist(
                title=playlist_title,
                description=f"Music grouped as {playlist_title} from your playlist"
            )
            playlist_id = playlist['id']
            created_playlists[genreKey] = {
                'id': playlist_id,
                'title': playlist_title,
                'url': f'https://www.youtube.com/playlist?list={playlist_id}',
                'video_count': len(video_ids)
            }
            
            for video_id in video_ids:
                youtube_handler.add_video_to_playlist(
                    playlist_id,
                    video_id
                )
        
        return jsonify({
            'success': True,
            'playlists': created_playlists
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/export-json', methods=['GET'])
def export_json():
    """Export classified data as JSON"""
    global playlist_data
    
    try:
        if not playlist_data:
            return jsonify({'success': False, 'error': 'No playlist data available'}), 400
        
        return jsonify({
            'success': True,
            'data': playlist_data['classified']
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
