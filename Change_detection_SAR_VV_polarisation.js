
/*
ee - Earth Engine
The code is for Google Earth Engine environment
*/

var geometry = /* color: #d63000 */ee.Geometry.Point([5.7788, 52.7005]);


var country = ee.FeatureCollection('ft:1tdSwUL7MVpOauSgRzqVTOwdfy17KDbw-1d9omPw')
  .filter(ee.Filter.eq('Country', 'Netherlands'));

function get_images(polarisation) {
  
    var img = ee.ImageCollection('COPERNICUS/S1_GRD')
            .filter(ee.Filter.listContains('transmitterReceiverPolarisation', polarisation))
            .filter(ee.Filter.eq('instrumentMode', 'IW'))
            .select(polarisation)
            .map(function(image) {
              var edge = image.lt(-30.0);
              var maskedImage = image.mask().and(edge.not());
              return image.updateMask(maskedImage);
            });
    return img;
}


var polarisation = 'VV'
// vh is also alright
var active_collection = get_images(polarisation)

// Before and after the harvesting season
var image_before = ee.Image(active_collection.filterDate('2016-04-01', '2016-05-30').mean()).clip(country);
var image_after = ee.Image(active_collection.filterDate('2016-08-01', '2016-09-15').mean()).clip(country);


var composite = image_before.addBands(image_after)

// Given that Sentinal-1 SAR data is already pre-processed
// I would do a simple subtraction
var change = image_after.subtract(image_before).rename('CHANGE');

// Smoothen the radar intensities
// Threshold smoothed radar intensities to identify "flooded" areas.
var SMOOTHING_RADIUS = 20;
var DIFF_UPPER_THRESHOLD = 0.7;
var change_smoothened = image_after.focal_median(SMOOTHING_RADIUS, 'circle', 'meters')
.subtract(image_before.focal_median(SMOOTHING_RADIUS, 'circle', 'meters'));

var change_harvested_smoothened = change_smoothened.gt(DIFF_UPPER_THRESHOLD);

var canny_smooth = ee.Algorithms.CannyEdgeDetector({
  image: change_harvested_smoothened, threshold: 0.7, sigma: 1
});


// Thresholded values
var harvested_fields = change.gte(0.7)
//harvested_fields = harvested_fields.updateMask(harvested_fields.neq(0))
harvested_fields = harvested_fields.updateMask(harvested_fields.gte(0.8))
// masked image

var canny = ee.Algorithms.CannyEdgeDetector({
  image: harvested_fields, threshold: 0.9, sigma: 1
});



// Connected pixels
// Compute the number of pixels in each patch.
var patchsize = harvested_fields.connectedPixelCount(256, false);
var patchsize = patchsize.gte(0.1)



/////////////////////////////////////////////////////////
// Display the result.
/////////////////////////////////////////////////////////
Map.centerObject(geometry, 13);
Map.addLayer(image_before, {min: -25, max: 0}, polarisation + " before");
Map.addLayer(image_after, {min: -25, max: 0}, polarisation + " after");
Map.addLayer(composite, {min: -25, max: 0}, polarisation + ' stack');

// Change
var params = {min: -2, max: 2};
Map.addLayer(change, params, 'Change image');
// Important! So the biggest changes are white
// Completely black is basically no change


// Thresholded values
Map.addLayer(harvested_fields, {}, "Harvested fields")


// Canny edges
Map.addLayer(canny, {palette: ['green', 'white']}, 'Harvested ields edges');
// green - harvested, red - not harvested

// Playing around with connected pixels count
Map.addLayer(patchsize, {}, 'patch size');

// Smoothened differences
Map.addLayer(change_smoothened, {min:-2,max:2}, 'Difference smoothened');
Map.addLayer(change_harvested_smoothened.updateMask(change_harvested_smoothened), {palette:"00FF00"},'Harvested fields smoothened');

// Canny smoothened
Map.addLayer(canny, {palette: ['green', 'white']}, 'Harvested fields edges smoothened');
// green - harvested, red - not harvested

/////////////////////////////////////////////////////////
// AUXILLAIARY CALCULATIONS
/////////////////////////////////////////////////////////
// GET mean of the backscatter coefficient for a chosen ROI defined by me on the map
var mean_before = image_before.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: polygon,
  scale: 90
});

var mean_after = image_after.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: polygon,
  scale: 90
});


var mean_composite = composite.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: polygon,
  scale: 90
});

// Get the mean from the dictionary and print it.
var mean1 = mean_after.get(polarisation);
var mean2 = mean_before.get(polarisation);
var mean3 = mean_composite.get(polarisation);
print('Backscatter coeff: before', mean1);
print('Backscatter coeff: after', mean2);
print('Backscatter coeff: composite', mean3);