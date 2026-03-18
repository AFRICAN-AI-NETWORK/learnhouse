import os
import json
from google_auth_oauthlib.flow import InstalledAppFlow

# The scopes required for YouTube automation.
# 'youtube.force-ssl' for creating/managing Live Broadcasts.
# 'youtube.upload' for finalizing recordings.
SCOPES = [
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly'
]

def main():
    print("YouTube Token Generator for LearnHouse")
    print("-" * 40)
    print("NOTE: For production, you will need to justify the 'force-ssl' scope.")
    print("Explain that LearnHouse automates Live Session creation for workshops.")
    print("-" * 40)

    secret_file = input("Enter path to client_secrets.json (default: client_secrets.json): ").strip() or "client_secrets.json"

    if not os.path.exists(secret_file):
        print(f"Error: File '{secret_file}' not found.")
        return

    try:
        # Run the OAuth Flow
        flow = InstalledAppFlow.from_client_secrets_file(secret_file, SCOPES)
        creds = flow.run_local_server(port=0)

        # Build the final credential JSON
        token_data = {
            "token": creds.token,
            "refresh_token": creds.refresh_token,
            "token_uri": creds.token_uri,
            "client_id": creds.client_id,
            "client_secret": creds.client_secret,
            "scopes": creds.scopes,
            "universe_domain": getattr(creds, 'universe_domain', 'googleapis.com'),
            "account": ""
        }

        print("\n" + "="*60)
        print("SUCCESS! Paste the JSON block below into your Integration Settings:")
        print("="*60 + "\n")
        print(json.dumps(token_data, indent=2))
        print("\n" + "="*60)

    except Exception as e:
        print(f"\nAn error occurred: {str(e)}")

if __name__ == "__main__":
    main()
