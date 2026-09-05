import os
import uuid
import hashlib
import aiosqlite
from app.config import settings

def sha256_text(text: str) -> str:
    """Generate SHA-256 hex string."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()

# -------------------------------------------------------------------------
# 1. CAMERAS (50 Statewide Gujarat Cameras)
# -------------------------------------------------------------------------
# 15 Police, 10 Transport/RTO, 8 GSRTC, 8 Municipal Corp, 5 Health, 4 Panchayat
STREAM_BASE = "http://127.0.0.1:8554/live"

CAMERAS_DATA = [
    # 15 Police Cameras (Ahmedabad, Gandhinagar, Rajkot, Surat, Vadodara, Mehsana, Highway)
    ("CAM-POL-AHM-01", "SG Highway Iskcon Junction", "Police", "Ahmedabad", 23.0275, 72.5074, "Online", f"{STREAM_BASE}/cam_pol_ahm_01", "Milestone", "2024-01-15", "1080p", 1, "2026-09-05T08:00:00Z"),
    ("CAM-POL-AHM-02", "Vaishnodevi Circle SG Highway", "Police", "Ahmedabad", 23.1188, 72.5441, "Online", f"{STREAM_BASE}/cam_pol_ahm_02", "Milestone", "2024-02-10", "1080p", 1, "2026-09-05T08:00:00Z"),
    ("CAM-POL-AHM-03", "Nehrunagar Cross Road Satellite", "Police", "Ahmedabad", 23.0238, 72.5358, "Online", f"{STREAM_BASE}/cam_pol_ahm_03", "Milestone", "2024-03-01", "1080p", 0, "2026-09-05T08:00:00Z"),
    ("CAM-POL-AHM-04", "Navrangpura PS Surveillance Junction", "Police", "Ahmedabad", 23.0365, 72.5611, "Online", f"{STREAM_BASE}/cam_pol_ahm_04", "Genetec", "2024-03-12", "1080p", 0, "2026-09-05T08:00:00Z"),
    ("CAM-POL-AHM-05", "Kalupur Railway Station Approach Police Naka", "Police", "Ahmedabad", 23.0268, 72.6008, "Online", f"{STREAM_BASE}/cam_pol_ahm_05", "Milestone", "2023-11-20", "1080p", 1, "2026-09-05T08:00:00Z"),
    ("CAM-POL-AHM-06", "Sola Bhagwat Vidyapith Ring Road", "Police", "Ahmedabad", 23.0812, 72.5262, "Online", f"{STREAM_BASE}/cam_pol_ahm_06", "Genetec", "2024-04-05", "1080p", 1, "2026-09-05T08:00:00Z"),
    ("CAM-POL-AHM-07", "C.G. Road Swastik Cross Road", "Police", "Ahmedabad", 23.0335, 72.5564, "Online", f"{STREAM_BASE}/cam_pol_ahm_07", "Milestone", "2024-05-18", "1080p", 0, "2026-09-05T08:00:00Z"),
    ("CAM-POL-AHM-08", "Surendranagar State Highway Junction", "Police", "Surendranagar", 22.7210, 71.6420, "Online", f"{STREAM_BASE}/cam_pol_ahm_08", "Direct_IP", "2024-06-01", "1080p", 1, "2026-09-05T08:00:00Z"),
    ("CAM-POL-AHM-09", "Madhapar Chowkadi Rajkot City Entry", "Police", "Rajkot", 22.3120, 70.7850, "Online", f"{STREAM_BASE}/cam_pol_ahm_09", "Milestone", "2024-06-15", "1080p", 1, "2026-09-05T08:00:00Z"),
    ("CAM-POL-AHM-10", "Trikon Baug Traffic Intersection", "Police", "Rajkot", 22.3015, 70.8032, "Online", f"{STREAM_BASE}/cam_pol_ahm_10", "Genetec", "2024-07-02", "1080p", 1, "2026-09-05T08:00:00Z"),
    ("CAM-POL-AHM-11", "Varachha Main Road Ring Junction", "Police", "Surat", 21.2144, 72.8596, "Online", f"{STREAM_BASE}/cam_pol_ahm_11", "Genetec", "2024-07-20", "1080p", 0, "2026-09-05T08:00:00Z"),
    ("CAM-POL-AHM-12", "Athwa Gate Police Chawki", "Police", "Surat", 21.1824, 72.8122, "Online", f"{STREAM_BASE}/cam_pol_ahm_12", "Milestone", "2024-08-01", "1080p", 1, "2026-09-05T08:00:00Z"),
    ("CAM-POL-AHM-13", "Sayajigunj Police Chowki Vadodara", "Police", "Vadodara", 22.3105, 73.1810, "Online", f"{STREAM_BASE}/cam_pol_ahm_13", "Milestone", "2024-08-15", "1080p", 1, "2026-09-05T08:00:00Z"),
    ("CAM-POL-AHM-14", "Sector 11 CHH Road Intersection", "Police", "Gandhinagar", 23.2230, 72.6515, "Online", f"{STREAM_BASE}/cam_pol_ahm_14", "Genetec", "2024-09-01", "1080p", 0, "2026-09-05T08:00:00Z"),
    ("CAM-POL-AHM-15", "Bhilad Interstate Border Checkpost", "Police", "Valsad", 20.2798, 72.8850, "Online", f"{STREAM_BASE}/cam_pol_ahm_15", "ONVIF_NVR", "2024-09-10", "1080p", 1, "2026-09-05T08:00:00Z"),

    # 10 Transport (RTO) Cameras
    ("CAM-RTO-SUR-01", "Mehsana Highway Toll Checkpost SH-41", "Transport (RTO)", "Mehsana", 23.5412, 72.3920, "Online", f"{STREAM_BASE}/cam_rto_sur_01", "ONVIF_NVR", "2023-10-01", "1080p", 1, "2026-09-05T08:00:00Z"),
    ("CAM-RTO-SUR-02", "Bhilad RTO Modern Checkpost NH-48", "Transport (RTO)", "Valsad", 20.2850, 72.8910, "Online", f"{STREAM_BASE}/cam_rto_sur_02", "ONVIF_NVR", "2023-11-05", "1080p", 1, "2026-09-05T08:00:00Z"),
    ("CAM-RTO-SUR-03", "Shamlaji Interstate Border Checkpost", "Transport (RTO)", "Aravalli", 23.6845, 73.3852, "Online", f"{STREAM_BASE}/cam_rto_sur_03", "ONVIF_NVR", "2023-12-10", "1080p", 0, "2026-09-05T08:00:00Z"),
    ("CAM-RTO-SUR-04", "Samakhiali Toll Plaza Kutch Gateway", "Transport (RTO)", "Kutch", 23.3245, 70.4789, "Online", f"{STREAM_BASE}/cam_rto_sur_04", "ONVIF_NVR", "2024-01-20", "1080p", 1, "2026-09-05T08:00:00Z"),
    ("CAM-RTO-SUR-05", "Vadodara Golden Chokdi Weighbridge", "Transport (RTO)", "Vadodara", 22.3685, 73.2105, "Online", f"{STREAM_BASE}/cam_rto_sur_05", "ONVIF_NVR", "2024-02-15", "1080p", 0, "2026-09-05T08:00:00Z"),
    ("CAM-RTO-SUR-06", "Maliyasan Checkpost Rajkot-Ahmedabad Highway", "Transport (RTO)", "Rajkot", 22.3450, 70.8350, "Online", f"{STREAM_BASE}/cam_rto_sur_06", "ONVIF_NVR", "2024-03-05", "1080p", 1, "2026-09-05T08:00:00Z"),
    ("CAM-RTO-SUR-07", "Subhash Bridge RTO Ahmedabad Entry", "Transport (RTO)", "Ahmedabad", 23.0642, 72.5855, "Online", f"{STREAM_BASE}/cam_rto_sur_07", "Direct_IP", "2024-03-25", "1080p", 0, "2026-09-05T08:00:00Z"),
    ("CAM-RTO-SUR-08", "Kamrej Toll Gate NH-48", "Transport (RTO)", "Surat", 21.2715, 72.9555, "Online", f"{STREAM_BASE}/cam_rto_sur_08", "ONVIF_NVR", "2024-04-10", "1080p", 1, "2026-09-05T08:00:00Z"),
    ("CAM-RTO-SUR-09", "Tarapur Crossroads Weighbridge", "Transport (RTO)", "Anand", 22.4925, 72.6615, "Online", f"{STREAM_BASE}/cam_rto_sur_09", "ONVIF_NVR", "2024-05-15", "1080p", 0, "2026-09-05T08:00:00Z"),
    ("CAM-RTO-SUR-10", "Chhapi Interstate Border Checkpost", "Transport (RTO)", "Banaskantha", 23.9680, 72.3850, "Degraded", f"{STREAM_BASE}/cam_rto_sur_10", "Analog_DVR", "2022-05-10", "720p", 0, "2026-09-05T08:00:00Z"),

    # 8 GSRTC Cameras (Bus Stations & Corridors)
    ("CAM-GSRTC-VAD-01", "Gita Mandir Central Bus Terminal Platform A", "GSRTC", "Ahmedabad", 23.0112, 72.5938, "Online", f"{STREAM_BASE}/cam_gsrtc_vad_01", "Milestone", "2023-08-15", "1080p", 1, "2026-09-05T08:00:00Z"),
    ("CAM-GSRTC-VAD-02", "Central Bus Station Vadodara Departure Bay", "GSRTC", "Vadodara", 22.3125, 73.1818, "Online", f"{STREAM_BASE}/cam_gsrtc_vad_02", "Milestone", "2023-09-01", "1080p", 1, "2026-09-05T08:00:00Z"),
    ("CAM-GSRTC-VAD-03", "Rajkot Central Bus Station Entry Gate", "GSRTC", "Rajkot", 22.3020, 70.8045, "Online", f"{STREAM_BASE}/cam_gsrtc_vad_03", "Genetec", "2023-11-12", "1080p", 0, "2026-09-05T08:00:00Z"),
    ("CAM-GSRTC-VAD-04", "Surat Central GSRTC Bus Terminal", "GSRTC", "Surat", 21.2052, 72.8405, "Online", f"{STREAM_BASE}/cam_gsrtc_vad_04", "Milestone", "2023-12-05", "1080p", 1, "2026-09-05T08:00:00Z"),
    ("CAM-GSRTC-VAD-05", "Mehsana GSRTC Depot Main Gate", "GSRTC", "Mehsana", 23.5910, 72.3750, "Online", f"{STREAM_BASE}/cam_gsrtc_vad_05", "ONVIF_NVR", "2024-01-18", "1080p", 0, "2026-09-05T08:00:00Z"),
    ("CAM-GSRTC-VAD-06", "Bhavnagar ST Stand Perimeter", "GSRTC", "Bhavnagar", 21.7680, 72.1480, "Online", f"{STREAM_BASE}/cam_gsrtc_vad_06", "Direct_IP", "2024-02-28", "1080p", 0, "2026-09-05T08:00:00Z"),
    ("CAM-GSRTC-VAD-07", "Junagadh Depot Highway Exit", "GSRTC", "Junagadh", 21.5275, 70.4610, "Online", f"{STREAM_BASE}/cam_gsrtc_vad_07", "ONVIF_NVR", "2024-04-12", "1080p", 0, "2026-09-05T08:00:00Z"),
    ("CAM-GSRTC-VAD-08", "Gandhinagar Sector 11 GSRTC Bus Station", "GSRTC", "Gandhinagar", 23.2185, 72.6420, "Online", f"{STREAM_BASE}/cam_gsrtc_vad_08", "Milestone", "2024-05-20", "1080p", 1, "2026-09-05T08:00:00Z"),

    # 8 Municipal Corp Cameras (AMC, SMC, VMC Command Centers)
    ("CAM-AMC-AHM-01", "AMC Smart City Command Center Junction Riverfront East", "Municipal Corp", "Ahmedabad", 23.0315, 72.5802, "Online", f"{STREAM_BASE}/cam_amc_ahm_01", "Genetec", "2023-05-10", "4K", 1, "2026-09-05T08:00:00Z"),
    ("CAM-AMC-AHM-02", "Kankaria Lake Gate 3 Surveillance", "Municipal Corp", "Ahmedabad", 23.0062, 72.5995, "Online", f"{STREAM_BASE}/cam_amc_ahm_02", "Genetec", "2023-06-15", "1080p", 1, "2026-09-05T08:00:00Z"),
    ("CAM-AMC-AHM-03", "Shivranjani Crossroads BRTS Corridor", "Municipal Corp", "Ahmedabad", 23.0245, 72.5312, "Online", f"{STREAM_BASE}/cam_amc_ahm_03", "Genetec", "2023-07-22", "1080p", 0, "2026-09-05T08:00:00Z"),
    ("CAM-AMC-AHM-04", "Maninagar Railway Overbridge AMC Naka", "Municipal Corp", "Ahmedabad", 22.9985, 72.6050, "Online", f"{STREAM_BASE}/cam_amc_ahm_04", "Genetec", "2023-09-30", "1080p", 0, "2026-09-05T08:00:00Z"),
    ("CAM-AMC-AHM-05", "Surat Municipal Corp Muglisara Headquarters", "Municipal Corp", "Surat", 21.1985, 72.8290, "Online", f"{STREAM_BASE}/cam_amc_ahm_05", "Milestone", "2023-11-05", "1080p", 1, "2026-09-05T08:00:00Z"),
    ("CAM-AMC-AHM-06", "Dumas Road SMC Smart Traffic Junction", "Municipal Corp", "Surat", 21.1495, 72.7650, "Online", f"{STREAM_BASE}/cam_amc_ahm_06", "Genetec", "2024-01-12", "1080p", 1, "2026-09-05T08:00:00Z"),
    ("CAM-AMC-AHM-07", "Alkapuri Underpass VMC Surveillance", "Municipal Corp", "Vadodara", 22.3115, 73.1740, "Online", f"{STREAM_BASE}/cam_amc_ahm_07", "Milestone", "2024-02-14", "1080p", 0, "2026-09-05T08:00:00Z"),
    ("CAM-AMC-AHM-08", "Akota Dandia Bazaar Bridge VMC Cam", "Municipal Corp", "Vadodara", 22.2980, 73.1855, "Online", f"{STREAM_BASE}/cam_amc_ahm_08", "Genetec", "2024-03-20", "1080p", 1, "2026-09-05T08:00:00Z"),

    # 5 Health Cameras (Civil Hospitals)
    ("CAM-HLT-AHM-01", "Ahmedabad Civil Hospital Asarwa Emergency Gate", "Health", "Ahmedabad", 23.0535, 72.6025, "Online", f"{STREAM_BASE}/cam_hlt_ahm_01", "ONVIF_NVR", "2023-04-10", "1080p", 0, "2026-09-05T08:00:00Z"),
    ("CAM-HLT-AHM-02", "Sola Civil Hospital Main Ambulance Entrance", "Health", "Ahmedabad", 23.0850, 72.5290, "Online", f"{STREAM_BASE}/cam_hlt_ahm_02", "ONVIF_NVR", "2023-06-25", "1080p", 0, "2026-09-05T08:00:00Z"),
    ("CAM-HLT-AHM-03", "New Civil Hospital Surat Casualty Entry", "Health", "Surat", 21.1730, 72.8210, "Online", f"{STREAM_BASE}/cam_hlt_ahm_03", "Direct_IP", "2023-08-30", "1080p", 1, "2026-09-05T08:00:00Z"),
    ("CAM-HLT-AHM-04", "SSG Hospital Vadodara Trauma Center", "Health", "Vadodara", 22.3080, 73.1920, "Online", f"{STREAM_BASE}/cam_hlt_ahm_04", "ONVIF_NVR", "2023-10-18", "1080p", 0, "2026-09-05T08:00:00Z"),
    ("CAM-HLT-AHM-05", "PDU Medical College & Hospital Rajkot Gate 1", "Health", "Rajkot", 22.2985, 70.7990, "Offline", f"{STREAM_BASE}/cam_hlt_ahm_05", "Analog_DVR", "2022-02-14", "720p", 0, "2026-09-04T18:30:00Z"),

    # 4 Panchayat Cameras (Rural/Village Junctions)
    ("CAM-PAN-MEH-01", "Radhanpur Crossroads Mehsana Gram Panchayat Naka", "Panchayat", "Mehsana", 23.5980, 72.3780, "Online", f"{STREAM_BASE}/cam_pan_meh_01", "ONVIF_NVR", "2023-09-10", "1080p", 0, "2026-09-05T08:00:00Z"),
    ("CAM-PAN-MEH-02", "Sanand GIDC Rural Access Junction", "Panchayat", "Ahmedabad", 22.9850, 72.3790, "Online", f"{STREAM_BASE}/cam_pan_meh_02", "Direct_IP", "2023-11-25", "1080p", 0, "2026-09-05T08:00:00Z"),
    ("CAM-PAN-MEH-03", "Chhatral Industrial Highway Panchayat Post", "Panchayat", "Gandhinagar", 23.3250, 72.4350, "Online", f"{STREAM_BASE}/cam_pan_meh_03", "ONVIF_NVR", "2024-01-15", "1080p", 0, "2026-09-05T08:00:00Z"),
    ("CAM-PAN-MEH-04", "Gondal Rural By-Pass Highway Crossing", "Panchayat", "Rajkot", 21.9610, 70.7950, "Online", f"{STREAM_BASE}/cam_pan_meh_04", "Direct_IP", "2024-04-10", "1080p", 0, "2026-09-05T08:00:00Z"),
]

# -------------------------------------------------------------------------
# 2. VAHAN (25+ Vehicle Registry Records)
# -------------------------------------------------------------------------
VAHAN_DATA = [
    # Demo Suspect: Vikram Solanki
    ("GJ01ER8842", "Motor Car (LMV)", "Vikram Solanki", "MA1TA2MK8P008842", "K10BN884201", "2022-03-15", "Clean", 0, "FIR-892/2026/CRIME-BR"),
    
    # 3 Stolen Vehicles (stolen_flag=1 with linked FIRs)
    ("GJ05CX9988", "Motor Car (LMV)", "Amit Shah", "MA3ER4KK2M009988", "G12CD998811", "2021-08-20", "Clean", 1, "FIR-402/2026/SURAT-CR"),
    ("GJ01KZ1029", "Motor Cycle (2W)", "Rahul Prajapati", "MD6AA1BB8P001029", "BJ100102922", "2023-01-10", "Clean", 1, "FIR-155/2026/VASTR-PS"),
    ("GJ27BC4433", "Goods Carrier (HGV)", "Mukeshbhai Rabari", "MAT488001P004433", "6BT59443344", "2019-11-04", "Clean", 1, "FIR-789/2026/SOLA-PS"),

    # 3 Blacklisted Vehicles
    ("GJ03KJ4521", "Motor Car (LMV)", "Suresh Rathod", "MA1AB2CD3E004521", "D13A452100", "2020-05-12", "Blacklisted", 0, "FIR-301/2025/RJKT-PS"),
    ("GJ06MM8821", "Motor Car (LMV)", "Haresh Vaghela", "MA3EF4GH5I008821", "F8D882109", "2018-09-30", "Blacklisted", 0, None),
    ("GJ18BB7711", "Bus (PSV)", "Gujarat Tour Travels", "MAT366002M007711", "BS4771108", "2017-06-22", "Blacklisted", 0, None),

    # 2 with RTO Seizure Notice
    ("GJ27AA1100", "Motor Car (LMV)", "Ketan Patel", "MA1CD3EF4G001100", "K12M110055", "2022-10-18", "RTO Seizure Notice", 0, None),
    ("GJ05DF6622", "Auto Rickshaw (3W)", "Irfan Mansuri", "MD2BA3CD4N006622", "AR20662211", "2021-12-05", "RTO Seizure Notice", 0, None),

    # 17+ Clean Vehicles across Gujarat
    ("GJ01AB1234", "Motor Car (LMV)", "Rajesh Mehta", "MA1TA1MK1P001234", "K10BN123401", "2023-04-10", "Clean", 0, None),
    ("GJ01XY5678", "Motor Car (LMV)", "Priya Patel", "MA3ER2KK3M005678", "G12CD567811", "2022-07-15", "Clean", 0, None),
    ("GJ01JK9012", "Motor Cycle (2W)", "Neha Desai", "MD6AA2BB9P009012", "BJ100901222", "2024-01-20", "Clean", 0, None),
    ("GJ05MN3456", "Motor Car (LMV)", "Bhavesh Gondalia", "MA1CD4EF5G003456", "K12M345655", "2020-11-12", "Clean", 0, None),
    ("GJ05PQ7890", "Goods Carrier (LGV)", "Deepak Choksi", "MAT244003M007890", "4BT3789044", "2021-03-25", "Clean", 0, None),
    ("GJ03RS2345", "Motor Car (LMV)", "Dharmesh Jadeja", "MA3EF5GH6I002345", "F8D234509", "2019-08-14", "Clean", 0, None),
    ("GJ03TU6789", "Motor Cycle (2W)", "Mehul Vala", "MD2BA4CD5N006789", "AR20678911", "2023-09-05", "Clean", 0, None),
    ("GJ06VW0123", "Motor Car (LMV)", "Nitin Pandya", "MA1TA3MK9P000123", "K10BN012301", "2022-05-18", "Clean", 0, None),
    ("GJ06GH5566", "Motor Car (LMV)", "Jagdish Parmar", "MA3ER5KK4M005566", "G12CD556611", "2021-04-30", "Clean", 0, "FIR-102/2026/VAD-CR"),
    ("GJ18ZA4567", "Motor Car (LMV)", "Hitesh Joshi", "MD6AA3BB1P004567", "BJ100456722", "2024-02-10", "Clean", 0, None),
    ("GJ18CD8901", "Motor Cycle (2W)", "Alpa Trivedi", "MAT122004M008901", "BS4890108", "2020-12-01", "Clean", 0, None),
    ("GJ02EF2345", "Motor Car (LMV)", "Pravin Barot", "MA1CD5EF6G002345", "K12M234555", "2023-06-18", "Clean", 0, None),
    ("GJ04GH6789", "Goods Carrier (HGV)", "Saurashtra Logistics", "MAT588005P006789", "6BT59678944", "2018-07-22", "Clean", 0, None),
    ("GJ10JK0123", "Motor Car (LMV)", "Chetan Sanghavi", "MA3EF6GH7I000123", "F8D012309", "2021-10-15", "Clean", 0, None),
    ("GJ12LM4567", "Motor Cycle (2W)", "Jignesh Ahir", "MD2BA5CD6N004567", "AR20456711", "2022-08-08", "Clean", 0, None),
    ("GJ15NO8901", "Motor Car (LMV)", "Sunil Tandel", "MA1TA4MK0P008901", "K10BN890101", "2023-11-19", "Clean", 0, None),
    ("GJ21PQ2345", "Motor Car (LMV)", "Mahesh Solanki", "MA3ER6KK5M002345", "G12CD234511", "2020-02-28", "Clean", 0, None),
    ("GJ09RS6789", "Motor Cycle (2W)", "Girish Chaudhari", "MD6AA4BB2P006789", "BJ100678922", "2024-03-01", "Clean", 0, None),
]

# -------------------------------------------------------------------------
# 3. SARTHI (15+ Driving License Registry Records)
# -------------------------------------------------------------------------
SARTHI_DATA = [
    # Vikram Solanki - Suspended License linked to GJ01ER8842
    ("GJ0120180098421", "Vikram Solanki", sha256_text("AADHAAR-8921-SOLANKI"), "Suspended", "GJ01ER8842", "SUSP-GJ-2026-0892"),
    
    # 2 More Suspended
    ("GJ0520190011223", "Naresh Bharwad", sha256_text("AADHAAR-1122-BHARWAD"), "Suspended", "GJ05CX9988", "SUSP-GJ-2026-0402"),
    ("GJ0620170044556", "Jagdish Parmar", sha256_text("AADHAAR-4455-PARMAR"), "Suspended", "GJ06GH5566", "SUSP-GJ-2026-0102"),

    # 2 Disqualified
    ("GJ0320150077889", "Suresh Rathod", sha256_text("AADHAAR-7788-RATHOD"), "Disqualified", "GJ03KJ4521", "SUSP-GJ-2025-0301"),
    ("GJ1820140033445", "Raju Koli", sha256_text("AADHAAR-3344-KOLI"), "Disqualified", "GJ18BB7711", "SUSP-GJ-2025-0099"),

    # 10 Active Clean Drivers
    ("GJ0120150001234", "Rajesh Mehta", sha256_text("AADHAAR-0123-MEHTA"), "Active", "GJ01AB1234", None),
    ("GJ0120160005678", "Priya Patel", sha256_text("AADHAAR-0567-PATEL"), "Active", "GJ01XY5678", None),
    ("GJ0120200009012", "Neha Desai", sha256_text("AADHAAR-0901-DESAI"), "Active", "GJ01JK9012", None),
    ("GJ0520180003456", "Bhavesh Gondalia", sha256_text("AADHAAR-0345-GONDALIA"), "Active", "GJ05MN3456", None),
    ("GJ0520190007890", "Deepak Choksi", sha256_text("AADHAAR-0789-CHOKSI"), "Active", "GJ05PQ7890", None),
    ("GJ0320170002345", "Dharmesh Jadeja", sha256_text("AADHAAR-0234-JADEJA"), "Active", "GJ03RS2345", None),
    ("GJ0620160000123", "Nitin Pandya", sha256_text("AADHAAR-0001-PANDYA"), "Active", "GJ06VW0123", None),
    ("GJ2720210001100", "Ketan Patel", sha256_text("AADHAAR-0011-PATEL"), "Active", "GJ27AA1100", None),
    ("GJ1820220004567", "Hitesh Joshi", sha256_text("AADHAAR-0045-JOSHI"), "Active", "GJ18ZA4567", None),
    ("GJ0220190002345", "Pravin Barot", sha256_text("AADHAAR-0023-BAROT"), "Active", "GJ02EF2345", None),
]

# -------------------------------------------------------------------------
# 4. eGujCop (20+ Gujarat Police CCTNS FIRs & Wanted Records)
# -------------------------------------------------------------------------
EGUJCOP_DATA = [
    # Demo Core Suspect: Vikram Solanki
    ("FIR-892/2026/CRIME-BR", "Navrangpura PS", "Ahmedabad City", "Armed Robbery", "Vikram Solanki", "Vicky Langdo", "Absconding", "GJ01ER8842", 0, 0, "CRITICAL"),
    
    # 4 Other Absconding Criminals
    ("FIR-402/2026/SURAT-CR", "Varachha PS", "Surat City", "Vehicle Theft & Extortion", "Naresh Bharwad", "Lala", "Absconding", "GJ05CX9988", 0, 0, "CRITICAL"),
    ("FIR-512/2026/MEH-CR", "Mehsana City 'A' Division PS", "Mehsana", "Highway Hijacking", "Bhikha Thakor", "Bhikhu Don", "Absconding", "GJ02EF2345", 0, 0, "CRITICAL"),
    ("FIR-623/2026/RJKT-CR", "Bhaktinagar PS", "Rajkot City", "Extortion & Arms Act", "Montu Jadeja", "Montu Darbar", "Absconding", "GJ03RS2345", 0, 0, "HIGH"),
    ("FIR-744/2026/VAD-CR", "Raopura PS", "Vadodara City", "Narcotics Smuggling (NDPS)", "Salim Shaikh", "Salim Langdo", "Absconding", "GJ06VW0123", 0, 0, "CRITICAL"),

    # 3 Active Warrants
    ("FIR-102/2026/VAD-CR", "Makarpura PS", "Vadodara City", "Financial Fraud & Forgery", "Jagdish Parmar", "JP", "Active Warrant", "GJ06GH5566", 0, 0, "HIGH"),
    ("FIR-301/2025/RJKT-PS", "Gandhigram PS", "Rajkot City", "Assault on Public Servant", "Suresh Rathod", "Suriyo", "Arrested", "GJ03KJ4521", 0, 0, "HIGH"),
    ("FIR-155/2026/VASTR-PS", "Vastrapur PS", "Ahmedabad City", "Vehicle Theft", "Gopal Rabari", "Gopu", "Active Warrant", "GJ01KZ1029", 0, 0, "HIGH"),

    # 2 Missing Persons
    ("FIR-901/2026/SATELLITE-PS", "Satellite PS", "Ahmedabad City", "Missing Person Inquiry", "Manish Shah", None, "Surrendered", None, 1, 0, "MEDIUM"),
    ("FIR-914/2026/GANDHI-PS", "Sector 7 PS", "Gandhinagar", "Missing Girl Child Trace", "Roshni Patel", None, "Surrendered", None, 1, 0, "HIGH"),

    # 1 Unidentified Body
    ("FIR-999/2026/SOLA-PS", "Sola PS", "Ahmedabad City", "Unidentified Deceased Found", "Unknown Male Approx 35 Yrs", None, "Surrendered", None, 0, 1, "MEDIUM"),

    # Additional FIRs for realistic statewide coverage
    ("FIR-789/2026/SOLA-PS", "Sola PS", "Ahmedabad City", "Commercial Vehicle Theft", "Mukeshbhai Rabari", "Muko", "Active Warrant", "GJ27BC4433", 0, 0, "HIGH"),
    ("FIR-210/2026/ELLIS-PS", "Ellisbridge PS", "Ahmedabad City", "Cyber Financial Crime", "Alok Srivastava", "Bunty", "Surrendered", None, 0, 0, "LOW"),
    ("FIR-315/2026/DCB-AHM", "Crime Branch Ahmedabad", "Ahmedabad City", "Organized Crime Gang (GUJCTOC)", "Kalpesh Rawal", "Kaliya", "Arrested", None, 0, 0, "CRITICAL"),
    ("FIR-440/2026/KATAR-PS", "Katargam PS", "Surat City", "Diamond Theft Conspiracy", "Dinesh Gevariya", "Dino", "Arrested", None, 0, 0, "MEDIUM"),
    ("FIR-550/2026/ANKL-PS", "Ankleshwar Rural PS", "Bharuch", "Chemical Cargo Hijacking", "Raju Chauhan", "Chauhan Bhai", "Absconding", None, 0, 0, "HIGH"),
    ("FIR-660/2026/BHAV-PS", "Nilambaug PS", "Bhavnagar", "Counterfeiting Currency", "Yusuf Memon", "Chacha", "Active Warrant", None, 0, 0, "HIGH"),
    ("FIR-770/2026/JUNAG-PS", "B Division PS", "Junagadh", "Illegal Sand Mining", "Bhavsinh Mori", "Mori Bapu", "Surrendered", None, 0, 0, "LOW"),
    ("FIR-880/2026/ANAND-PS", "Vidyanagar PS", "Anand", "Student Campus Rioting", "Tejas Vaghela", "TJ", "Surrendered", None, 0, 0, "LOW"),
    ("FIR-990/2026/VALSAD-PS", "Valsad Town PS", "Valsad", "Illicit Liquor Smuggling (Prohibition)", "Kanu Patel", "Kanu Daman", "Arrested", None, 0, 0, "MEDIUM"),
]

# -------------------------------------------------------------------------
# 5. AFIS (10+ State Fingerprint Bureau Records)
# -------------------------------------------------------------------------
AFIS_DATA = [
    # Linked to Vikram Solanki (FIR-892/2026/CRIME-BR)
    ("AFIS-GJ-2026-004512", "FIR-892/2026/CRIME-BR", 0.98, "Vikram Solanki", "Prior conviction under IPC 392/397 (Robbery); escaped transit remand Gujarat Police 2025"),
    
    # Other linked suspects
    ("AFIS-GJ-2026-003891", "FIR-402/2026/SURAT-CR", 0.95, "Naresh Bharwad", "Arrested Surat 2023 for auto theft; history of forged documents"),
    ("AFIS-GJ-2026-002104", "FIR-512/2026/MEH-CR", 0.91, "Bhikha Thakor", "Arrested 2022 Patan highway extortion; 4 prior bookings"),
    ("AFIS-GJ-2026-007823", "FIR-623/2026/RJKT-CR", 0.93, "Montu Jadeja", "Active trial in Rajkot sessions court; history of unlawful assembly and arms cache"),
    ("AFIS-GJ-2026-009144", "FIR-744/2026/VAD-CR", 0.89, "Salim Shaikh", "History of interstate NDPS distribution between MP and Gujarat"),
    ("AFIS-GJ-2026-001255", "FIR-102/2026/VAD-CR", 0.87, "Jagdish Parmar", "Booked 2024 for shell company GST evasion and identity impersonation"),
    ("AFIS-GJ-2026-005677", "FIR-301/2025/RJKT-PS", 0.94, "Suresh Rathod", "Convicted 2021 for rioting; suspended sentence breached"),
    ("AFIS-GJ-2026-006788", "FIR-155/2026/VASTR-PS", 0.92, "Gopal Rabari", "Three prior counts of two-wheeler lifting in Ahmedabad Western suburbs"),
    ("AFIS-GJ-2026-008901", "FIR-789/2026/SOLA-PS", 0.88, "Mukeshbhai Rabari", "Suspect in commercial truck engine tampering racket"),
    ("AFIS-GJ-2026-003412", "FIR-315/2026/DCB-AHM", 0.99, "Kalpesh Rawal", "High-profile syndicate lieutenant booked under GUJCTOC 2026"),
]

# -------------------------------------------------------------------------
# 6. NAFIS (5+ NCRB National Biometric & Interstate Records)
# -------------------------------------------------------------------------
NAFIS_DATA = [
    # Linked to Vikram Solanki via AFIS-GJ-2026-004512
    ("NFN-2026-9948123", "AFIS-GJ-2026-004512", "Wanted in Rajasthan (FIR 104/2024 Abu Road PS - Armed Bank Transit Heist); Maharashtra MCOCA Surveillance Target", 1, "NCRB Red Notice Active"),
    
    # 4 Other Interstate Records
    ("NFN-2025-4481029", "AFIS-GJ-2026-003891", "Interstate vehicle disposal ring active across Gujarat, MP, and Maharashtra", 1, "NCRB Inter-State Coordination Notice"),
    ("NFN-2024-8819033", "AFIS-GJ-2026-009144", "Narcotics Control Bureau (NCB) multi-state tracking list (Goa-MP-Gujarat corridor)", 1, "Federal Lookout Circular Active"),
    ("NFN-2025-1102948", "AFIS-GJ-2026-003412", "Arms trafficking syndicate spanning MP-Gujarat-Rajasthan border", 1, "CBI Special Crime Alert"),
    ("NFN-2026-3391084", "AFIS-GJ-2026-002104", "Interstate highway cargo robbery cases registered in Barmer (Rajasthan)", 1, "Active Interstate Warrant"),
]

# -------------------------------------------------------------------------
# 7. SIGHTINGS (15+ Pre-seeded verified historical sightings)
# Core Test Case: GJ01ER8842 tracked along Ahmedabad -> Mehsana -> Rajkot
# -------------------------------------------------------------------------
SIGHTINGS_DATA = [
    # === GJ01ER8842 (Vikram Solanki - The Core Jury Journey) ===
    # 1. Ahmedabad: Iskcon Junction SG Highway
    (
        "a1b2c3d4-e5f6-4a1b-8c2d-000000000001",
        "CAM-POL-AHM-01",
        "SG Highway Iskcon Junction",
        "Police",
        "GJ01ER8842",
        100250,
        "2026-09-05T08:15:00Z",
        23.0275,
        72.5074,
        0.98,
        "N",
        "/snapshots/GJ01ER8842_CAM-POL-AHM-01_100250.jpg",
        sha256_text("GJ01ER8842_081500"),
        1,
        "FIR-892/2026/CRIME-BR",
        "2026-09-05T08:15:02Z",
    ),
    # 2. Ahmedabad: Vaishnodevi Circle SG Highway
    (
        "a1b2c3d4-e5f6-4a1b-8c2d-000000000002",
        "CAM-POL-AHM-02",
        "Vaishnodevi Circle SG Highway",
        "Police",
        "GJ01ER8842",
        101870,
        "2026-09-05T08:42:00Z",
        23.1188,
        72.5441,
        0.97,
        "N",
        "/snapshots/GJ01ER8842_CAM-POL-AHM-02_101870.jpg",
        sha256_text("GJ01ER8842_084200"),
        1,
        "FIR-892/2026/CRIME-BR",
        "2026-09-05T08:42:02Z",
    ),
    # 3. Mehsana: Toll Plaza SH-41
    (
        "a1b2c3d4-e5f6-4a1b-8c2d-000000000003",
        "CAM-RTO-SUR-01",
        "Mehsana Highway Toll Checkpost SH-41",
        "Transport (RTO)",
        "GJ01ER8842",
        105050,
        "2026-09-05T09:35:00Z",
        23.5412,
        72.3920,
        0.96,
        "NW",
        "/snapshots/GJ01ER8842_CAM-RTO-SUR-01_105050.jpg",
        sha256_text("GJ01ER8842_093500"),
        1,
        "FIR-892/2026/CRIME-BR",
        "2026-09-05T09:35:03Z",
    ),
    # 4. Mehsana: Radhanpur Cross Road
    (
        "a1b2c3d4-e5f6-4a1b-8c2d-000000000004",
        "CAM-PAN-MEH-01",
        "Radhanpur Crossroads Mehsana Gram Panchayat Naka",
        "Panchayat",
        "GJ01ER8842",
        106850,
        "2026-09-05T10:05:00Z",
        23.5980,
        72.3780,
        0.95,
        "W",
        "/snapshots/GJ01ER8842_CAM-PAN-MEH-01_106850.jpg",
        sha256_text("GJ01ER8842_100500"),
        1,
        "FIR-892/2026/CRIME-BR",
        "2026-09-05T10:05:02Z",
    ),
    # 5. Surendranagar: State Highway Junction
    (
        "a1b2c3d4-e5f6-4a1b-8c2d-000000000005",
        "CAM-POL-AHM-08",
        "Surendranagar State Highway Junction",
        "Police",
        "GJ01ER8842",
        112850,
        "2026-09-05T11:45:00Z",
        22.7210,
        71.6420,
        0.99,
        "SW",
        "/snapshots/GJ01ER8842_CAM-POL-AHM-08_112850.jpg",
        sha256_text("GJ01ER8842_114500"),
        1,
        "FIR-892/2026/CRIME-BR",
        "2026-09-05T11:45:02Z",
    ),
    # 6. Rajkot Entry: Maliyasan Checkpost
    (
        "a1b2c3d4-e5f6-4a1b-8c2d-000000000006",
        "CAM-RTO-SUR-06",
        "Maliyasan Checkpost Rajkot-Ahmedabad Highway",
        "Transport (RTO)",
        "GJ01ER8842",
        117950,
        "2026-09-05T13:10:00Z",
        22.3450,
        70.8350,
        0.97,
        "SW",
        "/snapshots/GJ01ER8842_CAM-RTO-SUR-06_117950.jpg",
        sha256_text("GJ01ER8842_131000"),
        1,
        "FIR-892/2026/CRIME-BR",
        "2026-09-05T13:10:02Z",
    ),
    # 7. Rajkot City: Madhapar Chowkadi
    (
        "a1b2c3d4-e5f6-4a1b-8c2d-000000000007",
        "CAM-POL-AHM-09",
        "Madhapar Chowkadi Rajkot City Entry",
        "Police",
        "GJ01ER8842",
        119750,
        "2026-09-05T13:40:00Z",
        22.3120,
        70.7850,
        0.98,
        "S",
        "/snapshots/GJ01ER8842_CAM-POL-AHM-09_119750.jpg",
        sha256_text("GJ01ER8842_134000"),
        1,
        "FIR-892/2026/CRIME-BR",
        "2026-09-05T13:40:02Z",
    ),

    # === GJ05CX9988 (Stolen in Surat) ===
    (
        "b2c3d4e5-f6a1-4b2c-8d3e-000000000008",
        "CAM-POL-AHM-11",
        "Varachha Main Road Ring Junction",
        "Police",
        "GJ05CX9988",
        88200,
        "2026-09-05T07:20:00Z",
        21.2144,
        72.8596,
        0.96,
        "SW",
        "/snapshots/GJ05CX9988_CAM-POL-AHM-11_88200.jpg",
        sha256_text("GJ05CX9988_072000"),
        1,
        "FIR-402/2026/SURAT-CR",
        "2026-09-05T07:20:02Z",
    ),
    (
        "b2c3d4e5-f6a1-4b2c-8d3e-000000000009",
        "CAM-POL-AHM-12",
        "Athwa Gate Police Chawki",
        "Police",
        "GJ05CX9988",
        91500,
        "2026-09-05T07:55:00Z",
        21.1824,
        72.8122,
        0.95,
        "W",
        "/snapshots/GJ05CX9988_CAM-POL-AHM-12_91500.jpg",
        sha256_text("GJ05CX9988_075500"),
        1,
        "FIR-402/2026/SURAT-CR",
        "2026-09-05T07:55:02Z",
    ),
    (
        "b2c3d4e5-f6a1-4b2c-8d3e-000000000010",
        "CAM-AMC-AHM-06",
        "Dumas Road SMC Smart Traffic Junction",
        "Municipal Corp",
        "GJ05CX9988",
        95400,
        "2026-09-05T08:35:00Z",
        21.1495,
        72.7650,
        0.97,
        "S",
        "/snapshots/GJ05CX9988_CAM-AMC-AHM-06_95400.jpg",
        sha256_text("GJ05CX9988_083500"),
        1,
        "FIR-402/2026/SURAT-CR",
        "2026-09-05T08:35:02Z",
    ),

    # === GJ03KJ4521 (Blacklisted & Disqualified License) ===
    (
        "c3d4e5f6-a1b2-4c3d-8e4f-000000000011",
        "CAM-POL-AHM-10",
        "Trikon Baug Traffic Intersection",
        "Police",
        "GJ03KJ4521",
        72000,
        "2026-09-05T06:10:00Z",
        22.3015,
        70.8032,
        0.94,
        "E",
        "/snapshots/GJ03KJ4521_CAM-POL-AHM-10_72000.jpg",
        sha256_text("GJ03KJ4521_061000"),
        1,
        "FIR-301/2025/RJKT-PS",
        "2026-09-05T06:10:02Z",
    ),
    (
        "c3d4e5f6-a1b2-4c3d-8e4f-000000000012",
        "CAM-GSRTC-VAD-03",
        "Rajkot Central Bus Station Entry Gate",
        "GSRTC",
        "GJ03KJ4521",
        75600,
        "2026-09-05T06:45:00Z",
        22.3020,
        70.8045,
        0.93,
        "NE",
        "/snapshots/GJ03KJ4521_CAM-GSRTC-VAD-03_75600.jpg",
        sha256_text("GJ03KJ4521_064500"),
        1,
        "FIR-301/2025/RJKT-PS",
        "2026-09-05T06:45:02Z",
    ),

    # === GJ01AB1234 (Clean Regular Vehicle) ===
    (
        "d4e5f6a1-b2c3-4d4e-8f5a-000000000013",
        "CAM-POL-AHM-03",
        "Nehrunagar Cross Road Satellite",
        "Police",
        "GJ01AB1234",
        80100,
        "2026-09-05T07:30:00Z",
        23.0238,
        72.5358,
        0.99,
        "E",
        "/snapshots/GJ01AB1234_CAM-POL-AHM-03_80100.jpg",
        sha256_text("GJ01AB1234_073000"),
        0,
        None,
        "2026-09-05T07:30:02Z",
    ),
    (
        "d4e5f6a1-b2c3-4d4e-8f5a-000000000014",
        "CAM-POL-AHM-07",
        "C.G. Road Swastik Cross Road",
        "Police",
        "GJ01AB1234",
        81900,
        "2026-09-05T07:50:00Z",
        23.0335,
        72.5564,
        0.98,
        "NE",
        "/snapshots/GJ01AB1234_CAM-POL-AHM-07_81900.jpg",
        sha256_text("GJ01AB1234_075000"),
        0,
        None,
        "2026-09-05T07:50:02Z",
    ),
    (
        "d4e5f6a1-b2c3-4d4e-8f5a-000000000015",
        "CAM-AMC-AHM-01",
        "AMC Smart City Command Center Junction Riverfront East",
        "Municipal Corp",
        "GJ01AB1234",
        83400,
        "2026-09-05T08:05:00Z",
        23.0315,
        72.5802,
        0.97,
        "SE",
        "/snapshots/GJ01AB1234_CAM-AMC-AHM-01_83400.jpg",
        sha256_text("GJ01AB1234_080500"),
        0,
        None,
        "2026-09-05T08:05:02Z",
    ),
    (
        "d4e5f6a1-b2c3-4d4e-8f5a-000000000016",
        "CAM-AMC-AHM-02",
        "Kankaria Lake Gate 3 Surveillance",
        "Municipal Corp",
        "GJ01AB1234",
        85200,
        "2026-09-05T08:25:00Z",
        23.0062,
        72.5995,
        0.96,
        "S",
        "/snapshots/GJ01AB1234_CAM-AMC-AHM-02_85200.jpg",
        sha256_text("GJ01AB1234_082500"),
        0,
        None,
        "2026-09-05T08:25:02Z",
    ),

    # === GJ27AA1100 (RTO Seizure Notice) ===
    (
        "e5f6a1b2-c3d4-4e5f-8a6b-000000000017",
        "CAM-POL-AHM-14",
        "Sector 11 CHH Road Intersection",
        "Police",
        "GJ27AA1100",
        92000,
        "2026-09-05T09:10:00Z",
        23.2230,
        72.6515,
        0.97,
        "N",
        "/snapshots/GJ27AA1100_CAM-POL-AHM-14_92000.jpg",
        sha256_text("GJ27AA1100_091000"),
        1,
        None,
        "2026-09-05T09:10:02Z",
    ),
    (
        "e5f6a1b2-c3d4-4e5f-8a6b-000000000018",
        "CAM-GSRTC-VAD-08",
        "Gandhinagar Sector 11 GSRTC Bus Station",
        "GSRTC",
        "GJ27AA1100",
        93800,
        "2026-09-05T09:30:00Z",
        23.2185,
        72.6420,
        0.95,
        "W",
        "/snapshots/GJ27AA1100_CAM-GSRTC-VAD-08_93800.jpg",
        sha256_text("GJ27AA1100_093000"),
        1,
        None,
        "2026-09-05T09:30:02Z",
    ),

    # === GJ06GH5566 (Active Warrant) ===
    (
        "f6a1b2c3-d4e5-4f6a-8b7c-000000000019",
        "CAM-POL-AHM-13",
        "Sayajigunj Police Chowki Vadodara",
        "Police",
        "GJ06GH5566",
        97000,
        "2026-09-05T10:15:00Z",
        22.3105,
        73.1810,
        0.98,
        "E",
        "/snapshots/GJ06GH5566_CAM-POL-AHM-13_97000.jpg",
        sha256_text("GJ06GH5566_101500"),
        1,
        "FIR-102/2026/VAD-CR",
        "2026-09-05T10:15:02Z",
    ),
    (
        "f6a1b2c3-d4e5-4f6a-8b7c-000000000020",
        "CAM-AMC-AHM-07",
        "Alkapuri Underpass VMC Surveillance",
        "Municipal Corp",
        "GJ06GH5566",
        99400,
        "2026-09-05T10:40:00Z",
        22.3115,
        73.1740,
        0.96,
        "W",
        "/snapshots/GJ06GH5566_CAM-AMC-AHM-07_99400.jpg",
        sha256_text("GJ06GH5566_104000"),
        1,
        "FIR-102/2026/VAD-CR",
        "2026-09-05T10:40:02Z",
    ),
]


async def seed_database(db_path: str = None) -> None:
    """Populate database with complete, verified Gujarat mock data."""
    target_path = db_path or settings.DB_PATH
    os.makedirs(os.path.dirname(os.path.abspath(target_path)), exist_ok=True)

    async with aiosqlite.connect(target_path) as db:
        # Check if already seeded
        async with db.execute("SELECT COUNT(*) FROM cameras") as cur:
            count = (await cur.fetchone())[0]
            if count >= len(CAMERAS_DATA):
                return

        # 1. Seed Cameras
        await db.executemany(
            """
            INSERT OR REPLACE INTO cameras (
                camera_id, camera_name, department, district, lat, lng,
                status, stream_url, vms_vendor, installed_date, resolution,
                ptz_capable, last_health_check
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            CAMERAS_DATA,
        )

        # 2. Seed VAHAN
        await db.executemany(
            """
            INSERT OR REPLACE INTO vahan (
                plate_number, vehicle_class, owner_name, chassis_number,
                engine_number, registration_date, blacklist_status,
                stolen_flag, linked_fir
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            VAHAN_DATA,
        )

        # 3. Seed SARTHI
        await db.executemany(
            """
            INSERT OR REPLACE INTO sarthi (
                dl_number, driver_name, linked_aadhaar_hash,
                license_status, linked_plate, suspect_link_id
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            SARTHI_DATA,
        )

        # 4. Seed eGujCop
        await db.executemany(
            """
            INSERT OR REPLACE INTO egujcop (
                fir_number, police_station, district, crime_head,
                accused_name, alias, wanted_status, linked_plate,
                missing_person_flag, unidentified_body_flag, threat_priority
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            EGUJCOP_DATA,
        )

        # 5. Seed AFIS
        await db.executemany(
            """
            INSERT OR REPLACE INTO afis (
                state_afis_id, linked_fir, biometric_match_confidence,
                suspect_name, arrest_record
            ) VALUES (?, ?, ?, ?, ?)
            """,
            AFIS_DATA,
        )

        # 6. Seed NAFIS
        await db.executemany(
            """
            INSERT OR REPLACE INTO nafis (
                national_fingerprint_number, state_afis_id,
                interstate_crime_record, cross_jurisdiction_flag,
                federal_linking_status
            ) VALUES (?, ?, ?, ?, ?)
            """,
            NAFIS_DATA,
        )

        # 7. Seed Sightings
        await db.executemany(
            """
            INSERT OR REPLACE INTO sightings (
                sighting_id, camera_id, camera_name, department,
                plate_number, pts_timestamp_ms, timestamp_iso, lat, lng,
                confidence, direction_of_travel, snapshot_url,
                snapshot_hash_sha256, watchlist_match_flag, associated_fir,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            SIGHTINGS_DATA,
        )

        await db.commit()


if __name__ == "__main__":
    import asyncio
    asyncio.run(seed_database())
