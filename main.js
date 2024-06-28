// ***IMPORT MODULES FROM OPENLAYERS***
import './style.css';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM.js';
import XYZ from 'ol/source/XYZ';
import Geolocation from 'ol/Geolocation.js';
import Feature from 'ol/Feature.js';
import Point from 'ol/geom/Point.js';
import { circular } from 'ol/geom/Polygon';
import { Vector as VectorSource } from 'ol/source.js';
import { Vector as VectorLayer } from 'ol/layer.js';
import { fromLonLat, transform } from 'ol/proj';
import Control from 'ol/control/Control';
import { ScaleLine, defaults as defaultControls } from 'ol/control.js';
import {
  Circle as CircleStyle,
  Fill,
  RegularShape,
  Stroke,
  Style,
  Text,
} from 'ol/style.js';
import { Draw, Modify } from 'ol/interaction.js';
import { LineString } from 'ol/geom.js';
import { getArea, getLength } from 'ol/sphere.js';
import KML from 'ol/format/KML';
import TileDebug from 'ol/source/TileDebug.js';

// ***DEFINE SOME MAP CONSTANTS AND GLOBAL VARS AT THE OUTSET***
const defaultmapcenter = [106, 4];
const defaultmapstartzoom = 5;
const mapmaxzoom = 18;
const mapurl = 'http://'+ window.location.hostname + ":" + window.location.port
var starturl = ''
var previousurl = ''

// ***ARE WE LOADING FROM PARAMETERS IN THE URL***
const queryString = window.location.search;
console.log(queryString);
const urlParams = new URLSearchParams(queryString);
if (urlParams.has('x') && urlParams.has('y') && urlParams.has('z')) {
  const startx = urlParams.get('x');
  console.log(startx);
  const starty = urlParams.get('y');
  console.log(starty);
  const startz = urlParams.get('z');
  console.log(startz);
  mapstartzoom = startz;
  mapcenter = [startx, starty]
} else {
  var mapstartzoom = defaultmapstartzoom;
  var mapcenter = defaultmapcenter;
}


// Measuring tool stuff
const typeSelect = document.getElementById('type');
const showSegments = document.getElementById('segments');
const clearPrevious = document.getElementById('clear');

const style = new Style({
  fill: new Fill({
    color: 'rgba(255, 255, 255, 0.2)',
  }),
  stroke: new Stroke({
    color: 'rgba(255, 69, 0, 0.5)',
    lineDash: [10, 10],
    width: 2,
  }),
  image: new CircleStyle({
    radius: 5,
    stroke: new Stroke({
      color: 'rgba(0, 0, 0, 0.7)',
    }),
    fill: new Fill({
      color: 'rgba(255, 255, 255, 0.2)',
    }),
  }),
});

const labelStyle = new Style({
  text: new Text({
    font: '14px Calibri,sans-serif',
    fill: new Fill({
      color: 'rgba(255, 255, 255, 1)',
    }),
    backgroundFill: new Fill({
      color: 'rgba(0, 0, 0, 0.7)',
    }),
    padding: [3, 3, 3, 3],
    textBaseline: 'bottom',
    offsetY: -15,
  }),
  image: new RegularShape({
    radius: 8,
    points: 3,
    angle: Math.PI,
    displacement: [0, 10],
    fill: new Fill({
      color: 'rgba(0, 0, 0, 0.7)',
    }),
  }),
});

const tipStyle = new Style({
  text: new Text({
    font: '12px Calibri,sans-serif',
    fill: new Fill({
      color: 'rgba(255, 255, 255, 1)',
    }),
    backgroundFill: new Fill({
      color: 'rgba(0, 0, 0, 0.4)',
    }),
    padding: [2, 2, 2, 2],
    textAlign: 'left',
    offsetX: 15,
  }),
});

const modifyStyle = new Style({
  image: new CircleStyle({
    radius: 5,
    stroke: new Stroke({
      color: 'rgba(0, 0, 0, 0.7)',
    }),
    fill: new Fill({
      color: 'rgba(0, 0, 0, 0.4)',
    }),
  }),
  text: new Text({
    text: 'Drag to modify',
    font: '12px Calibri,sans-serif',
    fill: new Fill({
      color: 'rgba(255, 255, 255, 1)',
    }),
    backgroundFill: new Fill({
      color: 'rgba(0, 0, 0, 0.7)',
    }),
    padding: [2, 2, 2, 2],
    textAlign: 'left',
    offsetX: 15,
  }),
});

const segmentStyle = new Style({
  text: new Text({
    font: '12px Calibri,sans-serif',
    fill: new Fill({
      color: 'rgba(255, 255, 255, 1)',
    }),
    backgroundFill: new Fill({
      color: 'rgba(0, 0, 0, 0.4)',
    }),
    padding: [2, 2, 2, 2],
    textBaseline: 'bottom',
    offsetY: -12,
  }),
  image: new RegularShape({
    radius: 6,
    points: 3,
    angle: Math.PI,
    displacement: [0, 8],
    fill: new Fill({
      color: 'rgba(0, 0, 0, 0.4)',
    }),
  }),
});

const segmentStyles = [segmentStyle];

const formatLength = function (line) {
  const length = getLength(line);
  let output;
  if (length > 100) {
    output = Math.round((length / 1000) * 100) / 100 + ' km';
  } else {
    output = Math.round(length * 100) / 100 + ' m';
  }
  return output;
};

const formatArea = function (polygon) {
  const area = getArea(polygon);
  let output;
  if (area > 10000) {
    output = Math.round((area / 1000000) * 100) / 100 + ' km\xB2';
  } else {
    output = Math.round(area * 100) / 100 + ' m\xB2';
  }
  return output;
};

const measuresource = new VectorSource();
const modify = new Modify({ source: measuresource, style: modifyStyle });
let tipPoint;

function styleFunction(feature, segments, drawType, tip) {
  const styles = [style];
  const geometry = feature.getGeometry();
  const type = geometry.getType();
  let point, label, line;
  if (!drawType || drawType === type) {
    if (type === 'Polygon') {
      point = geometry.getInteriorPoint();
      label = formatArea(geometry);
      line = new LineString(geometry.getCoordinates()[0]);
    } else if (type === 'LineString') {
      point = new Point(geometry.getLastCoordinate());
      label = formatLength(geometry);
      line = geometry;
    }
  }
  if (segments && line) {
    let count = 0;
    line.forEachSegment(function (a, b) {
      const segment = new LineString([a, b]);
      const label = formatLength(segment);
      if (segmentStyles.length - 1 < count) {
        segmentStyles.push(segmentStyle.clone());
      }
      const segmentPoint = new Point(segment.getCoordinateAt(0.5));
      segmentStyles[count].setGeometry(segmentPoint);
      segmentStyles[count].getText().setText(label);
      styles.push(segmentStyles[count]);
      count++;
    });
  }
  if (label) {
    labelStyle.setGeometry(point);
    labelStyle.getText().setText(label);
    styles.push(labelStyle);
  }
  if (
    tip &&
    type === 'Point' &&
    !modify.getOverlay().getSource().getFeatures().length
  ) {
    tipPoint = geometry;
    tipStyle.getText().setText(tip);
    styles.push(tipStyle);
  }
  return styles;
}

const vector = new VectorLayer({
  source: measuresource,
  style: function (feature) {
    return styleFunction(feature, showSegments.checked);
  },
});


// ***MAP LAYERS ARE DEFINED HERE***

// Debug index layer
const debuglayer = new TileLayer({
  source: new TileDebug(),
});

// Map boundary layer
const boundarylayer = new VectorLayer({
  source: new VectorSource({
    url: "./gis/kml/boundary.kml",
    format: new KML(),
  }),
});

// OSM layer
const osmlayer = new TileLayer({
  source: new OSM()
});

// Archaeological maps layer
const mapslayer = new TileLayer({
  source: new XYZ({
    // url: "http://" + window.location.hostname + ":" + window.location.port + "/gis/maptiles/{z}/{x}/{-y}.png",
    url: "./gis/maptiles/{z}/{x}/{y}.png",
  })
});

// Google satellite layer
const satlayer = new TileLayer({
  source: new XYZ({
    url: "https://mt0.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}",
  })
});

// Lidar hillshade layer
const lidarlayer = new TileLayer({
  source: new XYZ({
    // url: "http://"  + window.location.hostname + ":" + window.location.port + "/gis/hillshade/{z}/{x}/{y}.png",
    url: "./gis/hillshade/{z}/{x}/{y}.png",
  })
});

// ***OPENLAYERS MAP HERE***
const view = new View({
  center: transform(mapcenter, 'EPSG:4326', 'EPSG:3857'),
  enableRotation: false,
  zoom: mapstartzoom,
  maxZoom: mapmaxzoom
});

const map = new Map({
  target: 'map',
  layers: [
    osmlayer,
    satlayer,
    lidarlayer,
    mapslayer,
    boundarylayer,
    vector
  ],
  view: view
});

// Add a scale bar
var scaleline = new ScaleLine({
  minWidth: 140,
});
map.addControl(scaleline);

// Opacity slider - maps
const opacityInputmaps = document.getElementById('opacity-input-maps');
function updatemaps() {
  const opacitymaps = parseFloat(opacityInputmaps.value);
  mapslayer.setOpacity(opacitymaps);
  boundarylayer.setOpacity(opacitymaps);
}
opacityInputmaps.addEventListener('input', updatemaps);
updatemaps();

// Opacity slider - lidar
const opacityInputlidar = document.getElementById('opacity-input-lidar');
function updatelidar() {
  const opacitylidar = parseFloat(opacityInputlidar.value);
  lidarlayer.setOpacity(opacitylidar);
}
opacityInputlidar.addEventListener('input', updatelidar);
updatelidar();

// Opacity slider - satellite
const opacityInputsatellite = document.getElementById('opacity-input-satellite');
function updatesatellite() {
  const opacitysatellite = parseFloat(opacityInputsatellite.value);
  satlayer.setOpacity(opacitysatellite);
}
opacityInputsatellite.addEventListener('input', updatesatellite);
updatesatellite()

// GEOLOCATION
const source = new VectorSource();
const layer = new VectorLayer({
  source: source,
});
map.addLayer(layer);

navigator.geolocation.watchPosition(
  function (pos) {
    const coords = [pos.coords.longitude, pos.coords.latitude];
    const accuracy = circular(coords, pos.coords.accuracy);
    source.clear(true);
    source.addFeatures([
      new Feature(
        accuracy.transform('EPSG:4326', map.getView().getProjection())
      ),
      new Feature(new Point(fromLonLat(coords))),
    ]);
  },
  function (error) {
    alert(`ERROR: ${error.message}`);
  },
  {
    enableHighAccuracy: true,
  }
);

const locate = document.createElement('div');
locate.className = 'ol-control ol-unselectable locate';
locate.innerHTML = '<button title="Locate me"><span class="material-symbols-outlined">satellite_alt</span></button>';
locate.addEventListener('click', function () {
  if (!source.isEmpty()) {
    var currentzoom = map.getView().getZoom();
    map.getView().fit(source.getExtent(), {
      maxZoom: currentzoom,
      duration: 500,
    });
  }
});

map.addControl(
  new Control({
    element: locate,
  })
);

// Add measuring tool button 
var measuring = false;
const measure = document.createElement('div');
measure.className = 'ol-control ol-unselectable measure';
measure.innerHTML = '<button title="Measure"><span class="material-symbols-outlined">square_foot</span></button>';
measure.addEventListener('click', function () {
  //alert("here");
  if (measuring === false) {
    addInteraction();
    measure.style.backgroundColor = "orangered";
    measure.style.left = "0.4em"
    measure.style.padding = "2px";
    measuring = true;
  } else if (measuring === true) {
    measuresource.clear();
    measure.style.backgroundColor = "lightgrey";
    measure.style.padding = "0px"
    measure.style.left = "0.5em"
    map.removeInteraction(draw);
    measuring = false;
  };
});
map.addControl(
  new Control({
    element: measure,
  })
);

// More measuring tool stuff
map.addInteraction(modify);
let draw; // global so we can remove it later

function addInteraction() {
  const drawType = typeSelect.value;
  const activeTip =
    'Click to continue drawing the ' +
    (drawType === 'Polygon' ? 'polygon' : 'line') +
    '\nDouble-click to finish measurement';
  const idleTip = 'Click to start measuring';
  let tip = idleTip;
  draw = new Draw({
    source: measuresource,
    type: drawType,
    style: function (feature) {
      return styleFunction(feature, showSegments.checked, drawType, tip);
    },
  });
  draw.on('drawstart', function () {
    //alert("drawstart")
    if (clearPrevious.checked) {
      measuresource.clear();
    }
    modify.setActive(false);
    tip = activeTip;
  });
  draw.on('drawend', function () {
    //alert("drawend")
    modifyStyle.setGeometry(tipPoint);
    modify.setActive(true);
    map.once('pointermove', function () {
      modifyStyle.setGeometry();
    });
    tip = idleTip;
  });
  //alert("here")
  modify.setActive(true);
  map.addInteraction(draw);
}

typeSelect.onchange = function () {
  map.removeInteraction(draw);
  addInteraction();
};

//addInteraction();

showSegments.onchange = function () {
  vector.changed();
  draw.getOverlay().changed();
};


// Zoom level button
const zoomdisplay = document.getElementById("currentzoom");
var currZoom = map.getView().getZoom();
// set initial
zoomdisplay.innerHTML = currZoom.toFixed(6);
//listen for moves
map.on('movestart', function (e) {
  previousurl = window.location.href;
});
map.on('moveend', function (e) {
  var newZoom = map.getView().getZoom();
  if (currZoom != newZoom) {
    zoomdisplay.innerHTML = newZoom.toFixed(6);
    console.log('zoom end, new zoom: ' + newZoom);
    currZoom = newZoom;
  }
  // also update the url on moveend
  updateurl()
});

// Testing button
const element = document.getElementById("testbutton")
element.addEventListener("click", function () {
  alert("Zoom level: " + view.getZoom())
  measuresource.clear();
  map.removeInteraction(draw);
});

// Debug button
const debugbutton = document.getElementById("debugbutton")
var debug = false;
debugbutton.addEventListener("click", function () {
  if (debug === false) {
    map.addLayer(debuglayer);
    debug = true;
  } else if (debug === true) {
    map.removeLayer(debuglayer);
    debug = false;
  }
});


// Create a reload button
const reloadpage = document.createElement('div');
reloadpage.className = 'ol-control ol-unselectable reloadpage';
reloadpage.innerHTML = '<button title="Reset Viewer"><span class="material-symbols-outlined">captive_portal</span></button>';
reloadpage.addEventListener('click', function () {
  window.location.href = mapurl;
});
// add the button
map.addControl(
  new Control({
    element: reloadpage,
  })
); 


// Create a go back button
const gobackview = document.createElement('div');
gobackview.className = 'ol-control ol-unselectable gobackview';
gobackview.innerHTML = '<button title="Go back to previous view"><span class="material-symbols-outlined">undo</span></button>';
gobackview.addEventListener('click', function () {
  if (previousurl !== '') {
    window.location.href = previousurl;
  }
});
// add the button
map.addControl(
  new Control({
    element: gobackview,
  })
); 


// Create copy to clipboard button
const copytoclip = document.createElement('div');
copytoclip.className = 'ol-control ol-unselectable copytoclip';
copytoclip.innerHTML = '<button title="Copy location to clipboard"><span class="material-symbols-outlined">file_copy</span></button>';
copytoclip.addEventListener('click', function () {
  // get map x y z
  let coords = getcurrentxyz();
  let currentx = coords.currentx;
  let currenty = coords.currenty;
  let currentz = coords.currentz;
  // construct string to copy, catching port if weird (otherwise browser returns 0 or null)
  if (window.location.port !== null && window.location.port !== 0 && window.location.port !== '') {
    var nextport = ":" + window.location.port;
  } else {
    var nextport = '';
  }
  var urltocopy = 'http://' + window.location.hostname + nextport + '/?x=' + currentx + '&y=' + currenty + '&z=' + currentz;
  console.log(urltocopy);
  // do the copying
  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(urltocopy);
      console.log('Content copied to clipboard');
      alert("Link to this view copied to clipboard") // to replace with tooltip eventually
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  }
  copyContent()
});
// add the button
map.addControl(
  new Control({
    element: copytoclip,
  })
); 


// gets the current x y z of the view
function getcurrentxyz() {
  var currentcenter = transform(map.getView().getCenter(), 'EPSG:3857', 'EPSG:4326');
  let currentx = currentcenter[0].toFixed(6);
  let currenty = currentcenter[1].toFixed(6);
  let currentz = map.getView().getZoom().toFixed(6);
  console.log(currentx, currenty, currentz);
  return {currentx, currenty, currentz};
}


// a function to update the URL with the current x y z 
function updateurl() {
  // get current x y z
  let coords = getcurrentxyz();
  let currentx = coords.currentx;
  let currenty = coords.currenty;
  let currentz = coords.currentz;
  // construct new URL, catching ports unless default which browers return as null or 0
  if (window.location.port !== null && window.location.port !== 0 && window.location.port !== '') {
    var nextport = ":" + window.location.port;
  } else {
    var nextport = '';
  }
  const nextURL = 'http://' + window.location.hostname + nextport + '/?x=' + currentx + '&y=' + currenty + '&z=' + currentz;
  const nextTitle = 'LidarViewer';
  const nextState = { additionalInformation: 'Updated the URL with JS' };
  // This will replace the current entry in the browser's history, without reloading
  window.history.replaceState(nextState, nextTitle, nextURL);
}
// do it on map load
updateurl();
starturl = window.location.href;
// does it on move as well see moveend listener above


