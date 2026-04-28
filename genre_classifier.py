import json
from collections import defaultdict


class GenreClassifier:
    """Classify videos into music genres based on title and metadata"""
    
    # Genre keywords mapping
    GENRE_KEYWORDS = {
        'Soul': ['soul', 'motown', 'rhythm & blues', 'r&b', 'smooth soul'],
        'Reggae': ['reggae', 'roots', 'dub', 'dancehall', 'ska', 'rasta'],
        'Ska': ['ska', 'two tone', 'rude boy', 'skanking'],
        'Hip-Hop': ['hip-hop', 'hip hop', 'rap', 'hip hop', 'hiphop', 'boom bap', 'freestyle'],
        'Rock': ['rock', 'hard rock', 'classic rock', 'rock n roll', 'alternative rock'],
        'Pop': ['pop', 'top 40', 'mainstream pop', 'pop music', 'popstar'],
        'Jazz': ['jazz', 'bebop', 'cool jazz', 'modal jazz'],
        'Blues': ['blues', 'electric blues', 'delta blues'],
        'Funk': ['funk', 'groovy', 'funky', 'james brown'],
    }
    
    def __init__(self):
        """Initialize classifier with genre keywords"""
        self.genre_keywords = self.GENRE_KEYWORDS
    
    def classify_video(self, video):
        """
        Classify a single video into a genre
        
        Args:
            video: Dictionary with 'title' and 'description'
        
        Returns:
            Genre string or 'Unknown' if no match
        """
        text = (video.get('title', '') + ' ' + video.get('description', '')).lower()
        
        # Check keywords for each genre
        for genre, keywords in self.genre_keywords.items():
            for keyword in keywords:
                if keyword.lower() in text:
                    return genre
        
        return 'Unknown'
    
    def classify_videos(self, videos):
        """
        Classify multiple videos and organize by genre
        
        Args:
            videos: List of video dictionaries
        
        Returns:
            Dictionary with genres as keys and video lists as values
        """
        classified = defaultdict(list)
        
        for video in videos:
            genre = self.classify_video(video)
            classified[genre].append(video)
        
        return dict(sorted(classified.items()))
    
    def export_to_json(self, classified_videos, output_file='classified_videos.json'):
        """Export classified videos to JSON file"""
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(classified_videos, f, indent=2, ensure_ascii=False)
        print(f"Exported to {output_file}")
    
    def export_to_txt(self, classified_videos, output_file='classified_videos.txt'):
        """Export classified videos to TXT file with links"""
        with open(output_file, 'w', encoding='utf-8') as f:
            for genre, videos in classified_videos.items():
                f.write(f"\n{'='*60}\n")
                f.write(f"{genre.upper()}\n")
                f.write(f"{'='*60}\n")
                
                for video in videos:
                    video_url = f"https://www.youtube.com/watch?v={video['videoId']}"
                    f.write(f"{video['title']}\n{video_url}\n\n")
        
        print(f"Exported to {output_file}")
