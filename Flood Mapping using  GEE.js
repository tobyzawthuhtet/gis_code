// Visualization Environmental Imapcts in Myannmar using satellite imagery
//Visualizing Flood crisis in Myanmar 
// Bamho Flood project

//You can copy that code in Google Earth Engine to start your processing
//https://tobyzawthuhtet.users.earthengine.app/view/dohphandeefloodproject 
//visualization can be reached by this app

var g3 = ee.Geometry.Polygon([
  [95.75868532846388,23.407681975936104],
  [96.92323610971388,23.407681975936104],
  [96.92323610971388,24.41451793106226],
  [95.75868532846388,24.41451793106226],
  [95.75868532846388,23.407681975936104]
  ])
  
var geometry = ee.Geometry.Polygon( [
  [95.36126130326876,22.996882234635734],
  [97.55852692826876,22.996882234635734],
  [97.55852692826876,24.904426792501074],
  [95.36126130326876,24.904426792501074],
  [95.36126130326876,22.996882234635734]
  ]
    )
Map.centerObject(g3,13);
var polarization ="VV" ;


var S1 = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filterBounds(g3)//change to geometry
  .filterDate('2018-6-01','2018-06-30')
  .select(polarization);


//Add first image to map to get an idea of what a SAR image looks like  
Map.addLayer(S1.first(),{bands: 'VV',min: -18, max: 0}, 'SAR image', 0)

// Filter speckle noise
var filterSpeckles = function(img) {
  var vv = img.select('VV') //select the VV polarization band
  var vv_smoothed = vv.focal_median(100,'circle','meters').rename('VV_Filtered') //Apply a focal median filter
  return img.addBands(vv_smoothed) // Add filtered VV band to original image
}

// Map speckle noise filter across collection. Result is same collection, with smoothed VV band added to each image
S1 = S1.map(filterSpeckles)

//Add speckle filtered image to map to sompare with raw SAR image
Map.addLayer(S1.first(),{bands: 'VV_Filtered',min: -18, max: 0}, 'Filtered SAR image',0)

var classifyWater = function(img) {
  var vv = img.select('VV_Filtered')
  var water = vv.lt(-12).rename('Water')  //Identify all pixels below threshold and set them equal to 1. All other pixels set to 0
  water = water.updateMask(water) //Remove all pixels equal to 0
  return img.addBands(water)  //Return image with added classified water band
  }

//Map classification across sentinel-1 collection and print to console to inspect
S1 = S1.map(classifyWater)
var waterbodies = S1.map(classifyWater)
print(S1)
Map.addLayer(S1.first().clip(g3),{bands: 'Water',min: -18, max: 0, palette : ['#FFFFFF','#0000FF']}, 'Water Bodies')
//Make time series of water pixels within region
var ClassChart = ui.Chart.image.series({
  imageCollection: S1.select('Water'),
  region: geometry,//change to G3
  reducer: ee.Reducer.sum(),
  scale: 100,
})
  .setOptions({
      title: 'Inundated Pixels',
      hAxis: {'title': 'Date'},
      vAxis: {'title': 'Number of Inundated Pixels'},
      lineWidth: 2
    })

//Set the postion of the chart and add it to the map    
ClassChart.style().set({
    position: 'bottom-right',
    width: '500px',
    height: '300px'
  });
  
Map.add(ClassChart)

var label = ui.Label('Click a point on the chart to visualize the flood extent for that date.');
Map.add(label);

//Create callbakc function that adds image to the map coresponding with clicked data point on chart
ClassChart.onClick(function(xValue, yValue, seriesName) {
    if (!xValue) return;  // Selection was cleared.
  
    // Show the image for the clicked date.
    var equalDate = ee.Filter.equals('system:time_start', xValue);
//Find image coresponding with clicked data and clip water classification to roi 
    var classification = ee.Image(S1.filter(equalDate).first()).select('Water'); 
    var SARimage = ee.Image(S1.filter(equalDate).first());
  //Make map layer based on SAR image, reset the map layers, and add this new layer
    var S1Layer = ui.Map.Layer(SARimage, {
      bands: ['VV'],
      max: 0,
      min: -20
    });
    Map.layers().reset([]);
  var visParams = {
      min: 0,
      max: 1,
      palette: ['#FFFFFF','#0000FF']
    }
    //Add water classification on top of SAR image
    Map.addLayer(classification.clip(g3),visParams,'Water')
    
    // Show a label with the date on the map.
    label.setValue((new Date(xValue)).toUTCString());
  });
  
  

//Map.addLayer(waterbodies ,{min :-18, max :0,palette :['#FFFFFF','#0000FF']}, 'Water Bodies' )

//Add legends

// set position of panel
var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px'
  }
});
 
// Create legend title
var legendTitle = ui.Label({
  value: 'Legend',
  style: {
    fontWeight: 'bold',
    fontSize: '18px',
    margin: '0 0 4px 0',
    padding: '0'
    }
});
 
// Add the title to the panel
legend.add(legendTitle);
 
// Creates and styles 1 row of the legend.
var makeRow = function(color, name) {
 
      // Create the label that is actually the colored box.
      var colorBox = ui.Label({
        style: {
          backgroundColor: '#' + color,
          // Use padding to give the box height and width.
          padding: '8px',
         margin: '0 0 4px 0'
        }
      });
 
      // Create the label filled with the description text.
      var description = ui.Label({
        value: name,
        style: {margin: '0 0 4px 6px'}
      });
 
  // return the panel
      return ui.Panel({
        widgets: [colorBox, description],
        layout: ui.Panel.Layout.Flow('horizontal')
      });
};
 
//  Palette with the colors
var palette =[ '22ff00', '1500ff'];
 
// name of the legend
var names = ['Buffer Area ','Water Bodies'];
 
// Add color and and names
for (var i = 0; i < 2; i++) {
  legend.add(makeRow(palette[i], names[i]));
  }  
 
// add legend to map (alternatively you can also print the legend to the console)
Map.add(legend);
