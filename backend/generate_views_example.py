"""
Example usage of generate_views function
"""

from generate_views import generate_views
import os
import shutil

# Example 1: Basic usage
print("=" * 60)
print("Example 1: Generate 4 views")
print("=" * 60)

paths = generate_views("input.png")

print("\nGenerated views in temp directory:")
for angle, path in paths.items():
    if path and os.path.exists(path):
        size = os.path.getsize(path) / 1024
        print(f"  {angle:>3}°: {path} ({size:.1f} KB)")

# Example 2: Copy to permanent location
print("\n" + "=" * 60)
print("Example 2: Save to permanent location")
print("=" * 60)

output_dir = "output_views"
os.makedirs(output_dir, exist_ok=True)

for angle, temp_path in paths.items():
    if temp_path:
        output_path = os.path.join(output_dir, f"{angle}.png")
        shutil.copy(temp_path, output_path)
        print(f"  Copied {angle}° to {output_path}")

# Example 3: Clean up temp files
print("\n" + "=" * 60)
print("Example 3: Clean up temp directory")
print("=" * 60)

temp_dir = os.path.dirname(paths[0])
print(f"Temp directory: {temp_dir}")
shutil.rmtree(temp_dir)
print("✓ Temp files cleaned up")

print("\n" + "=" * 60)
print("✓ Complete! Check the 'output_views' folder")
print("=" * 60)
