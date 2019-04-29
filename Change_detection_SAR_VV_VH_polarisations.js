
/*
ee - Earth Engine
The code is for Google Earth Engine environment
*/

var geometry = /* color: #d63000 */ee.Geometry.Point([5.7788, 52.7005]);


var country = ee.FeatureCollection('ft:1tdSwUL7MVpOauSgRzqVTOwdfy17KDbw-1d9omPw')
  .filter(ee.Filter.eq('Country', 'Netherlands'));

function get_images(polarisations) {
  
    var img = ee.ImageCollection('COPERNICUS/S1_GRD')
            .filter(ee.Filter.listContains('transmitterReceiverPolarisation', polarisations[0]))
            .filter(ee.Filter.listContains('transmitterReceiverPolarisation', polarisations[1]))
            .filter(ee.Filter.eq('instrumentMode', 'IW'))
    return img;
}

var polarisation = 'VV and VH' //'VV'
// vh show it better though
var polarisations = ['VV', 'VH']
var sentinel1_collection = get_images(polarisations)

// Different look angles
var ascending = sentinel1_collection.filter(ee.Filter.eq('orbitProperties_pass', 'ASCENDING'));
var descending = sentinel1_collection.filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'));

// Create a composite from means at different polarizations and look angles.

var before = ee.Filter.date('2016-04-01', '2016-05-30');
var after = ee.Filter.date('2016-08-01', '2016-09-15');

var composite_VV_VH_before = ee.Image.cat([
  ascending.filter(before).select('VH').mean(),
  ee.ImageCollection(ascending.filter(before).select('VV').merge(descending.filter(before).select('VV'))).mean(),
  descending.filter(before).select('VH').mean()
]).focal_median();

var composite_VV_VH_after = ee.Image.cat([
  ascending.filter(after).select('VH').mean(),
  ee.ImageCollection(ascending.filter(after).select('VV').merge(descending.filter(after).select('VV'))).mean(),
  descending.filter(after).select('VH').mean()
]).focal_median();


// Display as a composite of polarization and backscattering characteristics.
Map.addLayer(composite_VV_VH_before, {min: [-25, -20, -25], max: [0, 10, 0]}, 'Composite Before');
Map.addLayer(composite_VV_VH_after, {min: [-25, -20, -25], max: [0, 10, 0]}, 'Composite After');

Map.centerObject(geometry, 13);

// Make a composite
Map.addLayer(composite_VV_VH_before.addBands(composite_VV_VH_after), {min: -25, max: 0}, 'VV HV stack');


// Given that Sentinal-1 SAR data is already pre-processed, I would do a simple subtraction
var change = composite_VV_VH_after.subtract(composite_VV_VH_before)
// Change
var params = {min: -2, max: 2};
Map.addLayer(change, params, 'Change');
// Here the whites - are the big changes
// Very pink fields - unchanged

