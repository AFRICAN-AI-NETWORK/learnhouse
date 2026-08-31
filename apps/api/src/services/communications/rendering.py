from typing import Literal, Optional

from pydantic import BaseModel, Field

# --- Validation Schemas ---

class HeaderSection(BaseModel):
    type: Literal["header"]
    headline: str
    body: str
    image_url: Optional[str] = None

class TextSection(BaseModel):
    type: Literal["text"]
    heading: Optional[str] = None
    body: str

class CourseSection(BaseModel):
    type: Literal["course"]
    course_uuid: str
    title: str
    description: str
    image_url: Optional[str] = None
    cta_label: str = Field(default="View course", max_length=60)
    cta_url: str

class ImageSection(BaseModel):
    type: Literal["image"]
    image_url: str
    alt_text: str

class ButtonSection(BaseModel):
    type: Literal["button"]
    label: str = Field(max_length=60)
    url: str

class FooterSection(BaseModel):
    type: Literal["footer"]
    closing_text: str
    community_link: Optional[str] = None

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
    import os
    backend_url = os.getenv("BACKEND_URL", "https://api.lms.africanainetwork.com").rstrip("/")
    
    def make_absolute(url: str | None) -> str:
        if not url:
            return ""
        if url.startswith(("http://", "https://", "data:")):
            return url
        if url.startswith("/"):
            return f"{backend_url}{url}"
        return f"{backend_url}/{url}"

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
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{escape_html(campaign.get("subject", ""))}</title>
        <style>
            /* Reset & Typography */
            body {{ 
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                background-color: #f8fafc; 
                margin: 0; 
                padding: 40px 0; 
                -webkit-font-smoothing: antialiased;
            }}
            .wrapper {{
                width: 100%;
                background-color: #f8fafc;
            }}
            .container {{ 
                max-width: 600px; 
                margin: 0 auto; 
                background-color: #ffffff; 
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
            }}
            
            /* Header */
            .header {{
                background-color: #0a0f1e; 
                padding: 32px 40px; 
                text-align: center;
            }}
            .header-brand {{
                color: #ffffff; 
                font-weight: 800; 
                font-size: 20px; 
                letter-spacing: 0.1em;
                text-transform: uppercase;
                margin: 0;
            }}
            
            /* Content Area */
            .content {{ 
                padding: 40px; 
                color: #334155; 
                line-height: 1.6;
            }}
            .preheader {{ display: none; max-height: 0px; overflow: hidden; }}
            
            /* Typography inside content */
            h1 {{
                color: #0f172a;
                font-size: 28px;
                font-weight: 800;
                line-height: 1.3;
                margin-top: 0;
                margin-bottom: 24px;
                letter-spacing: -0.02em;
            }}
            h2 {{
                color: #0f172a;
                font-size: 20px;
                font-weight: 700;
                margin-top: 32px;
                margin-bottom: 16px;
            }}
            p {{
                margin-top: 0;
                margin-bottom: 20px;
                font-size: 16px;
                color: #475569;
            }}
            
            /* Media */
            img {{ 
                max-width: 100%; 
                height: auto; 
                display: block; 
                border-radius: 12px;
                margin-bottom: 24px;
            }}
            
            /* Buttons */
            .btn-wrapper {{
                margin: 32px 0;
            }}
            .btn {{ 
                display: inline-block; 
                padding: 14px 28px; 
                background-color: #0057ff; 
                color: #ffffff; 
                text-decoration: none; 
                border-radius: 8px; 
                font-weight: 600; 
                font-size: 16px;
                text-align: center;
            }}
            
            /* Course Cards */
            .course-card {{
                background-color: #f8fafc;
                border: 1px solid #e2e8f0; 
                border-radius: 16px; 
                padding: 24px; 
                margin-bottom: 24px;
            }}
            .course-card h3 {{
                color: #0f172a;
                font-size: 18px;
                font-weight: 700;
                margin-top: 0;
                margin-bottom: 12px;
            }}
            .course-card p {{
                font-size: 15px;
                margin-bottom: 20px;
            }}
            .course-card img {{
                margin-bottom: 16px;
            }}
            
            /* Footer */
            .footer {{ 
                background-color: #f8fafc; 
                padding: 32px 40px; 
                text-align: center; 
                border-top: 1px solid #e2e8f0; 
            }}
            .footer p {{
                font-size: 13px;
                color: #64748b; 
                margin-bottom: 12px;
            }}
            .footer a {{
                color: #64748b;
                text-decoration: underline;
            }}
        </style>
    </head>
    <body>
    <div class="wrapper">
    """

    if campaign.get("preheader"):
        html += f'<div class="preheader">{escape_html(campaign["preheader"])}</div>'

    html += '<div class="container">'
    text_fallback = []

    # Org Header
    org_name = escape_html(campaign.get("org_name", "LearnHouse Organization"))
    html += f'<div class="header"><p class="header-brand">{org_name}</p></div>'
    text_fallback.append(f"--- {org_name} ---")

    html += '<div class="content">'

    for section in content.sections:
        if section.type == "header":
            html += f"<h1>{escape_html(section.headline)}</h1>"
            html += f"<p>{escape_html(section.body)}</p>"
            text_fallback.append(f"# {section.headline}\n{section.body}")
            if section.image_url:
                abs_img = make_absolute(section.image_url)
                html += f'<img src="{abs_img}" alt="Header image" />'

        elif section.type == "text":
            if section.heading:
                html += f"<h2>{escape_html(section.heading)}</h2>"
                text_fallback.append(f"\n## {section.heading}")
            html += f"<p>{escape_html(section.body)}</p>"
            text_fallback.append(section.body)

        elif section.type == "course":
            html += '<div class="course-card">'
            if section.image_url:
                abs_img = make_absolute(section.image_url)
                html += f'<img src="{abs_img}" alt="{escape_html(section.title)}" />'
            html += f'<h3>{escape_html(section.title)}</h3>'
            html += f'<p>{escape_html(section.description)}</p>'
            html += f'<div class="btn-wrapper"><a href="{section.cta_url}" class="btn">{escape_html(section.cta_label)}</a></div>'
            html += '</div>'
            
            text_fallback.append(f"\nCourse: {section.title}\n{section.description}\n{section.cta_label}: {section.cta_url}")

        elif section.type == "image":
            abs_img = make_absolute(section.image_url)
            html += f'<img src="{abs_img}" alt="{escape_html(section.alt_text)}" />'

        elif section.type == "button":
            html += f'<div class="btn-wrapper"><a href="{section.url}" class="btn">{escape_html(section.label)}</a></div>'
            text_fallback.append(f"\n[{section.label}]({section.url})")

        elif section.type == "footer":
            html += '<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">'
            html += f'<p style="color: #64748b; font-size: 14px;">{escape_html(section.closing_text)}</p>'
            text_fallback.append(f"\n---\n{section.closing_text}")
            if section.community_link:
                html += f'<a href="{section.community_link}" style="color: #0057ff; font-weight: bold; text-decoration: none;">Join our community</a>'
                text_fallback.append(f"Join our community: {section.community_link}")
            html += '</div>'

    html += '</div>' # End content

    # Standard Footer
    html += '<div class="footer">'
    html += f'<p>You are receiving this email because you are part of {org_name}.</p>'
    html += f'<p><a href="{unsubscribe_url}">Unsubscribe from marketing emails</a></p>'
    html += '</div>'
    
    html += '</div>' # End container
    html += '</div>' # End wrapper
    html += '</body></html>'

    text_fallback.append(f"\n---\nYou are receiving this because you are part of {org_name}.\nUnsubscribe: {unsubscribe_url}")

    return html, "\n".join(text_fallback)
