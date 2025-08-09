#!/usr/bin/env python3
"""
Script to fetch release descriptions from onejs/one repository using GitHub CLI
and save them to a text file.
"""

import subprocess
import json
import sys
from datetime import datetime

def run_gh_command(command):
    """Run a GitHub CLI command and return the output."""
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {command}")
        print(f"Error: {e.stderr}")
        return None

def get_release_list():
    """Get list of releases from the repository."""
    command = "gh release list -R onejs/one --limit 10 --json tagName,publishedAt"
    output = run_gh_command(command)

    if output:
        try:
            return json.loads(output)
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON: {e}")
            return None
    return None

def get_release_details(tag_name):
    """Get detailed information for a specific release."""
    command = f"gh release view -R onejs/one {tag_name}"
    return run_gh_command(command)

def main():
    print("Fetching releases from onejs/one repository...")

    # Check if gh CLI is available
    if run_gh_command("gh --version") is None:
        print("Error: GitHub CLI (gh) is not installed or not available in PATH")
        sys.exit(1)

    # Get list of releases
    # releases = get_release_list()
    releases = [f"v1.1.{i}" for i in range(479, 513)]
    if not releases:
        print("Failed to fetch release list")
        sys.exit(1)

    print(f"Found {len(releases)} releases")

    # Create output filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = f"onejs_releases_{timestamp}.txt"

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("OneJS Release Descriptions\n")
        f.write("=" * 50 + "\n\n")
        f.write(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write("Repository: onejs/one\n\n")

        for i, release in enumerate(releases, 1):
            tag_name = release

            print(f"Fetching details for {tag_name} ({i}/{len(releases)})...")

            # Get detailed release information
            release_details = get_release_details(tag_name)

            f.write("-" * 10 + "\n")
            if release_details:
                f.write(release_details)
            else:
                print(f"Failed to fetch details for {tag_name}")
                f.write(f"Failed to fetch details for {tag_name}\n\n")

    print(f"Release descriptions saved to: {output_file}")

if __name__ == "__main__":
    main()
