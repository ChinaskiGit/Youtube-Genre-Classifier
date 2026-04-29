import json
import os
import re
import urllib.request
from collections import defaultdict


class GenreClassifier:
    """Classify videos into music genres based on title and metadata"""
    
    # Genre keywords mapping
    GENRE_KEYWORDS = {
        'Soul': ['soul', 'motown', 'rhythm & blues', 'rhythm and blues', 'r&b', 'rnb', 'neo soul', 'smooth soul', 'soulful', 'deep soul', 'quiet storm', 'soul revival', 'blue-eyed soul', 'soul singer', 'soul music'],
        'Reggae': ['reggae', 'roots', 'dub', 'dancehall', 'rasta', 'one drop', 'dub poetry', 'reggae fusion', 'lovers rock', 'rub-a-dub', 'rockers', 'dubby', 'conscious reggae', 'roots reggae'],
        'Ska': ['ska', 'rocksteady', 'two tone', 'two-tone', 'rude boy', 'skanking', 'ska punk', 'ska-core', 'third wave ska', 'ska revival'],
        'Hip-Hop': ['hip-hop', 'hip hop', 'rap', 'hiphop', 'boom bap', 'trap', 'freestyle', 'bars', 'mixtape', 'old school', 'drill', 'gangsta', 'flow', 'mc', 'dj', 'beat', 'rhymes'],
        'Rock': ['rock', 'hard rock', 'classic rock', 'rock n roll', 'alternative rock', 'indie rock', 'punk rock', 'garage rock', 'metal'],
        'Pop': ['pop', 'top 40', 'mainstream pop', 'pop music', 'popstar', 'k-pop', 'bubblegum pop', 'dance pop', 'teen pop'],
        'Jazz': ['jazz', 'bebop', 'cool jazz', 'modal jazz', 'smooth jazz', 'jazz fusion', 'big band', 'standards', 'saxophone'],
        'Blues': ['blues', 'electric blues', 'delta blues', 'chicago blues', 'boogie', 'slide guitar', 'bb king'],
        'Funk': ['funk', 'groovy', 'funky', 'james brown', 'parliament', 'funkadelic', 'jam band', 'disco', 'p-funk', 'funk rock', 'psychedelic funk', 'mothership', 'bootsy', 'sly stone'],
    }

    FIELD_WEIGHTS = {
        'title': 4,
        'channelTitle': 2,
        'tags': 2,
        'description': 1,
    }

    def __init__(self):
        """Initialize classifier with genre keywords and optional LLM support"""
        self.genre_keywords = self.GENRE_KEYWORDS
        self.llm_enabled = os.getenv('USE_LLM_CLASSIFICATION', 'false').lower() in ('1', 'true', 'yes')
        self.llm_api_key = os.getenv('OPENAI_API_KEY')
        if self.llm_enabled and not self.llm_api_key:
            print('Warning: USE_LLM_CLASSIFICATION enabled but OPENAI_API_KEY not found. Falling back to keyword scoring.')
            self.llm_enabled = False

    def classify_video(self, video):
        """Classify a single video into a genre."""
        if self.llm_enabled:
            try:
                return self.classify_video_with_llm(video)
            except Exception as e:
                print(f'LLM classification failed, falling back to keyword scoring: {e}')
        return self.classify_video_scored(video)

    def classify_video_scored(self, video):
        """Use keyword scoring across title, channel, and description."""
        text_fields = {
            'title': video.get('title', ''),
            'description': video.get('description', ''),
            'channelTitle': video.get('channelTitle', ''),
            'tags': ' '.join(video.get('tags', []) or []),
        }

        scores = defaultdict(int)
        for genre, keywords in self.genre_keywords.items():
            for keyword in keywords:
                pattern = re.compile(rf'\b{re.escape(keyword)}\b', re.IGNORECASE)
                for field, weight in self.FIELD_WEIGHTS.items():
                    count = len(pattern.findall(text_fields[field] or ''))
                    scores[genre] += count * weight

        if not any(scores.values()):
            return 'Unknown'

        best_genre, best_score = None, 0
        for genre, score in scores.items():
            if score > best_score:
                best_genre, best_score = genre, score

        return best_genre if best_score > 0 else 'Unknown'

    def classify_video_with_llm(self, video):
        """Use OpenAI to classify a video title and description into one genre."""
        prompt = (
            'You are a music genre classifier. Choose exactly one genre from the list: ' \
            'Soul, Reggae, Ska, Hip-Hop, Rock, Pop, Jazz, Blues, Funk, Unknown. '\
            'Given the video title, channel, and description, return only the genre name.\n\n'
            f'Title: {video.get("title", "")}\n'
            f'Channel: {video.get("channelTitle", "")}\n'
            f'Description: {video.get("description", "")}\n\n'
            'Genre:'
        )

        request_body = json.dumps({
            'model': 'gpt-3.5-turbo',
            'messages': [
                {'role': 'system', 'content': 'You classify music genres based on text.'},
                {'role': 'user', 'content': prompt},
            ],
            'temperature': 0.0,
            'max_tokens': 16,
        }).encode('utf-8')

        req = urllib.request.Request(
            'https://api.openai.com/v1/chat/completions',
            data=request_body,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.llm_api_key}',
            },
            method='POST'
        )

        with urllib.request.urlopen(req, timeout=30) as resp:
            response_data = json.loads(resp.read().decode('utf-8'))
        genre = response_data['choices'][0]['message']['content'].strip().splitlines()[0]
        if genre not in self.GENRE_KEYWORDS and genre != 'Unknown':
            return 'Unknown'
        return genre

    def classify_videos(self, videos):
        """Classify multiple videos and organize by genre."""
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
