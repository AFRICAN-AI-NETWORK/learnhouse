import json
from typing import Optional, Dict, Any
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import datetime

class YouTubeService:
    def __init__(self, credentials_json: str):
        """
        Initialize the YouTube API service using stored OAuth credentials.
        credentials_json: A JSON string containing client_id, client_secret, refresh_token, etc.
        """
        creds_data = json.loads(credentials_json)
        self.credentials = Credentials.from_authorized_user_info(creds_data)
        self.youtube = build('youtube', 'v3', credentials=self.credentials)

    async def create_broadcast(self, title: str, description: str, start_time: str) -> Dict[str, Any]:
        """
        Creates a Live Broadcast and a Live Stream, then binds them.
        Returns the videoId and the Stream Key.
        """
        try:
            # 1. Create the Live Broadcast
            broadcast_body = {
                'snippet': {
                    'title': title,
                    'description': description,
                    'scheduledStartTime': start_time,
                },
                'status': {
                    'privacyStatus': 'unlisted', # Default to unlisted for course safety
                    'selfDeclaredMadeForKids': False,
                },
                'contentDetails': {
                    'enableAutoStart': True,
                    'enableAutoStop': True,
                    'monitorStream': {
                        'enableMonitorStream': False
                    }
                }
            }
            
            broadcast_res = self.youtube.liveBroadcasts().insert(
                part='snippet,status,contentDetails',
                body=broadcast_body
            ).execute()
            
            video_id = broadcast_res['id']
            
            # 2. Create the Live Stream (the pipe)
            stream_body = {
                'snippet': {
                    'title': f"Stream for {title}",
                },
                'cdn': {
                    'frameRate': '30fps',
                    'ingestionType': 'rtmp',
                    'resolution': '720p',
                }
            }
            
            stream_res = self.youtube.liveStreams().insert(
                part='snippet,cdn',
                body=stream_body
            ).execute()
            
            stream_name = stream_res['cdn']['ingestionInfo']['streamName'] # This is the Stream Key
            
            # 3. Bind the broadcast to the stream
            self.youtube.liveBroadcasts().bind(
                id=video_id,
                part='id,contentDetails',
                streamId=stream_res['id']
            ).execute()
            
            return {
                'video_id': video_id,
                'stream_key': stream_name,
                'watch_url': f"https://www.youtube.com/watch?v={video_id}"
            }
            
        except HttpError as e:
            print(f"An HTTP error {e.resp.status} occurred: {e.content}")
            raise e

async def create_automated_youtube_session(org_credentials: str, title: str, start_time: str):
    """
    Helper to bridge the service and the LMS activity creation logic.
    """
    service = YouTubeService(org_credentials)
    return await service.create_broadcast(
        title=title,
        description="Automated Session Replay for LearnHouse Academy",
        start_time=start_time
    )
