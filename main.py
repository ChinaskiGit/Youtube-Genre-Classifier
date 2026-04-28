import os
from dotenv import load_dotenv
from youtube_handler import YouTubePlaylistHandler
from genre_classifier import GenreClassifier

# Load environment variables
load_dotenv()

def main():
    """Main entry point for YouTube Genre Classifier"""
    
    credentials_path = os.getenv('YOUTUBE_CREDENTIALS_PATH', 'credentials.json')
    playlist_id = os.getenv('PLAYLIST_ID')
    
    if not playlist_id:
        print("Error: PLAYLIST_ID not set in .env file")
        return
    
    if not os.path.exists(credentials_path):
        print(f"Error: {credentials_path} not found. Download your OAuth credentials from Google Cloud Console")
        return
    
    # Initialize YouTube handler
    print("Initializing YouTube handler...")
    youtube_handler = YouTubePlaylistHandler(credentials_path)
    
    # Fetch playlist videos
    print(f"Fetching videos from playlist: {playlist_id}")
    videos = youtube_handler.get_playlist_videos(playlist_id)
    print(f"Found {len(videos)} videos")
    
    # Classify genres
    print("Classifying genres...")
    classifier = GenreClassifier()
    classified_videos = classifier.classify_videos(videos)
    
    # Output results
    print("\n" + "="*50)
    print("Genre Classification Complete!")
    print("="*50)
    
    for genre, video_list in classified_videos.items():
        print(f"\n{genre}: {len(video_list)} videos")
        for video in video_list[:3]:  # Show first 3
            print(f"  - {video['title']}")
        if len(video_list) > 3:
            print(f"  ... and {len(video_list) - 3} more")

if __name__ == '__main__':
    main()
