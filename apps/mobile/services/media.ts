export function getCourseThumbnailMediaDirectory(
  orgUUID: string,
  courseUUID: string,
  fileId: string,
  width?: number,
  quality?: number,
) {
  if (!fileId) return null;

  // Try to use EXPO_PUBLIC_API_URL. If it's missing, default to localhost (for local development)
  const baseUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

  // Make sure baseUrl ends with a slash
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

  let url = `${cleanBaseUrl}media/orgs/${orgUUID}/courses/${courseUUID}/thumbnails/${fileId}`;
  if (width) url += `?w=${width}`;
  if (quality) url += `${width ? "&" : "?"}q=${quality}`;
  return url;
}

export function getUserAvatarMediaDirectory(
  userUUID: string,
  fileId: string,
  width?: number,
  quality?: number,
) {
  if (!fileId || !userUUID) return null;

  const baseUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

  let url = `${cleanBaseUrl}media/users/${userUUID}/avatars/${fileId}`;
  if (width) url += `?w=${width}`;
  if (quality) url += `${width ? "&" : "?"}q=${quality}`;
  return url;
}
