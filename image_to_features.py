# -*- coding: utf-8 -*-

# Adapted from:
# https://github.com/ml4a/ml4a-guides/blob/master/notebooks/image-search.ipynb
# https://github.com/ml4a/ml4a-ofx/blob/master/scripts/analyze-images.py

import argparse
import bz2
import glob
import numpy as np
import os
import pickle
from pprint import pprint
from sklearn.decomposition import PCA
import sys

from lib.utils import *

# input
parser = argparse.ArgumentParser()
parser.add_argument('-in', dest="INPUT_FILES", default="images/photographic_thumbnails/*.jpg", help="Input file pattern")
parser.add_argument('-pca', dest="PCA_COMPONENTS", default=300, type=int, help="Principal component analysis (PCA) components to reduce down to")
parser.add_argument('-out', dest="OUTPUT_FILE", default="output/photographic_features.p.bz2", help="Pickle cache file to store features")
a = parser.parse_args()

# os.environ["KERAS_BACKEND"] = "plaidml.keras.backend"
import tensorflow.keras as keras
from tensorflow.keras.preprocessing import image
from tensorflow.keras.applications.imagenet_utils import preprocess_input
from tensorflow.keras.models import Model

# Read files
files = glob.glob(a.INPUT_FILES)
files = sorted(files)
fileCount = len(files)
print("Found %s files" % fileCount)

# Load model, feature extractor
model = keras.applications.VGG16(weights='imagenet', include_top=True)

targetSize = model.input_shape[1:3]
print("Target size: %s x %s" % targetSize)

feat_extractor = Model(inputs=model.input, outputs=model.get_layer("fc2").output)

print("Extracting features from each image...")
features = np.zeros((fileCount, 4096), dtype=np.float32)
for i, fn in enumerate(files):
    im = image.load_img(fn, target_size=targetSize)
    x = image.img_to_array(im)
    x = np.expand_dims(x, axis=0)
    x = preprocess_input(x)
    feat = feat_extractor.predict(x)[0]
    features[i] = feat
    printProgress(i+1, fileCount)

print("Reducing feature vectors down to %s features..." % a.PCA_COMPONENTS)
pca = PCA(n_components=a.PCA_COMPONENTS)
pca.fit(features)
pca_features = pca.transform(features)

print("Saving features file %s..." % a.OUTPUT_FILE)
makeDir(a.OUTPUT_FILE)
pickle.dump(pca_features, bz2.open(a.OUTPUT_FILE, 'wb'))
print("Done.")
