# Image Collection Visualizer

Visualizing [AMNH](https://www.amnh.org/)'s [Photographic Collection](http://lbry-web-007.amnh.org/digital/collections/show/2) with machine learning and [Library](https://www.amnh.org/research/research-library) metadata.

## Requirements

You can install all Python requirements by running `pip install -r requirements.txt --user`

- [Python](https://www.python.org/) (This is developed using 3.6, so 3.6+ is recommended and may not work with 2.7+)
- [SciPy](https://www.scipy.org/) for math functions (probably already installed)
- [Keras](https://keras.io/) for image feature extraction
- [Scikit-learn](https://scikit-learn.org/stable/) for feature reduction (e.g. PCA)
- [Multicore-TSNE](https://github.com/DmitryUlyanov/Multicore-TSNE) for converting features to 2 dimensions via [TSNE](https://en.wikipedia.org/wiki/T-distributed_stochastic_neighbor_embedding)
- [RasterFairy](https://github.com/Quasimondo/RasterFairy) for transforming 2D points to grid
- [Pillow](https://pillow.readthedocs.io/en/stable/) for image tile generation

You can install a local server by running `npm install` then `npm start`

- [Node.js](https://nodejs.org/en/) if you'd like to run the interface locally

## Generating UI from images and metadata

You can run the full workflow with a single script which will execute each sub-script in the workflow (outlined in the next section)

```
python run.py \
-id "my_collection" \
-imagedir "path/to/images/*.jpg" \
-tile "128x128" \
-metdata "path/to/metadata.csv"
```

For the metadata.csv, by default, the script looks for columns "title", "url", and "filename" (the name of the image file with extension). You can pass in custom column names for filename, title, and URL which supports custom formatting

```
...
-fn "Filename" \
-title "{Name} ({Year})" \
-url "http://www.website.com/{Id}/"
```

## Workflow

First, given a directory of images, we will extract 4096 features using Keras and the [VGG16 model](https://keras.io/applications/#vgg16) with weights pre-trained on [ImageNet](http://www.image-net.org/), then reduce those to 256 features using [PCA](https://en.wikipedia.org/wiki/Principal_component_analysis), then save those features to a compressed file:

```
python images_to_features.py \
-in "images/photographic_thumbnails/*.jpg" \
-pca 256 \
-out "output/photographic_features.p.bz2"
```

Then we will reduce those features even further to just two dimensions using [TSNE](https://en.wikipedia.org/wiki/T-distributed_stochastic_neighbor_embedding) and output the result to a csv file. You can speed this up by indicated the number of parallel jobs to run, e.g. `-jobs 4`

```
python features_to_tsne.py \
-in "output/photographic_features.p.bz2" \
-jobs 4 \
-out "data/photographic_tsne.csv"
```

Then we will convert those 2D points to a grid assignment using [RasterFairy](https://github.com/Quasimondo/RasterFairy)

```
python tsne_to_grid.py \
-in "data/photographic_tsne.csv" \
-out "output/photographic_grid.p"
```

Then generate a giant image matrix from the images and the grid data using a 128x128 thumbnail size:

```
python grid_to_image.py \
-in "output/photographic_grid.p" \
-tile "128x128" \
-out "output/photographic_matrix.jpg"
```

Finally, we will convert the giant image to tiles (in .dzi format):

```
python image_to_tiles.py \
-in "output/photographic_matrix.jpg" \
-tsize 128
```

Then convert metadata .csv to .json for it to be used by the interface. You can pass in custom column names for filename, title, and URL which supports custom formatting

```
python csv_to_json.py \
-in "data/photographic_images.csv" \
-im "images/photographic_thumbnails/*.jpg" \
-grid "output/photographic_grid.p" \
-fn "Filename" \
-title "{Name} ({Year})" \
-url "http://www.website.com/{Id}/"
```

You can view the result on a local server by running:

```
npm install
npm start
```
