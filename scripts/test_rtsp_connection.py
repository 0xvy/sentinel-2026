"""
Test all connection methods to the government CCTV server:
1. HLS via cctv.corp8.cloud (with session cookie from login)
2. RTSP with different credential formats
3. Direct HLS without auth (in case streams are public after login)
"""
import os
import sys
import time
import json
import cv2
import urllib.request
import urllib.parse
import http.cookiejar
import ssl

# Disable SSL verification for testing
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

EMAIL = "vanshkhatwani2@gmail.com"
PASSWORD = "7XLR-XC96-FYB7"
HOST_RTSP = "103.250.160.189"
HOST_HLS = "cctv.corp8.cloud"

os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"


def try_login_and_get_cookies():
    """Attempt to login and get session cookies."""
    print("\n[1] Attempting login at cctv.corp8.cloud/auth/login...")
    
    cookie_jar = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(cookie_jar),
        urllib.request.HTTPSHandler(context=ctx)
    )
    
    # First, GET the login page to get any CSRF token
    try:
        req = urllib.request.Request(
            "https://cctv.corp8.cloud/auth/login",
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        )
        resp = opener.open(req)
        login_html = resp.read().decode("utf-8", errors="ignore")
        print(f"  GET /auth/login: {resp.status}")
        
        # Look for CSRF token or hidden fields
        import re
        hidden_fields = re.findall(r'<input[^>]*type=["\']hidden["\'][^>]*name=["\']([^"\']+)["\'][^>]*value=["\']([^"\']*)["\']', login_html)
        if not hidden_fields:
            hidden_fields = re.findall(r'<input[^>]*name=["\']([^"\']+)["\'][^>]*type=["\']hidden["\'][^>]*value=["\']([^"\']*)["\']', login_html)
        
        print(f"  Hidden fields found: {hidden_fields}")
        
        # Check for any form action
        form_action = re.findall(r'<form[^>]*action=["\']([^"\']*)["\']', login_html)
        print(f"  Form actions: {form_action}")
        
    except Exception as e:
        print(f"  GET login page failed: {e}")
        login_html = ""
        hidden_fields = []
    
    # POST login
    try:
        data = {"email": EMAIL, "password": PASSWORD}
        # Add any hidden fields (CSRF tokens etc)
        for name, value in hidden_fields:
            data[name] = value
        
        post_data = urllib.parse.urlencode(data).encode("utf-8")
        req = urllib.request.Request(
            "https://cctv.corp8.cloud/auth/login",
            data=post_data,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Content-Type": "application/x-www-form-urlencoded",
                "Referer": "https://cctv.corp8.cloud/auth/login",
                "Origin": "https://cctv.corp8.cloud",
            },
        )
        resp = opener.open(req)
        body = resp.read().decode("utf-8", errors="ignore")
        print(f"  POST /auth/login: {resp.status}")
        print(f"  Response URL: {resp.url}")
        print(f"  Body preview: {body[:300]}")
        
    except urllib.error.HTTPError as e:
        print(f"  POST login HTTP error: {e.code} {e.reason}")
        body = e.read().decode("utf-8", errors="ignore")
        print(f"  Error body: {body[:300]}")
    except Exception as e:
        print(f"  POST login failed: {e}")
    
    # Print cookies
    cookies = list(cookie_jar)
    print(f"  Cookies received: {len(cookies)}")
    for c in cookies:
        print(f"    {c.name} = {c.value[:20]}...")
    
    # Build cookie string for OpenCV
    cookie_str = "; ".join([f"{c.name}={c.value}" for c in cookies])
    return cookie_str, cookies


def test_hls_with_cookies(cam_id, cookie_str):
    """Test HLS stream with session cookies."""
    url = f"https://cctv.corp8.cloud/{cam_id}/index.m3u8"
    print(f"\n[2] Testing HLS: {url}")
    
    # First check if the m3u8 is accessible
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0",
            "Cookie": cookie_str,
        })
        handler = urllib.request.HTTPSHandler(context=ctx)
        opener = urllib.request.build_opener(handler)
        resp = opener.open(req)
        m3u8_body = resp.read().decode("utf-8", errors="ignore")
        print(f"  HTTP {resp.status} — m3u8 content ({len(m3u8_body)} bytes):")
        print(f"  {m3u8_body[:500]}")
    except Exception as e:
        print(f"  m3u8 fetch failed: {e}")
        return None
    
    # Try OpenCV with HLS
    print(f"\n  Opening with OpenCV...")
    if cookie_str:
        os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = f"cookies;{cookie_str}"
    
    t_start = time.perf_counter()
    cap = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
    t_open = time.perf_counter() - t_start
    
    if not cap.isOpened():
        print(f"  OpenCV HLS FAIL: could not open ({t_open:.2f}s)")
        return None
    
    print(f"  Stream opened in {t_open:.2f}s")
    ret, frame = cap.read()
    t_total = time.perf_counter() - t_start
    
    if ret and frame is not None:
        h, w = frame.shape[:2]
        print(f"  FIRST FRAME: {w}x{h} in {t_total:.2f}s total")
        out = os.path.join(os.path.dirname(__file__), f"test_hls_{cam_id}.jpg")
        cv2.imwrite(out, frame)
        print(f"  Saved: {out}")
    else:
        print(f"  No frame received ({t_total:.2f}s)")
    
    cap.release()
    return frame


def test_hls_no_auth(cam_id):
    """Test HLS stream without any auth (maybe public?)."""
    url = f"https://cctv.corp8.cloud/{cam_id}/index.m3u8"
    print(f"\n[3] Testing HLS WITHOUT auth: {url}")
    
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        handler = urllib.request.HTTPSHandler(context=ctx)
        opener = urllib.request.build_opener(handler)
        resp = opener.open(req)
        body = resp.read().decode("utf-8", errors="ignore")
        print(f"  HTTP {resp.status} — ({len(body)} bytes)")
        print(f"  {body[:500]}")
    except urllib.error.HTTPError as e:
        print(f"  HTTP {e.code}: {e.reason}")
    except Exception as e:
        print(f"  Failed: {e}")


def test_rtsp_variations(cam_id):
    """Try different RTSP URL credential formats."""
    os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"
    
    proto = "rtsp"
    variations = [
        # Standard format from docs
        f"{proto}://vanshkhatwani2%40gmail.com:{PASSWORD}@{HOST_RTSP}:8554/stream/{cam_id}",
        # Without URL encoding
        f"{proto}://vanshkhatwani2@gmail.com:{PASSWORD}@{HOST_RTSP}:8554/stream/{cam_id}",
        # No credentials (maybe auth is session-based?)
        f"{proto}://{HOST_RTSP}:8554/stream/{cam_id}",
    ]
    
    for i, url in enumerate(variations):
        safe_url = url.replace(PASSWORD, "***").replace(EMAIL, "***")
        print(f"\n[4.{i+1}] RTSP variation: {safe_url}")
        
        t_start = time.perf_counter()
        cap = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
        t_open = time.perf_counter() - t_start
        
        if cap.isOpened():
            ret, frame = cap.read()
            t_total = time.perf_counter() - t_start
            if ret and frame is not None:
                h, w = frame.shape[:2]
                print(f"  SUCCESS: {w}x{h} in {t_total:.2f}s")
                out = os.path.join(os.path.dirname(__file__), f"test_rtsp_v{i}_{cam_id}.jpg")
                cv2.imwrite(out, frame)
                cap.release()
                return True
        
        print(f"  FAIL ({t_open:.2f}s)")
        cap.release()
    
    return False


if __name__ == "__main__":
    print("=" * 60)
    print("SENTINEL 2026 — Full Connection Test Suite")
    print(f"Time: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    cam = "cam04"
    
    # Test 1: Login and get cookies
    cookie_str, cookies = try_login_and_get_cookies()
    
    # Test 2: HLS with cookies
    test_hls_with_cookies(cam, cookie_str)
    
    # Test 3: HLS without auth
    test_hls_no_auth(cam)
    
    # Test 4: RTSP variations
    test_rtsp_variations(cam)
    
    print("\n" + "=" * 60)
    print("ALL TESTS COMPLETE")
    print("=" * 60)
