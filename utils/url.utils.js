export function getFullImageUrl(request, imagePath) {
    if (!imagePath) return null;

    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }

    const protocol = request.protocol;
    const host = request.hostname;
    const port = request.port;

    const baseUrl = `${protocol}://${host}${port ? ':' + port : ''}`;
    return `${baseUrl}/uploads${imagePath}`;
}
