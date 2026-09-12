"""
SENTINEL 2026 — Automated Visual Liveness & Motion Analyzer
=============================================================
Mathematically verifies that a CCTV / MJPEG video stream is authentic moving footage:
1. Computes Gunnar Farneback Optical Flow for physical motion vector verification
2. Computes Structural Similarity Index (SSIM) to rule out frozen buffers
3. Computes Shannon Entropy to rule out blank/dark/glare screens

NOTE: AST Invariant Gate Rule 2 compliant — strictly uses time.monotonic() / time.perf_counter().
Zero time.time() calls in vision directory.
"""

import math
import time
from typing import Dict, Any, List, Optional
import cv2
import numpy as np
import urllib.request


class VideoLivenessAnalyzer:
    def __init__(self, stream_url: Optional[str] = None, sample_duration_sec: float = 3.0):
        self.stream_url = stream_url
        self.sample_duration_sec = sample_duration_sec

    @staticmethod
    def compute_shannon_entropy(gray_frame: np.ndarray) -> float:
        """
        Calculates Shannon entropy of pixel intensity distribution:
            H(X) = - sum(p(i) * log2(p(i)))
        Normal dynamic CCTV scenes yield H in [5.5, 7.8].
        Black/blank screens yield H < 2.5.
        """
        hist = cv2.calcHist([gray_frame], [0], None, [256], [0, 256])
        total_pixels = hist.sum()
        if total_pixels == 0:
            return 0.0
        hist_norm = hist.ravel() / total_pixels
        non_zeros = hist_norm[hist_norm > 0]
        entropy = -np.sum(non_zeros * np.log2(non_zeros))
        return float(entropy)

    @staticmethod
    def compute_ssim(img1: np.ndarray, img2: np.ndarray) -> float:
        """
        Computes Structural Similarity Index (SSIM) between two grayscale frames.
        Returns float in [-1.0, 1.0].
        SSIM > 0.9995 indicates a dead frozen frame buffer.
        """
        C1 = (0.01 * 255.0) ** 2
        C2 = (0.03 * 255.0) ** 2

        f1 = img1.astype(np.float64)
        f2 = img2.astype(np.float64)

        kernel = cv2.getGaussianKernel(11, 1.5)
        window = np.outer(kernel, kernel.transpose())

        mu1 = cv2.filter2D(f1, -1, window)[5:-5, 5:-5]
        mu2 = cv2.filter2D(f2, -1, window)[5:-5, 5:-5]

        mu1_sq = mu1 ** 2
        mu2_sq = mu2 ** 2
        mu1_mu2 = mu1 * mu2

        sigma1_sq = cv2.filter2D(f1 ** 2, -1, window)[5:-5, 5:-5] - mu1_sq
        sigma2_sq = cv2.filter2D(f2 ** 2, -1, window)[5:-5, 5:-5] - mu2_sq
        sigma12 = cv2.filter2D(f1 * f2, -1, window)[5:-5, 5:-5] - mu1_mu2

        ssim_map = ((2.0 * mu1_mu2 + C1) * (2.0 * sigma12 + C2)) / (
            (mu1_sq + mu2_sq + C1) * (sigma1_sq + sigma2_sq + C2)
        )
        return float(ssim_map.mean())

    @staticmethod
    def compute_optical_flow_p95(gray1: np.ndarray, gray2: np.ndarray) -> float:
        """
        Computes Gunnar Farneback dense optical flow displacement magnitude
        and returns the 95th percentile motion vector in pixels/frame.
        """
        flow = cv2.calcOpticalFlowFarneback(
            gray1,
            gray2,
            None,
            pyr_scale=0.5,
            levels=3,
            winsize=15,
            iterations=3,
            poly_n=5,
            poly_sigma=1.2,
            flags=0,
        )
        mag, _ = cv2.cartToPolar(flow[..., 0], flow[..., 1])
        return float(np.percentile(mag, 95))

    def analyze_frames(self, frames: List[np.ndarray], timestamps: Optional[List[float]] = None) -> Dict[str, Any]:
        """
        Analyzes an in-memory list of BGR video frames for liveness, motion, and entropy.
        """
        if not frames or len(frames) < 2:
            return {
                "liveness_passed": False,
                "reason": f"Insufficient frames ({len(frames) if frames else 0} frames)",
                "fps": 0.0,
            }

        gray_frames = [
            cv2.cvtColor(f, cv2.COLOR_BGR2GRAY) if len(f.shape) == 3 else f
            for f in frames
        ]

        # 1. Shannon Entropy Analysis
        entropies = [self.compute_shannon_entropy(g) for g in gray_frames]
        mean_entropy = float(np.mean(entropies))

        if mean_entropy < 2.50:
            return {
                "liveness_passed": False,
                "reason": f"Feed is blank or dark (mean entropy {mean_entropy:.2f} < 2.50)",
                "mean_entropy": round(mean_entropy, 3),
                "fps": 0.0,
            }

        # 2. Structural Similarity Index (SSIM) Check for Freezing
        ssim_values = []
        for i in range(1, len(gray_frames)):
            ssim_val = self.compute_ssim(gray_frames[i - 1], gray_frames[i])
            ssim_values.append(ssim_val)
        mean_ssim = float(np.mean(ssim_values))

        if mean_ssim > 0.9995:
            return {
                "liveness_passed": False,
                "reason": f"Feed is frozen on identical static picture (mean SSIM {mean_ssim:.5f} > 0.9995)",
                "mean_ssim": round(mean_ssim, 5),
                "mean_entropy": round(mean_entropy, 3),
            }

        # 3. Dense Optical Flow Analysis (Farneback)
        flow_magnitudes = []
        for i in range(1, min(len(gray_frames), 10)):
            p95 = self.compute_optical_flow_p95(gray_frames[i - 1], gray_frames[i])
            flow_magnitudes.append(p95)

        mean_motion_p95 = float(np.mean(flow_magnitudes))
        has_motion = mean_motion_p95 >= 0.85

        fps = 0.0
        if timestamps and len(timestamps) >= 2:
            duration = timestamps[-1] - timestamps[0]
            if duration > 0:
                fps = (len(timestamps) - 1) / duration

        return {
            "liveness_passed": True,
            "has_motion": has_motion,
            "mean_entropy": round(mean_entropy, 3),
            "mean_ssim": round(mean_ssim, 4),
            "mean_optical_flow_p95": round(mean_motion_p95, 3),
            "fps": round(fps, 2),
            "frames_audited": len(frames),
            "resolution": f"{frames[0].shape[1]}x{frames[0].shape[0]}",
        }

    def analyze_stream(self) -> Dict[str, Any]:
        """
        Connects to live MJPEG stream URL, reads frames over sample_duration_sec,
        and executes sensory CV liveness evaluation.
        """
        if not self.stream_url:
            return {"liveness_passed": False, "reason": "No stream_url provided"}

        stream = urllib.request.urlopen(self.stream_url, timeout=5.0)
        bytes_data = b""
        frames: List[np.ndarray] = []
        timestamps: List[float] = []

        start_time = time.monotonic()
        while time.monotonic() - start_time < self.sample_duration_sec:
            chunk = stream.read(4096)
            if not chunk:
                break
            bytes_data += chunk
            a = bytes_data.find(b"\xff\xd8")  # Start of JPEG
            b = bytes_data.find(b"\xff\xd9")  # End of JPEG
            if a != -1 and b != -1:
                jpg_bytes = bytes_data[a : b + 2]
                bytes_data = bytes_data[b + 2 :]
                frame = cv2.imdecode(np.frombuffer(jpg_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
                if frame is not None:
                    # Downscale to 640x360 for high-speed mathematical analysis
                    small = cv2.resize(frame, (640, 360), interpolation=cv2.INTER_AREA)
                    frames.append(small)
                    timestamps.append(time.monotonic())

        stream.close()
        return self.analyze_frames(frames, timestamps)
