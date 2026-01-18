"""
Example usage of generate_views function
"""

from generate_views import generate_views
import os
import shutil

# Example: Generate 4 views
print("=" * 60)
print("Generate 4 Views Example")
print("=" * 60)

paths = generate_views("input.png")

print(f"\nGenerated {len(paths)} views:")
angles = [0, 90, 180, 270]
for i, (angle, path) in enumerate(zip(angles, paths)):
    size = os.path.getsize(path) / 1024
    print(f"  [{i}] {angle:>3}°: {path} ({size:.1f} KB)")

# Show the temp directory
temp_dir = os.path.dirname(paths[0])
print(f"\nTemp directory: {temp_dir}")
print(f"UUID folder name: {os.path.basename(temp_dir)}")

# Optional: Copy to permanent location
print("\n" + "=" * 60)
print("Copying to 'output_views' folder...")
print("=" * 60)

output_dir = "output_views"
os.makedirs(output_dir, exist_ok=True)

for i, (angle, path) in enumerate(zip(angles, paths)):
    output_path = os.path.join(output_dir, f"{angle}.png")
    shutil.copy(path, output_path)
    print(f"  Copied {angle}° to {output_path}")

# Clean up temp files
print("\nCleaning up temp directory...")
shutil.rmtree(temp_dir)
print("✓ Temp files cleaned up")

print("\n" + "=" * 60)
print("✓ Complete!")
print("=" * 60)
