from typing import Literal, Optional

from pydantic import BaseModel, Field, HttpUrl

# --- Validation Schemas ---

class HeaderSection(BaseModel):
    type: Literal["header"]
    headline: str
    body: str
    image_url: Optional[HttpUrl] = None

class TextSection(BaseModel):
    type: Literal["text"]
    heading: Optional[str] = None
    body: str

class CourseSection(BaseModel):
    type: Literal["course"]
    course_uuid: str
    title: str
    description: str
    image_url: Optional[HttpUrl] = None
    cta_label: str = Field(default="View course", max_length=60)
    cta_url: HttpUrl

class ImageSection(BaseModel):
    type: Literal["image"]
    image_url: HttpUrl
    alt_text: str

class ButtonSection(BaseModel):
    type: Literal["button"]
    label: str = Field(max_length=60)
    url: HttpUrl

class FooterSection(BaseModel):
    type: Literal["footer"]
    closing_text: str
    community_link: Optional[HttpUrl] = None

class CampaignContent(BaseModel):
    sections: list[
        HeaderSection | TextSection | CourseSection | ImageSection | ButtonSection | FooterSection
    ]

# --- Rendering Logic ---

def escape_html(text: str) -> str:
    """Basic HTML escaping to prevent injection."""
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def render_campaign_email(campaign: dict, recipient: dict, unsubscribe_url: str) -> tuple[str, str]:
    """
    Renders HTML and plain-text versions of a campaign.
    campaign: Campaign dict including 'subject', 'preheader', 'sender_name', 'content_json', 'org_name'
    recipient: Recipient dict (e.g., user name, email)
    unsubscribe_url: Pre-generated unique unsubscribe URL for this user
    """
    try:
        import json
        content_data = campaign.get("content_json") or {}
        if isinstance(content_data, str):
            content_data = json.loads(content_data)
        content = CampaignContent(**content_data)
    except Exception as e:  # noqa: BLE001
        raise ValueError(f"Invalid content JSON: {e}")

    # Start HTML template
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{escape_html(campaign.get("subject", ""))}</title>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; }}
            .content {{ padding: 20px 30px; color: #333333; }}
            .preheader {{ display: none; max-height: 0px; overflow: hidden; }}
            img {{ max-width: 100%; height: auto; display: block; }}
            .btn {{ display: inline-block; padding: 12px 24px; background-color: #0057ff; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; }}
            .footer {{ background-color: #f9fafb; padding: 20px 30px; font-size: 12px; color: #666666; text-align: center; border-top: 1px solid #eaeaea; }}
        </style>
    </head>
    <body>
    """

    if campaign.get("preheader"):
        html += f'<div class="preheader">{escape_html(campaign["preheader"])}</div>'

    html += '<div class="container">'
    text_fallback = []

    # Org Header
    org_name = escape_html(campaign.get("org_name", "LearnHouse Organization"))
    html += f'<div style="background-color: #0a0f1e; padding: 20px 30px; color: #ffffff; font-weight: bold; font-size: 18px;">{org_name}</div>'
    text_fallback.append(f"--- {org_name} ---")

    html += '<div class="content">'

    for section in content.sections:
        if section.type == "header":
            html += f"<h1>{escape_html(section.headline)}</h1>"
            html += f"<p>{escape_html(section.body)}</p>"
            text_fallback.append(f"# {section.headline}\n{section.body}")
            if section.image_url:
                html += f'<img src="{section.image_url}" alt="Header image" style="margin-bottom: 20px; border-radius: 8px;" />'

        elif section.type == "text":
            if section.heading:
                html += f"<h2>{escape_html(section.heading)}</h2>"
                text_fallback.append(f"\n## {section.heading}")
            html += f"<p>{escape_html(section.body)}</p>"
            text_fallback.append(section.body)

        elif section.type == "course":
            html += '<div style="border: 1px solid #eaeaea; border-radius: 8px; padding: 16px; margin-bottom: 20px;">'
            if section.image_url:
                html += f'<img src="{section.image_url}" alt="{escape_html(section.title)}" style="margin-bottom: 16px; border-radius: 6px;" />'
            html += f'<h3 style="margin-top: 0;">{escape_html(section.title)}</h3>'
            html += f'<p>{escape_html(section.description)}</p>'
            html += f'<a href="{section.cta_url}" class="btn">{escape_html(section.cta_label)}</a>'
            html += '</div>'
            
            text_fallback.append(f"\nCourse: {section.title}\n{section.description}\n{section.cta_label}: {section.cta_url}")

        elif section.type == "image":
            html += f'<img src="{section.image_url}" alt="{escape_html(section.alt_text)}" style="margin-bottom: 20px; border-radius: 8px;" />'

        elif section.type == "button":
            html += f'<div style="text-align: center; margin: 30px 0;"><a href="{section.url}" class="btn">{escape_html(section.label)}</a></div>'
            text_fallback.append(f"\n[{section.label}]({section.url})")

        elif section.type == "footer":
            html += '<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center;">'
            html += f'<p style="color: #666666; font-size: 14px;">{escape_html(section.closing_text)}</p>'
            text_fallback.append(f"\n---\n{section.closing_text}")
            if section.community_link:
                html += f'<a href="{section.community_link}" style="color: #0057ff; font-weight: bold; text-decoration: none;">Join our community</a>'
                text_fallback.append(f"Join our community: {section.community_link}")
            html += '</div>'

    html += '</div>' # End content

    # Standard Footer
    html += '<div class="footer">'
    html += f'<p>You are receiving this email because you are part of {org_name}.</p>'
    html += f'<p><a href="{unsubscribe_url}" style="color: #666666; text-decoration: underline;">Unsubscribe from marketing emails</a></p>'
    html += '</div>'
    
    html += '</div>' # End container
    html += '</body></html>'

    text_fallback.append(f"\n---\nYou are receiving this because you are part of {org_name}.\nUnsubscribe: {unsubscribe_url}")

    return html, "\n".join(text_fallback)
