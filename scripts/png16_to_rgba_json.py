#!/usr/bin/env python3
import argparse
import json
from pathlib import Path

from PIL import Image


EXPECTED_SIZE = (16, 16)


def image_to_rgba_grid(image_path: Path):
    with Image.open(image_path) as image:
        rgba_image = image.convert("RGBA")
        if rgba_image.size != EXPECTED_SIZE:
            raise ValueError(
                f"Expected a 16x16 PNG, got {rgba_image.size[0]}x{rgba_image.size[1]}"
            )

        pixels = list(rgba_image.getdata())

    width, height = EXPECTED_SIZE
    grid = []
    for y in range(height):
        row = []
        for x in range(width):
            r, g, b, a = pixels[y * width + x]
            row.append([r, g, b, a])
        grid.append(row)

    return grid


def main():
    parser = argparse.ArgumentParser(
        description="Convert a 16x16 PNG to a JSON 16x16 matrix of [r,g,b,a] arrays."
    )
    parser.add_argument("input_png", help="Path to the input PNG file")
    parser.add_argument(
        "-o",
        "--output",
        help="Optional output file path. If omitted, prints JSON to stdout.",
    )
    parser.add_argument(
        "--compact",
        action="store_true",
        help="Emit compact one-line JSON instead of pretty-printed JSON.",
    )

    args = parser.parse_args()

    input_path = Path(args.input_png)
    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    if input_path.suffix.lower() != ".png":
        raise ValueError("Input file must be a .png")

    grid = image_to_rgba_grid(input_path)
    json_text = json.dumps(grid, indent=None if args.compact else 2)

    if args.output:
        output_path = Path(args.output)
        output_path.write_text(json_text + "\n", encoding="utf-8")
        print(f"Wrote JSON to {output_path}")
    else:
        print(json_text)


if __name__ == "__main__":
    main()
