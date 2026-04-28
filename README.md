# YouTube Genre Classifier 🎵

Organize your YouTube music playlists by genre automatically. This tool analyzes your playlist, classifies each video into genres, and creates separate playlists for each genre in your YouTube account.

## Features

- 🔐 Secure OAuth2 authentication with Google
- 📊 Automatic genre classification of videos
- 🎯 Create genre-based playlists in your YouTube account
- 🎨 Clean, modern dark-mode interface
- 📱 Responsive design (works on desktop & mobile)
- 💾 Export classification data as JSON

## Installation

### Prerequisites

- Python 3.8 or higher
- A Google account with YouTube access
- Google Cloud Project with YouTube API enabled

### Setup

1. **Clone or download this project**
   ```bash
   cd youtube-genre-classifier
   ```

2. **Create a virtual environment (optional but recommended)**
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up YouTube API credentials**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project
   - Enable YouTube Data API v3
   - Create OAuth 2.0 Desktop Application credentials
   - Download the credentials JSON file
   - Save it in the project root as `credentials.json`

5. **Configure environment variables**
   - Copy `.env.example` to `.env`
   - Add your YouTube playlist ID to `PLAYLIST_ID` field
   - Make sure `YOUTUBE_CREDENTIALS_PATH=credentials.json`

6. **Run the application**
   ```bash
   python app.py
   ```

7. **Open in browser**
   - Navigate to `http://127.0.0.1:5000`
   - Click "Sign in with Google"
   - Paste your playlist URL
   - Click "Analyze"
   - Click "Create Playlists"

## File Structure

```
youtube-genre-classifier/
├── app.py                       # Flask web server
├── youtube_handler.py           # YouTube API interaction
├── genre_classifier.py          # Genre classification logic
├── requirements.txt             # Python dependencies
├── .env                         # Configuration (local, not in git)
├── .env.example                 # Configuration template
├── .gitignore                   # Git ignore rules
├── credentials.json             # Google OAuth credentials (local)
├── token.json                   # Auth token (auto-generated)
├── templates/
│   └── index.html              # Web interface
└── static/
    ├── style.css               # Styling
    └── script.js               # Frontend logic
```

## Configuration

### `.env` File

```
PLAYLIST_ID=FL-X6pyL5ScACaj4BTCqN7ig
YOUTUBE_CREDENTIALS_PATH=credentials.json
```

- **PLAYLIST_ID**: Extract from your playlist URL (the part after `list=`)
- **YOUTUBE_CREDENTIALS_PATH**: Path to your OAuth credentials JSON

## How to Get Your Playlist ID

1. Open your playlist on YouTube
2. The URL will be: `https://www.youtube.com/playlist?list=YOUR_PLAYLIST_ID`
3. Copy the `YOUR_PLAYLIST_ID` part

## Genre Classification

The tool classifies videos based on keywords found in video titles and descriptions. Currently supported genres:

- Soul
- Reggae / Ska
- Hip-Hop
- Rock
- Pop
- Jazz
- Blues
- Funk

Videos without clear genre keywords are marked as "Unknown".

## Usage Tips

- 🔐 Your credentials are never shared—they stay on your computer
- 📝 Created playlists are set to Private by default
- 🔄 You can run the classifier multiple times without creating duplicates
- 💾 Export your classification data as JSON for backup or analysis

## Troubleshooting

### "credentials.json not found"
- Make sure you downloaded your OAuth credentials from Google Cloud Console
- Place the file in the project root directory

### "Invalid playlist URL"
- Make sure you're using the full playlist URL from YouTube
- Example: `https://www.youtube.com/playlist?list=PLxxx...`

### Port 5000 already in use
- Edit `app.py` and change the port number in the last line
- Or close the application using that port

## Security Notes

- ✅ OAuth tokens are stored locally in `token.json` (git-ignored)
- ✅ Credentials are never sent to external servers
- ✅ Your YouTube data stays private
- ✅ Playlists created are set to PRIVATE by default

## Future Enhancements

- [ ] Advanced genre detection using ML
- [ ] Spotify API integration for accurate genre data
- [ ] Batch processing multiple playlists
- [ ] Custom genre rules
- [ ] Docker support
- [ ] Desktop app (PyInstaller)

## Support

Having issues? Check:
1. Python version (3.8+)
2. All dependencies installed (`pip list`)
3. Google Cloud Console project setup
4. OAuth credentials downloaded correctly

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

You are free to use, modify, and distribute this software for personal and commercial purposes.

---

Made for music lovers. Do what you want with it. 🎵
