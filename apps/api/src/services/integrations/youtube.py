import json
from typing import Any, Dict

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError


class YouTubeService:
    def __init__(self, credentials_json: str):
        """
        Initialize the YouTube API service using stored OAuth credentials.
        credentials_json: A JSON string containing client_id, client_secret, refresh_token, etc.
        """
        creds_data = json.loads(credentials_json)

        # Google Console sometimes wraps credentials in 'installed' or 'web'
        if "installed" in creds_data:
            creds_data = creds_data["installed"]
        elif "web" in creds_data:
            creds_data = creds_data["web"]

        # Validate that we have the required fields
        required_fields = ["client_id", "client_secret", "refresh_token"]
        missing = [f for f in required_fields if f not in creds_data]
        if missing:
            raise ValueError(
                f"YouTube integration key is missing required fields: {', '.join(missing)}. "
                "Ensure you have performed the OAuth authorization flow and included the 'refresh_token'."
            )

        self.credentials = Credentials.from_authorized_user_info(creds_data)
        self.youtube = build("youtube", "v3", credentials=self.credentials)

    async def create_broadcast(
        self, title: str, description: str, start_time: str
    ) -> Dict[str, Any]:
        """
        Creates a Live Broadcast and a Live Stream, then binds them.
        Returns the videoId and the Stream Key.
        """
        try:
            # Ensure start_time is in ISO 8601 UTC format (suffix Z) if not already
            if start_time and not start_time.endswith("Z"):
                # Many browsers/pickers omit seconds or the Z.
                # If it's 2024-03-16T12:00, we make it 2024-03-16T12:00:00Z
                if len(start_time) == 16:  # YYYY-MM-DDTHH:MM
                    start_time += ":00Z"
                elif "T" in start_time and "Z" not in start_time:
                    start_time += "Z"

            print(f"Creating YouTube Broadcast: {title} at {start_time}")

            broadcast_body = {
                "snippet": {
                    "title": title,
                    "description": description,
                    "scheduledStartTime": start_time,
                },
                "status": {
                    "privacyStatus": "unlisted",  # Default to unlisted for course safety
                    "selfDeclaredMadeForKids": False,
                },
                "contentDetails": {
                    "enableAutoStart": True,
                    "enableAutoStop": True,
                    "monitorStream": {"enableMonitorStream": False},
                },
            }

            broadcast_res = (
                self.youtube.liveBroadcasts()
                .insert(part="snippet,status,contentDetails", body=broadcast_body)
                .execute()
            )

            video_id = broadcast_res["id"]

            # 2. Create the Live Stream (the pipe)
            stream_body = {
                "snippet": {
                    "title": f"Stream for {title}",
                },
                "cdn": {
                    "frameRate": "30fps",
                    "ingestionType": "rtmp",
                    "resolution": "720p",
                },
            }

            stream_res = (
                self.youtube.liveStreams()
                .insert(part="snippet,cdn", body=stream_body)
                .execute()
            )

            stream_name = stream_res["cdn"]["ingestionInfo"][
                "streamName"
            ]  # This is the Stream Key

            # 3. Bind the broadcast to the stream
            self.youtube.liveBroadcasts().bind(
                id=video_id, part="id,contentDetails", streamId=stream_res["id"]
            ).execute()

            return {
                "video_id": video_id,
                "stream_key": stream_name,
                "watch_url": f"https://www.youtube.com/watch?v={video_id}",
            }
        except HttpError as e:
            print(
                f"An HTTP error {e.resp.status} occurred in create_broadcast: {e.content}"
            )
            raise e

    async def end_broadcast(self, video_id: str) -> Dict[str, Any]:
        """
        Transitions a Live Broadcast to the 'complete' status.
        This stops the live stream and finalizes the recording.
        """
        try:
            res = (
                self.youtube.liveBroadcasts()
                .transition(broadcastStatus="complete", id=video_id, part="id,status")
                .execute()
            )
            return res
        except HttpError as e:
            print(
                f"An HTTP error {e.resp.status} occurred while ending broadcast: {e.content}"
            )
            raise e


async def create_automated_youtube_session(
    org_credentials: str, title: str, start_time: str
):
    """
    Helper to bridge the service and the LMS activity creation logic.
    """
    service = YouTubeService(org_credentials)
    return await service.create_broadcast(
        title=title,
        description="Automated Session Replay for LearnHouse Academy",
        start_time=start_time,
    )
