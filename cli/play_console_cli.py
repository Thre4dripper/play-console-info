import os
import sys
import json
import argparse
import time
from typing import Dict, Any, List, Optional, Tuple

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

SCOPES = ["https://www.googleapis.com/auth/androidpublisher"]


def build_service() -> Any:
    creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if not creds_path or not os.path.exists(creds_path):
        raise SystemExit("Missing GOOGLE_APPLICATION_CREDENTIALS file path")
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
    for _ in range(pages):
        params = {"packageName": package_name, "maxResults": page_size}
        if token:
            params["token"] = token
        resp = service.reviews().list(**params).execute()
        reviews.extend(resp.get("reviews", []))
        token = resp.get("tokenPagination", {}).get("nextPageToken")
        if not token:
            break
        time.sleep(0.2)
    return {"count": len(reviews), "reviews": reviews}


def fetch_voided_purchases(service, package_name: str, pages: int, page_size: int) -> Dict[str, Any]:
    items: List[Dict[str, Any]] = []
    token = None
    for _ in range(pages):
        params = {"packageName": package_name, "maxResults": page_size}
        if token:
            params["token"] = token
        resp = (
            service.purchases().voidedpurchases().list(**params).execute()
        )
        items.extend(resp.get("voidedPurchases", []))
        token = resp.get("tokenPagination", {}).get("nextPageToken")
        if not token:
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


def fetch_images_for_selection(service, package_name: str, language: Optional[str], selection: Any) -> Tuple[List[str], Dict[str, Any]]:
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
    for t in types_list:
        images_map[t] = fetch_images(service, package_name, language, t)
    return types_list, images_map


def fetch_testers_for_selection(service, package_name: str, selection: Any) -> Dict[str, Any]:
    # Always return a consistent shape: { "testers": { track: data, ... } }
    testers_map: Dict[str, Any] = {}
    if selection == "all":
        all_data = fetch_testers_all(service, package_name)
        testers_map = dict(all_data.get("tracks", {}))
    else:
        for t in selection:
            testers_map[t] = fetch_testers(service, package_name, t)
    return {"testers": testers_map}


def main():
    ap = argparse.ArgumentParser(
        formatter_class=argparse.RawTextHelpFormatter,
        description="Fetch Google Play Console data",
        epilog=(
            "Notes:\n"
            "  - For comma-separated inputs, do not use spaces.\n"
            "  - Use 'all' to select all supported values.\n"
        ),
    )
    ap.add_argument("--package", required=True)
    # Simplified resource flags (require explicit value 'all' or comma-separated values)
    ap.add_argument(
        "--tracks",
        metavar="TRACKS",
        help=(
            "Include tracks.\n"
            "  Values:\n"
            "    - 'all': all tracks\n"
            "    - list: comma-separated from {internal, alpha, beta, production}"
        ),
    )
    ap.add_argument("--apks", action="store_true", help="Include APKs")
    ap.add_argument("--bundles", action="store_true", help="Include App Bundles")
    ap.add_argument("--listings", action="store_true", help="Include store listings")
    ap.add_argument(
        "--images",
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
    ap.add_argument("--inapps", action="store_true", help="Include in-app products")
    ap.add_argument("--reviews", action="store_true", help="Include reviews")
    ap.add_argument("--voided-purchases", dest="voided_purchases", action="store_true", help="Include voided purchases")
    ap.add_argument(
        "--testers",
        metavar="TESTERS",
        help=(
            "Include testers.\n"
            "  Values:\n"
            "    - 'all': all tracks\n"
            "    - list: comma-separated from {internal, alpha, beta, production}"
        ),
    )
    ap.add_argument("--app-details", dest="app_details", action="store_true", help="Include app details")
    ap.add_argument("--expansion-files", dest="expansion_files", action="store_true", help="Include expansion files")
    ap.add_argument("--all", action="store_true", help="Include all supported resources")
    # Options
    ap.add_argument("--images-language", default="en-US", help="Listing language for images (default: en-US)")
    ap.add_argument("--reviews-pages", type=int, default=1)
    ap.add_argument("--reviews-page-size", type=int, default=100)
    args = ap.parse_args()

    try:
        service = build_service()
    except HttpError as e:
        print(e)
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
            selection = parse_tracks_arg(args.tracks, args.all)
            results["tracks"] = fetch_and_filter_tracks(service, args.package, selection)
        if "apks" in requested:
            results["apks"] = fetch_apks(service, args.package)
        if "bundles" in requested:
            results["bundles"] = fetch_bundles(service, args.package)
        if "listings" in requested:
            results["listings"] = fetch_listings(service, args.package)
        if "images" in requested:
            selection = parse_images_arg(args.images, args.all)
            types_list, images_map = fetch_images_for_selection(
                service, args.package, args.images_language, selection
            )
            # Always emit a consistent map of imageType -> images payload
            results["images"] = images_map
        if "inapps" in requested:
            results["inapps"] = fetch_inapps(service, args.package)
        if "reviews" in requested:
            results["reviews"] = fetch_reviews(service, args.package, args.reviews_pages, args.reviews_page_size)
        if "voided_purchases" in requested:
            results["voided_purchases"] = fetch_voided_purchases(service, args.package, args.reviews_pages, args.reviews_page_size)
        if "testers" in requested:
            selection = parse_testers_arg(args.testers, args.all)
            results.update(fetch_testers_for_selection(service, args.package, selection))
        if "app_details" in requested:
            results["app_details"] = fetch_app_details(service, args.package)
        if "expansion_files" in requested:
            results["expansion_files"] = fetch_expansion_files(service, args.package)
    except HttpError as e:
        # Print error details and exit
        try:
            error_details = json.loads(e.content.decode("utf-8"))
            print(json.dumps(error_details, indent=2, ensure_ascii=False))
        except Exception:
            print(str(e))
        raise SystemExit(1)

    # Print the results as formatted JSON
    print(json.dumps(results, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
