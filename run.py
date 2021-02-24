# -*- coding: utf-8 -*-

import argparse
import os
import subprocess
import sys

# input
parser = argparse.ArgumentParser()
parser.add_argument('-py', dest="PYTHON_NAME", default="python", help="Python command name, e.g. python or python3")
parser.add_argument('-imagedir', dest="INPUT_FILES", default="images/photographic_thumbnails/*.jpg", help="Input file pattern")
parser.add_argument('-id', dest="UNIQUE_ID", default="photos", help="Unique key for generating data filenames")
parser.add_argument('-tile', dest="TILE_SIZE", default="128x128", help="Tile size in pixels")
parser.add_argument('-resize', dest="RESIZE_TYPE", default="contain", help="Resize type: contain or fill")
parser.add_argument('-probe', dest="PROBE", action="store_true", help="Only output commands?")
parser.add_argument('-overwrite', dest="OVERWRITE", action="store_true", help="Overwrite existing data?")
a = parser.parse_args()

print("==============================")
print('Converting images to features...')
featuresFile = f'output/{a.UNIQUE_ID}_features.p.bz2'
if not os.path.isfile(featuresFile) or a.OVERWRITE or a.PROBE:
    command = [
        a.PYTHON_NAME, "image_to_features.py",
        "-in", a.INPUT_FILES,
        "-out", featuresFile
    ]
    print(" ".join(command))
    if not a.PROBE:
        finished = subprocess.check_call(command)
else:
    print(f'Already created {featuresFile}. Skipping image_to_features.py.')

print("==============================")

print('Converting features to tsne...')
tsneFile = f'output/{a.UNIQUE_ID}_tsne.csv'
if not os.path.isfile(tsneFile) or a.OVERWRITE or a.PROBE:
    command = [
        a.PYTHON_NAME, "features_to_tsne.py",
        "-in", featuresFile,
        "-out", tsneFile
    ]
    print(" ".join(command))
    if not a.PROBE:
        finished = subprocess.check_call(command)
else:
    print(f'Already created {tsneFile}. Skipping features_to_tsne.py.')

print("==============================")

print('Converting tsne to image...')
imageFile = f'output/{a.UNIQUE_ID}_grid.jpg'
if not os.path.isfile(imageFile) or a.OVERWRITE or a.PROBE:
    command = [
        a.PYTHON_NAME, "tsne_to_image.py",
        "-in", tsneFile,
        "-im", a.INPUT_FILES,
        "-tile", a.TILE_SIZE,
        "-resize", a.RESIZE_TYPE,
        "-out", imageFile
    ]
    print(" ".join(command))
    if not a.PROBE:
        finished = subprocess.check_call(command)
else:
    print(f'Already created {imageFile}. Skipping tsne_to_image.py.')

print("==============================")

print('Converting image to tiles...')
tileFile = f'img/tiles.dzi'
if not os.path.isfile(tileFile) or a.OVERWRITE or a.PROBE:
    command = [
        a.PYTHON_NAME, "image_to_tiles.py",
        "-in", imageFile,
        "-out", tileFile
    ]
    print(" ".join(command))
    if not a.PROBE:
        finished = subprocess.check_call(command)
else:
    print(f'Already created {tileFile}. Skipping image_to_tiles.py.')

print("==============================")

print("Done.")
