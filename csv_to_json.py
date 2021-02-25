# -*- coding: utf-8 -*-

import argparse
import json
import glob
import numpy as np
import os
import pickle
from pprint import pprint
import re
import sys

import lib.io_utils as io
from lib.math_utils import *
from lib.utils import *

# input
parser = argparse.ArgumentParser()
parser.add_argument('-in', dest="INPUT_FILE", default="data/photographic_images.csv", help="File with metadata")
parser.add_argument('-grid', dest="INPUT_GRID_FILE", default="output/photographic_grid.p", help="Input grid file")
parser.add_argument('-im', dest="IMAGE_FILES", default="images/photographic_thumbnails/*.jpg", help="Input file pattern")
parser.add_argument('-tile', dest="TILE_SIZE", default="128x128", help="Tile size in pixels")

parser.add_argument('-fn', dest="FILENAME_KEY", default="filename", help="Column in metadata csv with filename")
parser.add_argument('-title', dest="TITLE", default="title", help="Column in metadata csv with the title; can also be a format string, e.g. `{Name} ({Year})`")
parser.add_argument('-url', dest="URL", default="url", help="Column in metadata csv with the url; can also be a format string, e.g. `https://example.com/{Id}`")

parser.add_argument('-out', dest="OUTPUT_FILE", default="data/metadata.json", help="File for output")
a = parser.parse_args()

tileW, tileH = tuple([int(t) for t in a.TILE_SIZE.split("x")])

gridAssignment = None
with open(a.INPUT_GRID_FILE, "rb") as f:
    gridAssignment = pickle.load(f)
grid, gridShape = gridAssignment
gridW, gridH = gridShape

# Make sure output dirs exist
io.makeDirectories(a.OUTPUT_FILE)

# retrieve data
fieldNames, data = io.readCsv(a.INPUT_FILE)
dataCount = len(data)

# retrieve images
imageFiles = glob.glob(a.IMAGE_FILES)
imageFiles = sorted(imageFiles)
fileCount = len(imageFiles)
print("Loaded %s files" % fileCount)

if fileCount != len(grid):
    print("File count (%s) != grid count (%s)" % (fileCount, len(grid)))
    sys.exit()

# initialize grid
rows = []
for i in range(gridH):
    cols = [0 for j in range(gridW)]
    rows.append(cols)

dataLookup = createLookup(data, a.FILENAME_KEY)

fields = ["title"]
urlFields = []
if '{' in a.URL:
    urlFields = re.findall( r'\{(.+)\}', a.URL)
    fields += urlFields
else:
    fields.append("url")
for xy, fn in zip(grid, imageFiles):
    basename = os.path.basename(fn)
    col, row = tuple(xy)
    if basename not in dataLookup:
        print(f'Could not find {basename} in data')
        continue
    item = dataLookup[basename]
    rowOut = []
    title = ''
    if '{' in a.TITLE:
        title = a.TITLE.format(**item)
    elif a.TITLE in item:
        title = item[a.TITLE]
    rowOut.append(title)

    if len(urlFields) > 0:
        for field in urlFields:
            rowOut.append(item[field])
    elif a.URL in item:
        rowOut.append(item[a.URL])

    rows[int(round(row))][int(round(col))] = rowOut

jsonData = {
    "fields": fields,
    "values": rows,
    "cols": gridW,
    "rows": gridH,
    "tileSize": tileW
}
if '{' in a.URL:
    jsonData["urlPattern"] = a.URL

with open(a.OUTPUT_FILE, 'w') as f:
    json.dump(jsonData, f)
