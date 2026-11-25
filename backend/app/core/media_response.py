"""인증을 마친 음성의 단일 byte range 응답. 버킷 주소는 공개하지 않는다."""

import re

from fastapi.responses import Response


def voice_response(data: bytes, media_type: str, byte_range: str | None) -> Response:
    size = len(data)
    headers = {"Accept-Ranges": "bytes", "Cache-Control": "private, no-store"}
    if not byte_range:
        return Response(data, media_type=media_type, headers=headers)
    match = re.fullmatch(r"bytes=(\d{0,20})-(\d{0,20})", byte_range)
    if not match or not any(match.groups()) or size == 0:
        return Response(status_code=416, headers={**headers, "Content-Range": f"bytes */{size}"})
    first, last = match.groups()
    if first:
        start, end = int(first), min(int(last) if last else size - 1, size - 1)
    else:
        start, end = max(0, size - int(last)), size - 1
    if start > end or start >= size:
        return Response(status_code=416, headers={**headers, "Content-Range": f"bytes */{size}"})
    headers["Content-Range"] = f"bytes {start}-{end}/{size}"
    return Response(data[start : end + 1], status_code=206, media_type=media_type, headers=headers)
