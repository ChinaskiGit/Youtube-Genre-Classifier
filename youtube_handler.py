import os
import pickle
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build


class YouTubePlaylistHandler:
    """Handle YouTube API operations for playlist retrieval and management"""
    
    SCOPES = [
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/userinfo.profile'
    ]
    
    def __init__(self, credentials_path):
        self.credentials_path = credentials_path
        self.youtube = self._authenticate()
    
    def _authenticate(self):
        """Authenticate with YouTube API using OAuth"""
        creds = None
        
        # Load existing token if available
        if os.path.exists('token.json'):
            creds = Credentials.from_authorized_user_file('token.json', self.SCOPES)
        
        # If no valid credentials, get new ones
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                flow = InstalledAppFlow.from_client_secrets_file(
                    self.credentials_path, self.SCOPES)
                creds = flow.run_local_server(port=0)
            
            # Save token for next time
            with open('token.json', 'w') as token:
                token.write(creds.to_json())
        
        return build('youtube', 'v3', credentials=creds)
    
    def get_user_info(self):
        """Get authenticated user's profile information"""
        try:
            request = self.youtube.channels().list(
                part='snippet',
                mine=True
            )
            response = request.execute()
            
            if response.get('items'):
                channel = response['items'][0]
                return {
                    'name': channel['snippet']['title'],
                    'picture': channel['snippet']['thumbnails'].get('default', {}).get('url', ''),
                    'channelId': channel['id']
                }
            return None
        except Exception as e:
            print(f"Error getting user info: {e}")
            return None
    
    def get_playlist_videos(self, playlist_id, max_results=50):
        """
        Fetch all videos from a playlist
        
        Args:
            playlist_id: YouTube playlist ID
            max_results: Results per API call (max 50)
        
        Returns:
            List of video dictionaries with title, videoId, description, tags, categoryId
        """
        videos = []
        next_page_token = None
        
        while True:
            request = self.youtube.playlistItems().list(
                part='snippet',
                playlistId=playlist_id,
                maxResults=max_results,
                pageToken=next_page_token
            )
            response = request.execute()
            
            # Extract video info
            for item in response.get('items', []):
                snippet = item.get('snippet', {})
                resource_id = snippet.get('resourceId', {})
                video_id = resource_id.get('videoId')
                if not video_id:
                    continue

                thumbnails = snippet.get('thumbnails', {})
                thumbnail_url = ''
                if isinstance(thumbnails, dict):
                    if 'default' in thumbnails:
                        thumbnail_url = thumbnails['default'].get('url', '')
                    elif thumbnails:
                        first_thumb = next(iter(thumbnails.values()))
                        thumbnail_url = first_thumb.get('url', '') if isinstance(first_thumb, dict) else ''

                video_data = {
                    'title': item['snippet']['title'],
                    'videoId': item['snippet']['resourceId']['videoId'],
                    'description': item['snippet']['description'],
                    'thumbnail': item['snippet']['thumbnails'].get('default', {}).get('url', ''),
                    'channelTitle': item['snippet']['channelTitle'],
                    'tags': [],
                    'categoryId': ''
                }
                videos.append(video_data)
            
            # Check for more pages
            next_page_token = response.get('nextPageToken')
            if not next_page_token:
                break

        self._enrich_video_metadata(videos)
        return videos

    def _enrich_video_metadata(self, videos):
        """Fetch extra metadata for videos such as tags and category."""
        if not videos:
            return

        video_ids = [video['videoId'] for video in videos if video.get('videoId')]
        if not video_ids:
            return

        for i in range(0, len(video_ids), 50):
            batch_ids = video_ids[i:i + 50]
            request = self.youtube.videos().list(
                part='snippet',
                id=','.join(batch_ids)
            )
            response = request.execute()
            details_by_id = {
                item['id']: item['snippet']
                for item in response.get('items', [])
            }

            for video in videos:
                snippet = details_by_id.get(video['videoId'])
                if not snippet:
                    continue
                video['tags'] = snippet.get('tags', [])
                video['categoryId'] = snippet.get('categoryId', '')
                # In some cases, the video description is richer than playlist snippet
                if snippet.get('description'):
                    video['description'] = snippet['description']
    
    def create_playlist(self, title, description='', privacy='PRIVATE'):
        """
        Create a new YouTube playlist
        
        Args:
            title: Playlist title
            description: Playlist description
            privacy: PRIVATE, UNLISTED, or PUBLIC
        
        Returns:
            Dictionary with playlist info including 'id'
        """
        request = self.youtube.playlists().insert(
            part='snippet,status',
            body={
                'snippet': {
                    'title': title,
                    'description': description,
                    'tags': ['auto-generated', 'genre-classifier']
                },
                'status': {
                    'privacyStatus': privacy
                }
            }
        )
        response = request.execute()
        
        return {
            'id': response['id'],
            'title': response['snippet']['title'],
            'url': f"https://www.youtube.com/playlist?list={response['id']}"
        }
    
    def add_video_to_playlist(self, playlist_id, video_id):
        """
        Add a video to a playlist
        
        Args:
            playlist_id: YouTube playlist ID
            video_id: YouTube video ID
        
        Returns:
            Boolean indicating success
        """
        try:
            request = self.youtube.playlistItems().insert(
                part='snippet',
                body={
                    'snippet': {
                        'playlistId': playlist_id,
                        'resourceId': {
                            'kind': 'youtube#video',
                            'videoId': video_id
                        }
                    }
                }
            )
            request.execute()
            return True
        except Exception as e:
            print(f"Error adding video {video_id} to playlist: {e}")
            return False
