import cv2
import numpy as np


def enhance_plate_crop(crop: np.ndarray) -> np.ndarray:
    """
    Adaptive luminance and edge enhancement for license plate crops (USP 3):
    1. Upscales small crops (<60px height or <120px width) 4x via Lanczos4 interpolation
    2. Edge-preserving noise reduction via Bilateral Filter
    3. Dynamic luminance-conditioned equalization on LAB L-channel:
       - High-beam glare (>195 L_mean): Contrast-limiting aggressive CLAHE (clip=4.0)
       - Night / Underexposed (<75 L_mean): Gamma expansion (gamma=1.8) + CLAHE (clip=3.0)
       - Balanced daylight: Standard CLAHE (clip=2.0)
    """
    if crop is None or crop.size == 0:
        return crop

    h, w = crop.shape[:2]

    # 1. Upscale tiny crops 4x using Lanczos4 interpolation
    if h < 60 or w < 120:
        crop = cv2.resize(crop, (w * 4, h * 4), interpolation=cv2.INTER_LANCZOS4)

    # 2. Edge-preserving bilateral filtering
    crop = cv2.bilateralFilter(crop, 9, 75, 75)

    # 3. Dynamic luminance enhancement based on scene conditions
    lab = cv2.cvtColor(crop, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    mean_lum = float(np.mean(l_channel))

    if mean_lum > 195.0:
        # High-beam headlight glare crusher
        clahe = cv2.createCLAHE(clipLimit=4.0, tileGridSize=(6, 6))
    elif mean_lum < 75.0:
        # Night / underexposed: Gamma expansion first
        inv_gamma = 1.0 / 1.8
        table = np.array([((i / 255.0) ** inv_gamma) * 255 for i in range(256)]).astype("uint8")
        l_channel = cv2.LUT(l_channel, table)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    else:
        # Standard balanced daylight
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))

    cl = clahe.apply(l_channel)
    merged = cv2.merge((cl, a_channel, b_channel))
    return cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)


class AdaptiveGlareCrusher:
    """Object-oriented wrapper for adaptive glare-crushing enhancement."""

    @staticmethod
    def process(crop: np.ndarray) -> np.ndarray:
        return enhance_plate_crop(crop)

