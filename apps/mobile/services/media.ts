export function getCourseThumbnailMediaDirectory(
  orgUUID: string,
  courseUUID: string,
  fileId: string,
) {
  if (!fileId) return null;

  // Try to use EXPO_PUBLIC_API_URL. If it's missing, default to localhost (for local development)
  const baseUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

  // Make sure baseUrl ends with a slash
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

  return `${cleanBaseUrl}content/orgs/${orgUUID}/courses/${courseUUID}/thumbnails/${fileId}`;
}

export function getUserAvatarMediaDirectory(userUUID: string, fileId: string) {
  if (!fileId || !userUUID) return null;

  const baseUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

  return `${cleanBaseUrl}content/users/${userUUID}/avatars/${fileId}`;
}
