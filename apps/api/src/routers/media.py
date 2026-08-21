from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from PIL import Image

router = APIRouter()
CONTENT_DIR = Path("content")

@router.get("/{path:path}")
async def get_optimized_media(
    path: str,
    w: int = Query(None, description="Width"),
    q: int = Query(80, description="Quality")
):
    original_path = CONTENT_DIR / path
    
    # Prevent directory traversal
    try:
        original_path = original_path.resolve()
        if not str(original_path).startswith(str(CONTENT_DIR.resolve())):
            raise HTTPException(status_code=403, detail="Forbidden")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid path")

    if not original_path.exists() or not original_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
        
    # If no width specified or not an image (e.g. video), return original
    ext = original_path.suffix.lower()
    if not w or ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
        return FileResponse(original_path)
        
    # Generate cached filename
    cache_dir = CONTENT_DIR / ".cache" / "media"
    cache_dir.mkdir(parents=True, exist_ok=True)
    
    # Create unique name based on original file stat and params to handle updates
    file_stat = original_path.stat()
    cache_name = f"{original_path.stem}_{w}w_{q}q_{file_stat.st_mtime}.webp"
    cache_path = cache_dir / cache_name
    
    if cache_path.exists():
        return FileResponse(cache_path, media_type="image/webp")
        
    # Process image
    try:
        with Image.open(original_path) as img:
            # Calculate new height to maintain aspect ratio
            aspect_ratio = img.height / img.width
            new_h = int(w * aspect_ratio)
            
            # Resize
            img = img.resize((w, new_h), Image.Resampling.LANCZOS)
            
            # Save as WebP
            img.save(cache_path, "WEBP", quality=q)
            
        return FileResponse(cache_path, media_type="image/webp")
    except Exception:  # noqa: BLE001
        # Fallback to original on processing error
        return FileResponse(original_path)
