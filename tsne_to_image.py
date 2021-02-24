# -*- coding: utf-8 -*-

import argparse
import glob
import math
import numpy as np
import os
from PIL import Image
from pprint import pprint
import rasterfairy
import sys

from lib.utils import *

# input
parser = argparse.ArgumentParser()
parser.add_argument('-in', dest="INPUT_FILE", default="data/photographic_tsne.csv", help="Input csv file")
parser.add_argument('-im', dest="IMAGE_FILES", default="images/photographic_thumbnails/*.jpg", help="Input file pattern")
parser.add_argument('-tile', dest="TILE_SIZE", default="128x128", help="Tile size in pixels")
parser.add_argument('-resize', dest="RESIZE_TYPE", default="fill", help="Resize type: contain or fill")
parser.add_argument('-out', dest="OUTPUT_FILE", default="output/photographic_matrix.jpg", help="File for output")
a = parser.parse_args()

tileW, tileH = tuple([int(t) for t in a.TILE_SIZE.split("x")])
model = np.loadtxt(a.INPUT_FILE, delimiter=",")
count = len(model)

print("Determining grid assignment...")
gridAssignment = rasterfairy.transformPointCloud2D(model)
grid, gridShape = gridAssignment
print("Resulting shape: %s x %s" % gridShape)
gridW, gridH = gridShape

imgW, imgH = (gridW * tileW, gridH * tileH)
tileCount = gridW * gridH
filenames = glob.glob(a.IMAGE_FILES)
filenames = sorted(filenames)
fileCount = len(filenames)

if fileCount != len(grid):
    print("File count (%s) != grid count (%s)" % (fileCount, len(grid)))
    sys.exit()

baseImage = Image.new('RGB', (imgW, imgH), (0,0,0))
i = 0
for xy, fn in zip(grid, filenames):
    col, row = tuple(xy)
    x = int(round(col * tileW))
    y = int(round(row * tileH))
    im = Image.open(fn)
    if a.RESIZE_TYPE == "fill":
        im = fillImage(im, tileW, tileH)
    else:
        im = containImage(im, tileW, tileH)
    baseImage.paste(im, (x, y))
    printProgress(i+1, fileCount)
    i += 1

makeDir(a.OUTPUT_FILE)
print("Saving image...")
baseImage.save(a.OUTPUT_FILE)
print("Created %s" % a.OUTPUT_FILE)
