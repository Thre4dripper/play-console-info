import os
import sys
import json
import argparse
import time
import io
from typing import Dict, Any, List, Optional, Tuple


class Log:
    @staticmethod
    def progress(msg: str):
        print(f"[PROGRESS] {msg}", file=sys.stderr, flush=True)

    @staticmethod
    def error(msg: str):
        print(f"[ERROR] {msg}", file=sys.stderr, flush=True)

    @staticmethod
    def debug(msg: str):
        print(f"[DEBUG] {msg}", file=sys.stderr, flush=True)

    @staticmethod
    def info(msg: str):
        print(f"[INFO] {msg}", file=sys.stderr, flush=True)

    @staticmethod
    def output(msg: str = ""):
        print(msg, file=sys.stdout, flush=True)


# --- Force UTF-8 output on all platforms (esp. Windows CMD/PowerShell) ---
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace", line_buffering=True)
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace", line_buffering=True)

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

SCOPES = ["https://www.googleapis.com/auth/androidpublisher"]


def build_service(creds_path: str) -> Any:
    if not creds_path or not os.path.exists(creds_path):
        raise SystemExit(f"Missing or invalid credentials file path: {creds_path}")
    credentials = service_account.Credentials.from_service_account_file(
        creds_path, scopes=SCOPES
    )
    return build("androidpublisher", "v3", credentials=credentials)


def with_edit(service, package_name: str):
    edits = service.edits()
    result = edits.insert(body={}, packageName=package_name).execute()
    return edits, result["id"]


def fetch_tracks(service, package_name: str) -> Dict[str, Any]:
    edits, edit_id = with_edit(service, package_name)
    return edits.tracks().list(packageName=package_name, editId=edit_id).execute()


def fetch_apks(service, package_name: str) -> Dict[str, Any]:
    edits, edit_id = with_edit(service, package_name)
    return edits.apks().list(packageName=package_name, editId=edit_id).execute()


def fetch_bundles(service, package_name: str) -> Dict[str, Any]:
    edits, edit_id = with_edit(service, package_name)
    return edits.bundles().list(packageName=package_name, editId=edit_id).execute()


def fetch_listings(service, package_name: str) -> Dict[str, Any]:
    edits, edit_id = with_edit(service, package_name)
    return edits.listings().list(packageName=package_name, editId=edit_id).execute()


def fetch_images(service, package_name: str, language: Optional[str], image_type: Optional[str]) -> Dict[str, Any]:
    if not language or not image_type:
        return {"images": []}
    edits, edit_id = with_edit(service, package_name)
    return (
        edits.images()
        .list(
            packageName=package_name, editId=edit_id, language=language, imageType=image_type
        )
        .execute()
    )


def fetch_inapps(service, package_name: str) -> Dict[str, Any]:
    return service.inappproducts().list(packageName=package_name, maxResults=1000).execute()


def fetch_reviews(service, package_name: str, pages: int, page_size: int) -> Dict[str, Any]:
    reviews: List[Dict[str, Any]] = []
    token = None
    for page in range(pages):
        Log.progress(f"Fetching reviews page {page + 1}/{pages}...")
        params = {"packageName": package_name, "maxResults": page_size}
        if token:
            params["token"] = token
        resp = service.reviews().list(**params).execute()
        reviews.extend(resp.get("reviews", []))
        token = resp.get("tokenPagination", {}).get("nextPageToken")
        if not token:
            Log.progress(f"Completed early at page {page + 1} (no more data)")
            break
        time.sleep(0.2)
    return {"count": len(reviews), "reviews": reviews}


def fetch_voided_purchases(service, package_name: str, pages: int, page_size: int) -> Dict[str, Any]:
    items: List[Dict[str, Any]] = []
    token = None
    for page in range(pages):
        Log.progress(f"Fetching voided purchases page {page + 1}/{pages}...")
        params = {"packageName": package_name, "maxResults": page_size}
        if token:
            params["token"] = token
        resp = (
            service.purchases().voidedpurchases().list(**params).execute()
        )
        items.extend(resp.get("voidedPurchases", []))
        token = resp.get("tokenPagination", {}).get("nextPageToken")
        if not token:
            Log.progress(f"Completed early at page {page + 1} (no more data)")
            break
        time.sleep(0.2)
    return {"count": len(items), "voidedPurchases": items}


def fetch_testers(service, package_name: str, track: Optional[str]) -> Dict[str, Any]:
    if not track:
        return {"googleGroups": []}
    edits, edit_id = with_edit(service, package_name)
    return (
        edits.testers().get(packageName=package_name, editId=edit_id, track=track).execute()
    )


def fetch_testers_all(service, package_name: str) -> Dict[str, Any]:
    edits, edit_id = with_edit(service, package_name)
    tracks = ["internal", "alpha", "beta", "production"]
    out: Dict[str, Any] = {"tracks": {}}
    for t in tracks:
        try:
            data = (
                edits.testers().get(packageName=package_name, editId=edit_id, track=t).execute()
            )
            out["tracks"][t] = data
        except HttpError:
            out["tracks"][t] = {"googleGroups": []}
    return out


def fetch_app_details(service, package_name: str) -> Dict[str, Any]:
    edits, edit_id = with_edit(service, package_name)
    return (
        edits.details().get(packageName=package_name, editId=edit_id).execute()
    )


def fetch_expansion_files(service, package_name: str) -> Dict[str, Any]:
    # For each APK version code, attempt to fetch main/patch expansion files if present
    edits, edit_id = with_edit(service, package_name)
    apks = edits.apks().list(packageName=package_name, editId=edit_id).execute().get("apks", [])
    types = ["main", "patch"]
    results: Dict[str, Any] = {"apks": {}}
    for apk in apks:
        vc = apk.get("versionCode")
        vc_key = str(vc)
        results["apks"][vc_key] = {}
        for t in types:
            try:
                data = (
                    edits.expansionfiles()
                    .get(
                        packageName=package_name,
                        editId=edit_id,
                        apkVersionCode=vc,
                        expansionFileType=t,
                    )
                    .execute()
                )
                results["apks"][vc_key][t] = data
            except HttpError:
                results["apks"][vc_key][t] = None
    return results


def positive_int(value):
    """Custom argparse type for positive integers."""
    try:
        ivalue = int(value)
        if ivalue <= 0:
            raise argparse.ArgumentTypeError(f"'{value}' must be a positive integer")
        return ivalue
    except ValueError:
        raise argparse.ArgumentTypeError(f"'{value}' is not a valid integer")


def validate_comma_separated_or_all(value: str, arg_name: str) -> None:
    """Validate that value is either 'all' or a comma-separated list."""
    if not value or not value.strip():
        raise SystemExit(f"--{arg_name} requires a non-empty value")
    
    trimmed = value.strip()
    if trimmed.lower() == "all":
        return  # 'all' is valid
    
    # Check for comma-separated values
    if ',' in trimmed:
        # Check for invalid comma placement
        if trimmed.startswith(',') or trimmed.endswith(',') or ',,' in trimmed:
            raise SystemExit(f"--{arg_name} has invalid comma placement")
        
        parts = [p.strip() for p in trimmed.split(',') if p.strip()]
        if not parts:
            raise SystemExit(f"--{arg_name} must be 'all' or a comma-separated list of values")
    else:
        # Single value is also valid
        if not trimmed:
            raise SystemExit(f"--{arg_name} must be 'all' or a comma-separated list of values")


def validate_tracks(value: str) -> None:
    """Validate track names."""
    valid_tracks = ['internal', 'alpha', 'beta', 'production']
    trimmed = value.strip()
    
    if trimmed.lower() == 'all':
        return
    
    parts = trimmed.split(',')
    parts = [p.strip().lower() for p in parts]
    invalid_tracks = [track for track in parts if track not in valid_tracks]
    
    if invalid_tracks:
        raise SystemExit(f"Invalid track names: {', '.join(invalid_tracks)}. Valid tracks: {', '.join(valid_tracks)}")


def validate_images(value: str) -> None:
    """Validate image types."""
    valid_image_types = [
        'icon', 'featureGraphic', 'tvBanner', 'phoneScreenshots', 
        'sevenInchScreenshots', 'tenInchScreenshots', 'tvScreenshots', 'wearScreenshots'
    ]
    trimmed = value.strip()
    
    if trimmed.lower() == 'all':
        return
    
    parts = trimmed.split(',')
    parts = [p.strip() for p in parts]
    invalid_types = [img_type for img_type in parts if img_type not in valid_image_types]
    
    if invalid_types:
        raise SystemExit(f"Invalid image types: {', '.join(invalid_types)}. Valid types: {', '.join(valid_image_types)}")


def validate_testers(value: str) -> None:
    """Validate tester track names."""
    valid_tracks = ['internal', 'alpha', 'beta', 'production']
    trimmed = value.strip()
    
    if trimmed.lower() == 'all':
        return
    
    parts = trimmed.split(',')
    parts = [p.strip().lower() for p in parts]
    invalid_tracks = [track for track in parts if track not in valid_tracks]
    
    if invalid_tracks:
        raise SystemExit(f"Invalid tester track names: {', '.join(invalid_tracks)}. Valid tracks: {', '.join(valid_tracks)}")


def validate_args(args) -> None:
    """Perform additional validation on parsed arguments."""
    # Validate comma-separated arguments (custom logic for format and valid values)
    if args.tracks is not None:
        validate_comma_separated_or_all(args.tracks, "tracks")
        validate_tracks(args.tracks)
    
    if args.images is not None:
        validate_comma_separated_or_all(args.images, "images")
        validate_images(args.images)
    
    if args.testers is not None:
        validate_comma_separated_or_all(args.testers, "testers")
        validate_testers(args.testers)


# Helper parsing and fetchers for tracks/images/testers

def parse_tracks_arg(value: Optional[str], all_flag: bool) -> Any:
    if value is None and all_flag:
        return "all"
    if value is None:
        raise SystemExit("--tracks requires a value: 'all' or comma-separated track names")
    v = value.strip()
    if v.lower() == "all":
        return "all"
    parts = [t.strip() for t in v.split(",") if t.strip()]
    if not parts:
        raise SystemExit("--tracks must be 'all' or a non-empty comma-separated list of track names")
    return parts


def parse_images_arg(value: Optional[str], all_flag: bool) -> Any:
    if value is None and all_flag:
        return "all"
    if value is None:
        raise SystemExit("--images requires a value: 'all' or comma-separated image types")
    v = value.strip()
    if v.lower() == "all":
        return "all"
    parts = [t.strip() for t in v.split(",") if t.strip()]
    if not parts:
        raise SystemExit("--images must be 'all' or a non-empty comma-separated list of types")
    return parts


def parse_testers_arg(value: Optional[str], all_flag: bool) -> Any:
    if value is None and all_flag:
        return "all"
    if value is None:
        raise SystemExit("--testers requires a value: 'all' or comma-separated track names")
    v = value.strip()
    if v.lower() == "all":
        return "all"
    parts = [t.strip() for t in v.split(",") if t.strip()]
    if not parts:
        raise SystemExit("--testers must be 'all' or a non-empty comma-separated list of tracks")
    return parts


def fetch_and_filter_tracks(service, package_name: str, selection: Any) -> Dict[str, Any]:
    payload = fetch_tracks(service, package_name)
    if selection == "all":
        return payload
    wanted_set = set(str(n).lower() for n in selection)
    filtered = [t for t in payload.get("tracks", []) if str(t.get("track", "")).lower() in wanted_set]
    out = dict(payload)
    out["tracks"] = filtered
    return out


def fetch_images_for_selection(service, package_name: str, language: Optional[str], selection: Any) -> Tuple[
    List[str], Dict[str, Any]]:
    # Allowed image types per Android Publisher API v3
    types_all = [
        "icon",
        "featureGraphic",
        "tvBanner",
        "phoneScreenshots",
        "sevenInchScreenshots",
        "tenInchScreenshots",
        "tvScreenshots",
        "wearScreenshots",
    ]
    types_list = types_all if selection == "all" else list(selection)
    images_map: Dict[str, Any] = {}
    for i, t in enumerate(types_list, 1):
        Log.progress(f"  Fetching {t} images ({i}/{len(types_list)})...")
        images_map[t] = fetch_images(service, package_name, language, t)
    return types_list, images_map


def fetch_testers_for_selection(service, package_name: str, selection: Any) -> Dict[str, Any]:
    # Always return a consistent shape: { "testers": { track: data, ... } }
    testers_map: Dict[str, Any] = {}
    if selection == "all":
        Log.progress("Fetching testers for all tracks...")
        all_data = fetch_testers_all(service, package_name)
        testers_map = dict(all_data.get("tracks", {}))
    else:
        for i, t in enumerate(selection, 1):
            Log.progress(f"Fetching testers for {t} track ({i}/{len(selection)})...")
            testers_map[t] = fetch_testers(service, package_name, t)
    return {"testers": testers_map}


def main():
    ap = argparse.ArgumentParser(
        formatter_class=argparse.RawTextHelpFormatter,
        description="Fetch Google Play Console data",
        epilog=(
            "Examples:\n"
            "  python play_console_cli.py -p com.example.app -c creds.json -A\n"
            "  python play_console_cli.py --package com.example.app --creds-path creds.json -t production,beta -i icon,featureGraphic\n"
            "  python play_console_cli.py -p com.example.app -c creds.json -t all -i all -j\n"
            "\n"
            "Notes:\n"
            "  - For comma-separated inputs, do not use spaces.\n"
            "  - Use 'all' to select all supported values.\n"
            "  - Both short (-p) and long (--package) flags are supported.\n"
        ),
    )
    ap.add_argument("-p", "--package", required=True, help="Android application package name")
    ap.add_argument("-c", "--creds-path", required=True, help="Path to Google service account credentials JSON file")
    # Simplified resource flags (require explicit value 'all' or comma-separated values)
    ap.add_argument(
        "-t", "--tracks",
        metavar="TRACKS",
        help=(
            "Include tracks.\n"
            "  Values:\n"
            "    - 'all': all tracks\n"
            "    - list: comma-separated from {internal, alpha, beta, production}"
        ),
    )
    ap.add_argument("-a", "--apks", action="store_true", help="Include APKs")
    ap.add_argument("-b", "--bundles", action="store_true", help="Include App Bundles")
    ap.add_argument("-l", "--listings", action="store_true", help="Include store listings")
    ap.add_argument(
        "-i", "--images",
        metavar="IMAGES",
        help=(
            "Include images.\n"
            "  Values:\n"
            "    - 'all': all image types\n"
            "    - list: comma-separated from {icon, featureGraphic, tvBanner,\n"
            "            phoneScreenshots, sevenInchScreenshots, tenInchScreenshots,\n"
            "            tvScreenshots, wearScreenshots}"
        ),
    )
    ap.add_argument("-I", "--inapps", action="store_true", help="Include in-app products")
    ap.add_argument("-r", "--reviews", action="store_true", help="Include reviews")
    ap.add_argument("-v", "--voided-purchases", dest="voided_purchases", action="store_true", help="Include voided purchases")
    ap.add_argument(
        "-T", "--testers",
        metavar="TESTERS",
        help=(
            "Include testers.\n"
            "  Values:\n"
            "    - 'all': all tracks\n"
            "    - list: comma-separated from {internal, alpha, beta, production}"
        ),
    )
    ap.add_argument("-d", "--app-details", dest="app_details", action="store_true", help="Include app details")
    ap.add_argument("-e", "--expansion-files", dest="expansion_files", action="store_true", help="Include expansion files")

    # Options for specific resources
    ap.add_argument("-L", "--images-language", default="en-US", help="Listing language for images (default: en-US)")
    ap.add_argument("-P", "--reviews-pages", type=positive_int, default=1, 
                   help="Number of review pages to fetch (must be positive, default: 1)")
    ap.add_argument("-S", "--reviews-page-size", type=positive_int, default=100,
                   help="Reviews per page (must be positive, default: 100)")

    # Global options
    ap.add_argument("-A", "--all", action="store_true", help="Include all supported resources")
    ap.add_argument("-j", "--json", action="store_true", help="Output raw JSON")
    args = ap.parse_args()

    # Validate arguments
    validate_args(args)

    try:
        service = build_service(args.creds_path)
    except HttpError as e:
        Log.error(str(e))
        raise SystemExit(1)

    # Determine requested resources
    flags_requested = []
    if args.tracks is not None:
        flags_requested.append("tracks")
    if args.apks:
        flags_requested.append("apks")
    if args.bundles:
        flags_requested.append("bundles")
    if args.listings:
        flags_requested.append("listings")
    if args.images is not None:
        flags_requested.append("images")
    if args.inapps:
        flags_requested.append("inapps")
    if args.reviews:
        flags_requested.append("reviews")
    if args.voided_purchases:
        flags_requested.append("voided_purchases")
    if args.testers is not None:
        flags_requested.append("testers")
    if args.app_details:
        flags_requested.append("app_details")
    if args.expansion_files:
        flags_requested.append("expansion_files")

    if args.all:
        requested = [
            "tracks",
            "apks",
            "bundles",
            "listings",
            "images",
            "inapps",
            "reviews",
            "voided_purchases",
            "testers",
            "app_details",
            "expansion_files",
        ]
    elif flags_requested:
        requested = flags_requested
    else:
        raise SystemExit(
            "No resources selected. Provide --all or at least one of: --tracks, --apks, --bundles, --listings, --images, --inapps, --reviews, --voided-purchases, --testers, --app-details, --expansion-files"
        )

    results: Dict[str, Any] = {}

    try:
        if "tracks" in requested:
            Log.progress("Fetching tracks...")
            selection = parse_tracks_arg(args.tracks, args.all)
            results["tracks"] = fetch_and_filter_tracks(service, args.package, selection)
        if "apks" in requested:
            Log.progress("Fetching APKs...")
            results["apks"] = fetch_apks(service, args.package)
        if "bundles" in requested:
            Log.progress("Fetching App Bundles...")
            results["bundles"] = fetch_bundles(service, args.package)
        if "listings" in requested:
            Log.progress("Fetching store listings...")
            results["listings"] = fetch_listings(service, args.package)
        if "images" in requested:
            Log.progress("Fetching images...")
            selection = parse_images_arg(args.images, args.all)
            types_list, images_map = fetch_images_for_selection(
                service, args.package, args.images_language, selection
            )
            # Always emit a consistent map of imageType -> images payload
            results["images"] = images_map
        if "inapps" in requested:
            Log.progress("Fetching in-app products...")
            results["inapps"] = fetch_inapps(service, args.package)
        if "reviews" in requested:
            Log.progress(f"Fetching reviews ({args.reviews_pages} pages, {args.reviews_page_size} per page)...")
            results["reviews"] = fetch_reviews(service, args.package, args.reviews_pages, args.reviews_page_size)
        if "voided_purchases" in requested:
            Log.progress(
                f"Fetching voided purchases ({args.reviews_pages} pages, {args.reviews_page_size} per page)...")
            results["voided_purchases"] = fetch_voided_purchases(service, args.package, args.reviews_pages,
                                                                 args.reviews_page_size)
        if "testers" in requested:
            Log.progress("Fetching testers...")
            selection = parse_testers_arg(args.testers, args.all)
            results.update(fetch_testers_for_selection(service, args.package, selection))
        if "app_details" in requested:
            Log.progress("Fetching app details...")
            results["app_details"] = fetch_app_details(service, args.package)
        if "expansion_files" in requested:
            Log.progress("Fetching expansion files...")
            results["expansion_files"] = fetch_expansion_files(service, args.package)
    except HttpError as e:
        # Print error details and exit
        try:
            error_details = json.loads(e.content.decode("utf-8"))
            Log.error(json.dumps(error_details, indent=2, ensure_ascii=False))
        except Exception:
            Log.error(str(e))
        raise SystemExit(1)

    # Print the results as formatted JSON
    Log.info("Completed successfully!")

    if args.json:
        Log.output(json.dumps(results, indent=2, ensure_ascii=False))
    else:
        def print_section(title: str, data: Any, indent: int = 0, prefix: str = "", is_last: bool = True,
                          is_root: bool = False):
            # Branch characters
            if is_root:
                branch = "\033[34m● \033[0m"  # blue root marker
            else:
                branch = "└─╴" if is_last else "├─╴"
            space = "    " if is_last else "│   "

            # Print title
            if title:
                Log.output(f"{prefix}{branch}\033[1m{title}\033[0m")

            # Update prefix for children
            new_prefix = prefix + (space if not is_root and title else "")

            if isinstance(data, dict):
                if not data:  # empty dict
                    branch_val = "└─╴" if is_last else "├─╴"
                    Log.output(f"{new_prefix}{branch_val}\033[2m<empty>\033[0m")  # dim placeholder
                else:
                    items = list(data.items())
                    for idx, (k, v) in enumerate(items):
                        last = idx == len(items) - 1
                        print_section(k, v, indent + 1, new_prefix, last)

            elif isinstance(data, list):
                if not data:  # empty list
                    branch_val = "└─╴" if is_last else "├─╴"
                    Log.output(f"{new_prefix}{branch_val}\033[2m<empty>\033[0m")  # dim placeholder
                else:
                    for idx, item in enumerate(data):
                        last = idx == len(data) - 1
                        print_section(f"[{idx}]", item, indent + 1, new_prefix, last)

            else:
                # Leaf value (leave multiline as-is)
                value_str = str(data)
                branch_val = "└─╴" if is_last else "├─╴"
                Log.output(f"{new_prefix}{branch_val}\033[36m{value_str}\033[0m")  # cyan for values

        # Usage
        for idx, (section, content) in enumerate(results.items()):
            print_section(section, content, is_root=True)
            Log.output()  # blank line between root sections


if __name__ == "__main__":
    main()
