/* Bachelorarbeit: Dynamiken städtischer Wärmeinseln: 
Zeitserienanalyse der Auswirkungen urbaner Grünflächen auf das lokale Klima in Hamburg


Der folgende Code befasst sich mit der Erstellung von Oberflächentemperaturen (LST), 
Zeitserienanalysen der LST, sowie verschiedener Indizes (NDVI, NDBI), Distanz zur nächsten Grünfläche,
Flächenberechnung urbaner und begrünter Flächen, Validierung der Ergebnisse durch Korrelationen
für den gegebenen Untersuchungsraum der Hansestadt hamburg über ein zeitintervall von 1994 bis 2024.
Genutzt wurden Landsat 5, 7 und 8 Daten.

Für Quellen steht das GitHub-Repository zur Verfügung: 

Abgabe: 02.08.2025
Autor: Justin Lingg-Laham
E-Mail: stu235613@uni-kiel.de
*/

// Untersuchungsgebiet Hamburg
Map.addLayer(hamburg_gadm, {color: "blue"}, "ROI",false);
Map.setCenter(10.0, 53.55, 10);

var clipToCol = function(image){
  return image.clip(hamburg_gadm)
}

// Zeitraum der Klimaanalyse 
var start = ee.Date("1994-01-01")
var dateRange = ee.DateRange(start, start.advance(31, "year"));

//Vorverarbeitung

// Landsat Daten aufbereiten: Wolken Maskieren
function maskL8sr(image) {
  var cloudBitMask = 1 << 3;
  var cloudShadowBitMask = 1 << 4;
  var qa = image.select("QA_PIXEL")
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
                  .and(qa.bitwiseAnd(cloudShadowBitMask).eq(0));
  return image.updateMask(mask);  
}

function maskL7_5sr(image) {
  var cloudBitMask = 1 << 3;
  var cloudShadowBitMask = 1 << 4;
  var qa = image.select("QA_PIXEL")
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
                  .and(qa.bitwiseAnd(cloudShadowBitMask).eq(0));
  return image.updateMask(mask);  
}

// Landsat 8: Bänderbearbeitung: Skalierungsfaktoren
function l8_prepare(image){
  var opticalBands = image.select(["SR_B2", "SR_B3", "SR_B4", "SR_B5", "SR_B6", "SR_B7"])
                          .multiply(0.0000275)
                          .add(-0.2)
                          .rename(["blue", "green", "red", "nir", "swir1", "swir2"]);
  var thermalBands = image.select("ST_B10")
                          .multiply(0.00341802)
                          .add(149.0)
                          .rename("temp");
                          
  var tempMask = image.select("ST_B10").gt(0);
  var newImage = opticalBands.addBands(thermalBands).updateMask(tempMask);
  return newImage.copyProperties(image, image.propertyNames());
}

// Landsat 7&5: Bänderbearbeitung: Skalierungsfaktoren
function l7_l5_prepare(image){
  
  var opticalBands = image.select(["SR_B1", "SR_B2", "SR_B3", "SR_B4", "SR_B5", "SR_B7"])
                          .multiply(0.0000275)
                          .add(-0.2)
                          .rename(["blue", "green", "red", "nir", "swir1", "swir2" ]);
  var thermalBands = image.select("ST_B6")
                          .multiply(0.00341802)
                          .add(149.0)
                          .rename("temp");
  
  var tempMask = image.select("ST_B6").gt(0); 
  
  var newImage = opticalBands.addBands(thermalBands) .updateMask(tempMask);
  return newImage.copyProperties(image, image.propertyNames());
}

// Indizes Berechnen: NDVI und NDBI
function indizes(image){
  var ndvi = image.normalizedDifference(["nir", "red"]).rename("NDVI");
  var ndbi = image.normalizedDifference(["swir1", "nir"]).rename("NDBI");
  return image.addBands(ndvi).addBands(ndbi);
}

//  Landsat 8: ImageCollections erstellen
var l8 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")
     .filterBounds(hamburg_gadm)
     .filterDate(dateRange)
     .filter(ee.Filter.lt("CLOUD_COVER", 30))
     .map(clipToCol)
     .map(maskL8sr)
     .map(l8_prepare)
     .map(indizes)
     .map(function(image) {
       var lst = image.select("temp").subtract(273.15).rename("LST");
       return image.addBands(lst.float()); 
       });

// LAndsat 5 & 7: ImageCollection erstellen 
var l7 = ee.ImageCollection("LANDSAT/LE07/C02/T1_L2")
     .filterBounds(hamburg_gadm)
     .filterDate(dateRange)
     .filter(ee.Filter.lt("CLOUD_COVER", 30))
     .map(clipToCol)
     .map(maskL7_5sr)
     .map(l7_l5_prepare)
     .map(indizes)
     .map(function(image) {
       var lst = image.select("temp").subtract(273.15).rename("LST");
       return image.addBands(lst.float()); 
      });
     
var l5 = ee.ImageCollection("LANDSAT/LT05/C02/T1_L2")
     .filterBounds(hamburg_gadm)
     .filterDate(dateRange)
     .filter(ee.Filter.lt("CLOUD_COVER", 30))
     .map(clipToCol)
     .map(maskL7_5sr)
     .map(l7_l5_prepare)
     .map(indizes)
     .map(function(image) {
       var lst = image.select("temp").subtract(273.15).rename("LST");
       return image.addBands(lst.float());
      });
     
// Kombination der ImageCollections zu einer Gesamt-Collection
var kombi = l8.merge(l7).merge(l5);

// Visualisierung der Gesamt-Collection (RGB und LST) 
var lstVis = {min: 20, max:40, palette:['040274', '040281', '0502a3', '0502b8', '0502ce', '0502e6',
    '0602ff', '235cb1', '307ef3', '269db1', '30c8e2', '32d3ef',
    '3be285', '3ff38f', '86e26f', '3ae237', 'b5e22e', 'd6e21f',
    'fff705', 'ffd611', 'ffb613', 'ff8b13', 'ff6e08', 'ff500d',
    'ff0000', 'de0101', 'c21301', 'a71001', '911003']};
var rgbVis = {bands: ["red", "green", "blue"], min: 0.0, max: 0.3 };


// Saisonale Collections erstellen
function saison (collection, start_monat, end_monat) {
  return collection.filter(ee.Filter.calendarRange(start_monat, end_monat, "MONTH"));
}
var frueling = saison(kombi, 3, 5);
var sommer = saison(kombi, 6, 8);
var herbst = saison(kombi, 9, 11);
var winter = kombi.filter(ee.Filter.or(  
                       ee.Filter.calendarRange(12,12,"month"),
                       ee.Filter.calendarRange(1,2,"month")
                       ));

// Median jeder Saison
var saisonMedian = {
  frueling: frueling.median(),
  sommer: sommer.median(),
  herbst: herbst.median(),
  winter: winter.median()
};

print("Bilder in Collektion:", kombi.size())
print("Bilder im Frühling:", frueling.size())
print("Bilder im Sommer:", sommer.size())
print("Bilder im Herbst:", herbst.size())
print("Bilder im Winter:", winter.size())

// NDVI und NDBI Visualisierung
var ndviVis = {min: 0, max: 1, palette: ["brown", "yellow", "green"]};
var ndbiVis = {min: -0.5, max: 0.5, palette: ["blue", "white", "brown"]}

// Funktion: Masken (NDVI, NDBI) 
function masked(image){
  var ndvi_mask = image.select("NDVI");
  var ndbi_mask = image.select("NDBI");
  
  var greenMask = ndvi_mask.gt(0.68);
  var urbanMask = ndbi_mask.gt(-0.15);
  return image.addBands(greenMask.rename("ndvi_mask")).addBands(urbanMask.rename("ndbi_mask"));
}
var kombi_mask = kombi.map(masked)
 
var ndviMaskVis = {min: 0, max: 1, palette:["00000000","00FF00"]};
var ndbiMaskVis = {min: 0, max: 1, palette:["00000000","FF0000"]};

// NDVI-Histogramm (WICHTIG: Datum des sommerbildMedian muss manuell angepasst werden, wenn Analyse komplett reproduziert werden soll!) )
var sommerbildMedian = kombi.filterDate("2024-06-01", "2024-08-31").median();

var ndviChart = ui.Chart.image.histogram({
  image: sommerbildMedian.select("NDVI"),
  region: hamburg_gadm,
  scale: 30,
  minBucketWidth: 0.01
}).setOptions({
  title: "NDVI-Verteilung in Hamburg",
  hAxis: {title: "NDVI-Wert"},
  vAxis: {title: "Pixelanzahl"},
  series: [{color: "green"}]
});
print(ndviChart);

// NDBI-Histogramm
var ndbiChart = ui.Chart.image.histogram({
  image: sommerbildMedian.select("NDBI"),
  region: hamburg_gadm,
  scale: 30,
  minBucketWidth: 0.01
}).setOptions({
  title: "NDBI-Verteilung in Hamburg",
  hAxis: {title: "NDBI-Wert"},
  vAxis: {title: "Pixelanzahl"},
  series: [{color: "gray"}]
});
print(ndbiChart);

// Saisonale Masken verschmelzen
var frueling_mask = saison(kombi_mask, 3,5)
var sommer_mask = saison(kombi_mask, 6, 8);
var herbst_mask = saison(kombi_mask, 9, 11);
var winter_mask = kombi_mask.filter(ee.Filter.or(  
                       ee.Filter.calendarRange(12,12,"month"),
                       ee.Filter.calendarRange(1,2,"month")
                       ));


// Distanz zur nächsten Grünfläche
var ndvi_schwelle_gruen = 0.68;

var ndvi = sommerbildMedian.select("NDVI");

var greenMask_final = ndvi.gt(ndvi_schwelle_gruen);

var distanzPixel = greenMask_final.fastDistanceTransform(500, "pixels").sqrt();
var distanzMeter = distanzPixel.multiply(ee.Image.pixelArea().sqrt()).rename("dist_to_green_m");


var distToGreenVis = {min: 0, max: 500, palette:["green", "yellow", "orange", "red", "gray"]}; 
Map.addLayer(distanzMeter.clip(hamburg_gadm), distToGreenVis, "Distanz zum Grün (Meter)");
// NDVI anzeigen
var ndviVisExample = {min: 0.1, max: 0.9, palette: ["brown", "yellow", "green"]}; 
Map.addLayer(ndvi.clip(hamburg_gadm), ndviVisExample,"NDVI");
// Grünmaske anzeigen
Map.addLayer(greenMask_final.clip(hamburg_gadm), {palette: ["black", "green"]}, "Grünmaske (NDVI > 0.68)");

var ndvi_export = ndvi.clip(hamburg_gadm).updateMask(ndvi.clip(hamburg_gadm).mask());
var distanz_export = distanzMeter.clip(hamburg_gadm).updateMask(distanzMeter.clip(hamburg_gadm).mask());
var greenMask_export = greenMask_final.clip(hamburg_gadm).updateMask(greenMask_final.clip(hamburg_gadm).mask());

Export.image.toDrive({
  image: ndvi_export,
  description: 'Export_NDVI_Hamburg',
  folder: 'GEE_Exports',
  fileNamePrefix: 'ndvi_hamburg',
  region: hamburg_gadm,
  scale: 30,
  crs: 'EPSG:25832',
  maxPixels: 1e13
});

Export.image.toDrive({
  image: distanz_export,
  description: 'Export_Distanz_zum_Gruen',
  folder: 'GEE_Exports',
  fileNamePrefix: 'distanz_zum_gruen',
  region: hamburg_gadm.geometry(),
  scale: 30,
  crs: 'EPSG:25832',
  maxPixels: 1e13
});

Export.image.toDrive({
  image: greenMask_export,
  description: 'Export_Gruen_Maske',
  folder: 'GEE_Exports',
  fileNamePrefix: 'gruen_maske',
  region: hamburg_gadm.geometry(),
  scale: 30,
  crs: 'EPSG:25832',
  maxPixels: 1e13
});

// Zonalstatistik: 4 Jahre Vergleichen (Distanz zum Grün)

var jahre = [1994, 2004, 2014, 2024];
var zonenGrenzen = [0, 60, 120, 300, 500];  

// Funktion: Berechnung LST-Zonenstatistik
function zonenAnalyseJahr(jahr) {
  var sommerBild = kombi.filterDate(jahr + "-06-01", jahr + "-08-31").median().clip(hamburg_gadm);

  // Distanz zum Grünen
  var greenMask = sommerBild.select("NDVI").gt(ndvi_schwelle_gruen);
  var dist = greenMask.fastDistanceTransform(500, "pixels").sqrt().multiply(30).rename("dist");

  // LST Bild
  var lst = sommerBild.select("LST");

  // Zonen in Meter
  var zone1 = dist.gt(0).and(dist.lte(60));
  var zone2 = dist.gt(60).and(dist.lte(120));
  var zone3 = dist.gt(120).and(dist.lte(300));
  var zone4 = dist.gt(300).and(dist.lte(500));
  var zone5 = dist.gt(500);

  var zonen = {
    "Zone 1: 0 bis 60 m": zone1,
    "Zone 2:  60 bis 120 m": zone2,
    "Zone 3: 120 bis 300 m": zone3,
    "Zone 4: 300 bis 500 m": zone4,
    "Zone 5: 500 und mehr m": zone5
  };

var ergebnisse = ee.FeatureCollection(
   Object.keys(zonen).map(function(zonenname) {
     var maske = zonen[zonenname];
     var maskedLST = lst.updateMask(maske);
      var reduziert = maskedLST.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: hamburg_gadm,
        scale: 30,
        maxPixels: 1e13
      });
      
     return ee.Feature(null, reduziert).set("zone", zonenname).set("jahr", jahr);
   })
 );

 return ergebnisse;
}
var alleZonenDaten = ee.FeatureCollection(jahre.map(zonenAnalyseJahr)).flatten();
print("Zonale Statistik: LST pro Jahr:", alleZonenDaten);

var zonaleStatistik_balken = ui.Chart.feature.groups({
  features: alleZonenDaten,
  xProperty: 'jahr',
  yProperty: 'LST',
  seriesProperty: 'zone'
}).setChartType('ColumnChart')
  .setOptions({
    title: 'Mittlere LST pro Jahr (Gruppierung nach Distanzzonen)',
    hAxis: {title: 'Jahr', format: '####',gridlines: {count: 4}},
    vAxis: {title: 'Mittlere LST (°C)',viewWindow: {min: null}},
    legend: {position: 'top'},
    colors: ['green', 'yellow', 'orange', "red", 'gray'] 
  });
print(zonaleStatistik_balken);

// Standartabweichung und Mittelwert LST pro Saison
var saisonStats_lst = function(collection, year, seasonName, startMonth, endMonth) {
    var startDate, endDate;
    //Spezalfall Winter:
    if (startMonth === 12 && endMonth === 2) {
    startDate = ee.Date.fromYMD(year, 12, 1);
    endDate = ee.Date.fromYMD(year + 1, 3, 1);  
  } else {
    startDate = ee.Date.fromYMD(year, startMonth, 1);
    endDate = ee.Date.fromYMD(year, endMonth, 1).advance(1, "month");
  }

  var seasonalCol = collection.filterDate(startDate, endDate);

  var medianImage = seasonalCol.median();
  var lst = medianImage.select("LST");

  var lst_mean = ee.Number(lst.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: hamburg_gadm,
    scale: 30,
    maxPixels: 1e13
  }).values().get(0));

  var lst_stddev = ee.Number(lst.reduceRegion({
    reducer: ee.Reducer.stdDev(),
    geometry: hamburg_gadm,
    scale: 30,
    maxPixels: 1e13
  }).values().get(0));

print(seasonName + " " + year + " - Mittelwert LST (°C):", lst_mean);
print(seasonName + " " + year + " - Standardabweichung LST (°C):", lst_stddev);
};
saisonStats_lst(kombi, 1994, "Frühling", 3, 5);
saisonStats_lst(kombi, 2004, "Frühling", 3, 5);
saisonStats_lst(kombi, 2014, "Frühling", 3, 5);
saisonStats_lst(kombi, 2024, "Frühling", 3, 5);
saisonStats_lst(kombi, 1994, "Sommer", 6, 8);
saisonStats_lst(kombi, 2004, "Sommer", 6, 8);
saisonStats_lst(kombi, 2014, "Sommer", 6, 8);
saisonStats_lst(kombi, 2024, "Sommer", 6, 8);
saisonStats_lst(kombi, 1994, "Herbst", 9, 11);
saisonStats_lst(kombi, 2004, "Herbst", 9, 11);
saisonStats_lst(kombi, 2014, "Herbst", 9, 11);
saisonStats_lst(kombi, 2024, "Herbst", 9, 11);
saisonStats_lst(kombi, 1994, "Winter", 12, 2);
saisonStats_lst(kombi, 2004, "Winter", 12, 2);
saisonStats_lst(kombi, 2014, "Winter", 12, 2);
saisonStats_lst(kombi, 2024, "Winter", 12, 2);

// Erstellung saisonaler Zeitserien der Oberflächentemperatur (LST)

var jahre = ee.List.sequence(1994, 2024);

// zeitserienanalyse: Sommer (LSt)

var jaehrlicheSommerLST = jahre.map(function(jahr) {

  jahr = ee.Number(jahr);

  var start = ee.Date.fromYMD(jahr, 6, 1);
  var end = ee.Date.fromYMD(jahr, 8, 31);
  var imageSommer = sommer.filterDate(start, end);
  var sommerMedian = imageSommer.select("LST").median();
  
  var mittlereLst = sommerMedian.reduceRegion({
    reducer: ee.Reducer.median(), 
    geometry: hamburg_gadm,
    scale: 120, 
    maxPixels: 1e9
  }).get("LST");
  
  // Datum für die Plotachse festlegen 
  return ee.Feature(null, {
    "system:time_start": ee.Date.fromYMD(jahr, 7, 15).millis(),
    "LST_Sommer_Mittel": mittlereLst
  });
});
var sommerFeatureCollection = ee.FeatureCollection(jaehrlicheSommerLST).filter(ee.Filter.notNull(["LST_Sommer_Mittel"]));

var sommerChart = ui.Chart.feature.byFeature({
  features: sommerFeatureCollection,
  xProperty: "system:time_start",
  yProperties: ["LST_Sommer_Mittel"]
}).setOptions({
  title: "Zeitserie: Jährlicher LST-Median im Sommer",
  vAxis: {title: " LST (°C)"},
  hAxis: {title: "Jahr", format: "YYYY", gridlines: {count: 10}},
  pointSize: 5,
  lineWidth: 2,
  colors: ["red"],
  trendlines: {0: {
      type: "linear", 
      color: "black",
      lineWidth: 1,
      visibleInLegend: true,
    }
  }
});

print("Diagramm: Sommer LST:", sommerChart);

// (FeatureCollection) jährliche Perzentile (5, 50, 95)

var jaehrlicheSommerLST = jahre.map(function(jahr) {
  jahr = ee.Number(jahr);
  var start = ee.Date.fromYMD(jahr, 6, 1);
  var end = ee.Date.fromYMD(jahr, 8, 31);
  var imageSommer = sommer
    .filterDate(start, end)
    .select("LST");

  var sommerPerzentile = imageSommer.reduce(
    ee.Reducer.percentile([5, 50, 95])
  );

  var sommerStats = sommerPerzentile.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: hamburg_gadm,
    scale: 120,
    maxPixels: 1e9
  });

  return ee.Feature(null, {
    "system:time_start": ee.Date.fromYMD(jahr, 7, 15).millis(),
    "LST_Sommer_P5": sommerStats.get("LST_p5"),
    "LST_Sommer_Median": sommerStats.get("LST_p50"),
    "LST_Sommer_P95": sommerStats.get("LST_p95")
  });
});

// FeatureCollection erstellen und leere Jahre rausfiltern
var sommerPerzentilFeatureC = ee.FeatureCollection(jaehrlicheSommerLST)
  .filter(ee.Filter.notNull(["LST_Sommer_Median"]));

var sommerChartPerzentile = ui.Chart.feature.byFeature({
  features: sommerPerzentilFeatureC,
  xProperty: "system:time_start",
  yProperties: ["LST_Sommer_P5", "LST_Sommer_Median", "LST_Sommer_P95"]
}).setOptions({
  title: "Zeitserie: Sommer LST-Perzentile pro Jahr in Hamburg",
  hAxis: {title: "Jahr", format: "YYYY"},
  vAxis: {title: "LST (°C)"},
  lineWidth: 2,
  pointSize: 4,
  colors: ["blue", "red", "orange"],
  series: {
    0: {label: "5%-Perzentil"},
    1: {label: "Median"},
    2: {label: "95%-Perzentil"}
  }
});

print("Jährliche Sommer-LST Perzentile (1994–2024)", sommerChartPerzentile);

// Zeitserienanalyse: Frühling (LST)
var jaehrlicheFruelingLST = jahre.map(function(jahr) {

  jahr = ee.Number(jahr);
  
  var start = ee.Date.fromYMD(jahr, 3, 1);
  var end = ee.Date.fromYMD(jahr, 5, 30);
  
  var imageFrueling = frueling.filterDate(start, end);
  
  var fruelingMedian = imageFrueling.select("LST").median();
  
  var mittlereLst = fruelingMedian.reduceRegion({
    reducer: ee.Reducer.median(), 
    geometry: hamburg_gadm,
    scale: 120, 
    maxPixels: 1e9
  }).get("LST");
  
  return ee.Feature(null, {
    "system:time_start": ee.Date.fromYMD(jahr, 4, 15).millis(),
    "LST_Frueling_Mittel": mittlereLst
  });
});

var featureCollectionfrueling = ee.FeatureCollection(jaehrlicheFruelingLST).filter(ee.Filter.notNull(["LST_Frueling_Mittel"]));

var fruelingChart = ui.Chart.feature.byFeature({
  features: featureCollectionfrueling,
  xProperty: "system:time_start",
  yProperties: ["LST_Frueling_Mittel"]
}).setOptions({
  title: "Jährlicher Frueling LST-Median ",
  vAxis: {title: " LST (°C)"},
  hAxis: {title: "Jahr", format: "YYYY", gridlines: {count: 10}},
  pointSize: 5,
  lineWidth: 2,
  colors: ["pink"],
  trendlines: {0: {
      type: "linear", 
      color: "black",
      lineWidth: 1,
      visibleInLegend: true,
    }
  }
});

print("Diagramm Frühling LST:", fruelingChart);

// Zeitserie: Frühling Perzentile (5,50,95)

var jaehrlicheFruelingLST = jahre.map(function(jahr) {
  jahr = ee.Number(jahr);
  var start = ee.Date.fromYMD(jahr, 3, 1);
  var end = ee.Date.fromYMD(jahr, 5, 30);

  var imageFrueling = frueling.filterDate(start, end).select("LST");

  var fruelingPerzentile = imageFrueling.reduce(ee.Reducer.percentile([5, 50, 95]));

  var fruelingStats = fruelingPerzentile.reduceRegion({
    reducer: ee.Reducer.mean(),  
    geometry: hamburg_gadm,
    scale: 120,
    maxPixels: 1e9
  });

  return ee.Feature(null, {
    "system:time_start": ee.Date.fromYMD(jahr, 4, 15).millis(),
    "LST_Frueling_P5": fruelingStats.get("LST_p5"),
    "LST_Frueling_Median": fruelingStats.get("LST_p50"),
    "LST_Frueling_P95": fruelingStats.get("LST_p95")
  });
});

var fruelingPerzentilFeatureC = ee.FeatureCollection(jaehrlicheFruelingLST)
  .filter(ee.Filter.notNull(["LST_Frueling_Median"]));

// ZeitserienDiagramm erstellen
var chartFruelingPercentile = ui.Chart.feature.byFeature({
  features: fruelingPerzentilFeatureC,
  xProperty: "system:time_start",
  yProperties: ["LST_Frueling_P5", "LST_Frueling_Median", "LST_Frueling_P95"]
}).setOptions({
  title: "Frühlings- LST-Perzentile pro Jahr (Hamburg)",
  hAxis: {title: "Jahr", format: "YYYY"},
  vAxis: {title: "LST (°C)"},
  lineWidth: 2,
  pointSize: 4,
  colors: ["blue", "red", "orange"],
  series: {
    0: {label: "5%-Perzentil"},
    1: {label: "Median"},
    2: {label: "95%-Perzentil"}
  }
});

print("Jährliche Frühling-LST Perzentile (1994–2024)", chartFruelingPercentile);

var jaehrlicheHerbstLST = jahre.map(function(jahr) {
  jahr = ee.Number(jahr);

  var start = ee.Date.fromYMD(jahr, 9, 1);
  var end = ee.Date.fromYMD(jahr, 11, 30);
  var imageHerbst = herbst.filterDate(start, end);

  var anzahlBilderHerbst = imageHerbst.size();
  var mittlereLst = ee.Algorithms.If(
    anzahlBilderHerbst.gt(0),
    imageHerbst.select("LST").median().reduceRegion({
      reducer: ee.Reducer.median(),
      geometry: hamburg_gadm,
      scale: 120,
      maxPixels: 1e9
    }).get("LST"), null
  );
  return ee.Feature(null, {
    "system:time_start": ee.Date.fromYMD(jahr, 10, 15).millis(),
    "LST_Herbst_Mittel": mittlereLst
  });
});

var herbstFeatureCollection = ee.FeatureCollection(jaehrlicheHerbstLST).filter(ee.Filter.notNull(["LST_Herbst_Mittel"]));

var herbstChart = ui.Chart.feature.byFeature({
  features: herbstFeatureCollection,
  xProperty: "system:time_start",
  yProperties: ["LST_Herbst_Mittel"]
}).setOptions({
  title: "Zeitserie: Jährlicher LST-Median im Herbst",
  vAxis: {title: " LST (°C)"},
  hAxis: {title: "Jahr", format: "YYYY", gridlines: {count: 10}},
  pointSize: 5,
  lineWidth: 2,
  colors: ["green"],
  trendlines: {0: {
      type: "linear", 
      color: "black",
      lineWidth: 1,
      visibleInLegend: true,
    }
  }
});

print("Diagramm: Herbst LST:", herbstChart);

// (FeatureCollection) jährliche Perzentile (5, 50, 95)

var jaehrlicheHerbstLST = jahre.map(function(jahr) {
  jahr = ee.Number(jahr);
  var start = ee.Date.fromYMD(jahr, 9, 1);
  var end = ee.Date.fromYMD(jahr, 11, 30);
  var imageHerbst = herbst
    .filterDate(start, end)
    .select("LST");
  var anzahlBilderherbst = imageHerbst.size();
  
  var herbstStats = ee.Algorithms.If(anzahlBilderherbst.gt(0),
    imageHerbst.reduce(ee.Reducer.percentile([5, 50, 95]))
              .reduceRegion({
                reducer: ee.Reducer.mean(),
                geometry: hamburg_gadm,
                scale: 120,
                maxPixels: 1e9
             }),null
  );

   return ee.Algorithms.If(herbstStats, 
    ee.Feature(null, {
      "system:time_start": ee.Date.fromYMD(jahr, 10, 15).millis(),
      "LST_Herbst_P5": ee.Dictionary(herbstStats).get("LST_p5"),
      "LST_Herbst_Median": ee.Dictionary(herbstStats).get("LST_p50"),
      "LST_Herbst_P95": ee.Dictionary(herbstStats).get("LST_p95")
    }),
    ee.Feature(null, {
      "system:time_start": ee.Date.fromYMD(jahr, 10, 15).millis(),
      "LST_Herbst_P5": null,
      "LST_Herbst_Median": null,
      "LST_Herbst_P95": null
    })
  );
});

var herbstPerzentilFeatureC = ee.FeatureCollection(jaehrlicheHerbstLST)
  .filter(ee.Filter.notNull(["LST_Herbst_Median"]));

var herbstChartPerzentile = ui.Chart.feature.byFeature({
  features: herbstPerzentilFeatureC,
  xProperty: "system:time_start",
  yProperties: ["LST_Herbst_P5", "LST_Herbst_Median", "LST_Herbst_P95"]
}).setOptions({
  title: "Zeitserie: Herbst LST-Perzentile pro Jahr in Hamburg",
  hAxis: {title: "Jahr", format: "YYYY"},
  vAxis: {title: "LST (°C)"},
  lineWidth: 2,
  pointSize: 4,
  colors: ["blue", "red", "orange"],
  series: {
    0: {label: "5%-Perzentil"},
    1: {label: "Median"},
    2: {label: "95%-Perzentil"}
  }
});
print("Jährliche Herbst-LST Perzentile (1994–2024)", herbstChartPerzentile);

// Zeitserienanalyse: Winter (LST)
var jaehrlicheWinterLST = jahre.map(function(jahr) {

  jahr = ee.Number(jahr);
  
  var start = ee.Date.fromYMD(jahr, 12, 1);
  var end = ee.Date.fromYMD(jahr.add(1), 2, 28);
  var imageWinter = winter.filterDate(start, end);
  var imageAnzahlWinter = imageWinter.size();
  
  var mittlereLst = ee.Algorithms.If(imageAnzahlWinter.gt(0), imageWinter.select("LST").median().reduceRegion({
    reducer: ee.Reducer.median(), 
    geometry: hamburg_gadm,
    scale: 120, 
    maxPixels: 1e9
  }).get("LST"), null);
  return ee.Feature(null, {
    "system:time_start": ee.Date.fromYMD(jahr.add(1),1,15).millis(), "LST_Winter_Mittel": mittlereLst
  });
});

var featureCollectionwinter = ee.FeatureCollection(jaehrlicheWinterLST).filter(ee.Filter.notNull(["LST_Winter_Mittel"]));

var winterChart = ui.Chart.feature.byFeature({
  features: featureCollectionwinter,
  xProperty: "system:time_start",
  yProperties: ["LST_Winter_Mittel"]
}).setOptions({
  title: "Jährlicher Winter LST-Median ",
  vAxis: {title: " LST (°C)"},
  hAxis: {title: "Jahr", format: "YYYY", gridlines: {count: 10}},
  pointSize: 5,
  lineWidth: 2,
  colors: ["blue"],
  trendlines: {0: {
      type: "linear", 
      color: "black",
      lineWidth: 1,
      visibleInLegend: true,
    }
  }
});

print("Diagramm Winter LST:", winterChart);

// Zeitserie: Winter Perzentile (5,50,95%)

var jaehrlicheWinterLST = jahre.map(function(jahr) {
  jahr = ee.Number(jahr);
  var start = ee.Date.fromYMD(jahr, 12, 1);
  var end = ee.Date.fromYMD(jahr.add(1), 2, 28);
  var imageWinter = winter.filterDate(start, end).select("LST");
  var imageAnzahlWiner = imageWinter.size();
  
  var winterStats = ee.Algorithms.If(
    imageAnzahlWiner.gt(0), 
    imageWinter.reduce(ee.Reducer.percentile([5,50,95]))
    .reduceRegion({
    reducer: ee.Reducer.mean(),  
    geometry: hamburg_gadm,
    scale: 120,
    maxPixels: 1e9
  }), null);

  return ee.Algorithms.If(winterStats,
     ee.Feature(null, {
    "system:time_start": ee.Date.fromYMD(jahr.add(1), 1, 15).millis(),
    "LST_Winter_P5": ee.Dictionary(winterStats).get("LST_p5"),
    "LST_Winter_Median": ee.Dictionary(winterStats).get("LST_p50"),
    "LST_Winter_P95": ee.Dictionary(winterStats).get("LST_p95")
  }), ee.Feature(null, {
    "system:time_start": ee.Date.fromYMD(jahr.add(1), 1, 15).millis(),
    "LST_Winter_P5": null,
    "LST_Winter_Median": null,
    "LST_Winter_P95": null,
    })
  );
});

var winterPerzentilFeatureC = ee.FeatureCollection(jaehrlicheWinterLST)
  .filter(ee.Filter.notNull(["LST_Winter_Median"]));

// Zeitserien-Diagramm erstellen
var chartWinterPercentile = ui.Chart.feature.byFeature({
  features: winterPerzentilFeatureC,
  xProperty: "system:time_start",
  yProperties: ["LST_Winter_P5", "LST_Winter_Median", "LST_Winter_P95"]
}).setOptions({
  title: "Winter- LST-Perzentile pro Jahr (Hamburg)",
  hAxis: {title: "Jahr", format: "YYYY"},
  vAxis: {title: "LST (°C)"},
  lineWidth: 2,
  pointSize: 4,
  colors: ["blue", "red", "orange"],
  series: {
    0: {label: "5%-Perzentil"},
    1: {label: "Median"},
    2: {label: "95%-Perzentil"}
  }
});

print("Jährliche Winter-LST Perzentile (1994–2024)", chartWinterPercentile);

// Erstellung: Ganzjährlicher Zeitserien (LST, NDVI, NDBI)

// Zeitserie: Gesamtkollection (LST)
var timeSeries_Gesamt_LST = ui.Chart.image.series({
  imageCollection: kombi.select("LST"),
  region: hamburg_gadm,
  reducer: ee.Reducer.median(),
  scale: 30,
  xProperty: "system:time_start"})
  .setOptions({
    title: "Zeitserie: Oberflächentemperatur (LST) für 30 Jahre in Hamburg: Median",
    vAxis: {title: "LST (°C)"},
    pointSize: 1,
    trendlines: {0:{"type": "linear", "color": "red"}}
  });
print(timeSeries_Gesamt_LST)

// Zeitserie: Gesamtkollection (NDVI)
var timeSeries_Gesamt_NDVI = ui.Chart.image.series({
  imageCollection: kombi.select("NDVI"),
  region: hamburg_gadm,
  reducer: ee.Reducer.median(),
  scale: 30,
  xProperty: "system:time_start"})
  .setOptions({
    title: "Zeitserie: NDVI für 30 Jahre in Hamburg: Median",
    vAxis: {title: "NDVI"},
    pointSize: 1,
    trendlines: {0:{"type": "linear", "color": "red"}}
  });
print(timeSeries_Gesamt_NDVI)

// zeitserie: GEsamtkollektion (NDBI)
var timeSeries_Gesamt_NDBI = ui.Chart.image.series({
  imageCollection: kombi.select("NDBI"),
  region: hamburg_gadm,
  reducer: ee.Reducer.median(),
  scale: 30,
  xProperty: "system:time_start"})
  .setOptions({
    title: "Zeitserie: NDBI für 30 Jahre in Hamburg: Median",
    vAxis: {title: "NDBI"},
    pointSize: 1,
    trendlines: {0:{"type": "linear", "color": "red"}}
  });
print(timeSeries_Gesamt_NDBI)

// Zeitserie: jährlicher Sommer-NDVI (nur Sommer) Pro Saison gemittelt
var jaehrlicherSommerNDVI = jahre.map(function(jahr) {
  jahr = ee.Number(jahr);

  var start = ee.Date.fromYMD(jahr, 6, 1); 
  var end = ee.Date.fromYMD(jahr, 8, 31);   
  var medianNDVI = ee.Algorithms.If(sommer.filterDate(start, end).size().gt(0), sommer.filterDate(start, end)
      .select("NDVI")
      .median() 
      .reduceRegion({
        reducer: ee.Reducer.median(),
        geometry: hamburg_gadm,
        scale: 30, 
        maxPixels: 1e9
      }).get("NDVI"),
    null 
  );
  return ee.Feature(null, {
    "system:time_start": ee.Date.fromYMD(jahr, 7, 15).millis(), // Zeitstempel in die Mitte des Sommers
    "NDVI_Sommer_Median": medianNDVI
  });
});

var featureCollectionSommerNDVI = ee.FeatureCollection(jaehrlicherSommerNDVI)
  .filter(ee.Filter.notNull(["NDVI_Sommer_Median"]));

var sommerNdviChart = ui.Chart.feature.byFeature({
  features: featureCollectionSommerNDVI,
  xProperty: "system:time_start",
  yProperties: ["NDVI_Sommer_Median"]
}).setOptions({
  title: "Jährlicher Sommer-NDVI in Hamburg (Median)",
  vAxis: {title: "NDVI"},
  hAxis: {title: "Jahr", format: "YYYY", gridlines: {count: 10}},
  pointSize: 5,
  lineWidth: 2,
  colors: ["lime"], 
  trendlines: {
    0: {
      type: "linear",
      color: "black",
      lineWidth: 1,
      visibleInLegend: true
    }
  }
});

print("Diagramm jährlicher Sommer-NDVI:", sommerNdviChart);

// zeitserie: Jährliche LST mit gemittelten Jahren
var jaehrlicheLstGesamt = jahre.map(function(jahr) {
  jahr = ee.Number(jahr);
  
  var start = ee.Date.fromYMD(jahr, 1, 1);
  var end = ee.Date.fromYMD(jahr, 12, 31);
  
  var bilderImJahr = kombi.filterDate(start, end);
  
  var medianLst = bilderImJahr.select("LST").median()
    .reduceRegion({
      reducer: ee.Reducer.median(),
      geometry: hamburg_gadm,
      scale: 120, 
      maxPixels: 1e9
    }).get("LST");
    
  return ee.Feature(null, {
    "system:time_start": ee.Date.fromYMD(jahr, 6, 15).millis(), 
    "LST_Jahres_Median": medianLst
  });
});

var featureCollectionGesamt = ee.FeatureCollection(jaehrlicheLstGesamt)
    .filter(ee.Filter.notNull(["LST_Jahres_Median"]));

var lst_gemitteltejahre_chart = ui.Chart.feature.byFeature({
  features: featureCollectionGesamt,
  xProperty: "system:time_start",
  yProperties: ["LST_Jahres_Median"]
}).setOptions({
  title: "Jährlicher LST-Median in Hamburg (Gemittelt)",
  vAxis: {title: "LST (°C)"},
  hAxis: {title: "Jahr", format: "YYYY", gridlines: {count: 10}},
  pointSize: 5,
  lineWidth: 2,
  trendlines: {0: {
    type: "linear",
    color: "black",
    lineWidth: 1,
    visibleInLegend: true
  }}
});

print("Gemittelte Jahre LST", lst_gemitteltejahre_chart);

// FlächenBerechnungen

// Hamburg Flächenberechnung
var hamburgFlaeche = ee.Image.pixelArea().reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: hamburg_gadm,
  scale:30,
  maxPixels: 1e13
})
var hamburgFlaecheKm2 = ee.Number(hamburgFlaeche.get("area")).divide(1000000);
print("Hamburgs Gesamtfläche (km2)",hamburgFlaecheKm2)

// Funktion zur GrünFlächenberechnung pro Jahr im Sommer 

var zeitspanne = ee.List.sequence(1994, 2024);

var flaechenProJahr = zeitspanne.map(function(jahr) {
  jahr = ee.Number(jahr);

  var sommerStart = ee.Date.fromYMD(jahr, 6, 1);
  var sommerEnd = ee.Date.fromYMD(jahr, 8, 31);
  
  var jahresbildSommer = kombi.filterDate(sommerStart, sommerEnd).median(); 

  var ndviMaske = jahresbildSommer.select("NDVI").gt(0.68);
  var ndbiMaske = jahresbildSommer.select("NDBI").gt(-0.15);

  var greenArea = ndviMaske.multiply(ee.Image.pixelArea()).reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: hamburg_gadm,
    scale: 30,
    maxPixels: 1e13
  });

  var urbanArea = ndbiMaske.multiply(ee.Image.pixelArea()).reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: hamburg_gadm,
    scale: 30,
    maxPixels: 1e13
  });
  return ee.Feature(null, {
    "Jahr": jahr,
    "Gruenflaeche_km2": ee.Number(greenArea.get("NDVI")).divide(1000000),
    "Urbaneflaeche_km2": ee.Number(urbanArea.get("NDBI")).divide(1000000)
  });
});

var flaechenFC = ee.FeatureCollection(flaechenProJahr);
print("Jährliche Flächen (Grün & Urban) in km2", flaechenFC);

var daten_trennen = flaechenFC.map(function(flaeche) {
  var jahr = flaeche.get("Jahr");
  var gruen = ee.Feature(null, {
    'Jahr': jahr,
    'Flaeche': flaeche.get("Gruenflaeche_km2"),
    'Typ': 'Grünfläche'
  });
  var urban = ee.Feature(null, {
    'Jahr': jahr,
    'Flaeche': flaeche.get("Urbaneflaeche_km2"),
    'Typ': 'urbanefläche'
  });
  return ee.FeatureCollection([gruen, urban]);
}).flatten();var chart = ui.Chart.feature.groups({
  features: daten_trennen,
  xProperty: 'Jahr',
  yProperty: 'Flaeche',
  seriesProperty: 'Typ'
}).setChartType('ColumnChart')
  .setOptions({
    title: 'Grün- und urbane Fläche in Hamburg (1994–2024)',
    hAxis: {title: 'Jahr', format: '####'},
    vAxis: {title: 'Fläche (km²)'},
    legend: {position: 'top'},
    colors: ['green', 'gray']
  });

print(chart);

// Validierung

// Korrelation: NDBI und LST (PearsonKorrelation)
var korrelation_NDBI_LST = kombi.map(function(image) {
  var ndBi = image.select("NDBI");
  var lst = image.select("LST");
  return ndBi.addBands(lst).set("system:time_start", image.get("system:time_start"));
});

var korrelation_NDBILST_chart = ui.Chart.image.series({
  imageCollection: korrelation_NDBI_LST,
  region: hamburg_gadm,
  reducer: ee.Reducer.pearsonsCorrelation(),
  scale: 30,
  xProperty: "system:time_start"
}).setOptions({
  title: "Pearson-Korrelation: NDBI und LST in Hamburg ",
  vAxis: {title: "Korrelationskoeffizient"},
  trendlines: {0: {type: "linear", color: "black"}},
  pointSize: 3
});
print(korrelation_NDBILST_chart);

// Korrelation: NDVI und LST (PearsonKorrelation)
var korrelation_NDVI_LST = kombi.map(function(image) {
  var ndVi = image.select("NDVI");
  var lst = image.select("LST");
  return ndVi.addBands(lst).set("system:time_start", image.get("system:time_start"));
});

var korrelation_NDVILST_chart = ui.Chart.image.series({
  imageCollection: korrelation_NDVI_LST,
  region: hamburg_gadm,
  reducer: ee.Reducer.pearsonsCorrelation(),
  scale: 30,
  xProperty: "system:time_start"
}).setOptions({
  title: "Pearson-Korrelation: NDVI und LST in Hamburg",
  vAxis: {title: "Korrelationskoeffizient"},
  trendlines: {0: {type: "linear", color: "black"}},
  pointSize: 3
});
print(korrelation_NDVILST_chart);

// Korrelation: Distanz zum Grün
function distanzzumGruen_dynamisch(image) {
 var greenMask = image.select("NDVI").gt(ndvi_schwelle_gruen);
 var distanzPixel = greenMask.fastDistanceTransform(500, "pixels").sqrt();
 var distanzMeter = distanzPixel.multiply(ee.Image.pixelArea().sqrt()).rename("dist_to_green_m");
 return image.addBands(distanzMeter);
}
var sommer_mit_distanz = sommer.map(distanzzumGruen_dynamisch);
var distanzBeispiel = sommer_mit_distanz.filterDate("2024-06-01", "2024-08-31").median();

var korrelation_Dist_LST = sommer_mit_distanz.map(function(image) {
  var dist = image.select("dist_to_green_m");
  var lst = image.select("LST");
  return dist.addBands(lst); 
});
var korrelation_DISTLST_chart = ui.Chart.image.series({
   imageCollection: korrelation_Dist_LST,
   region: hamburg_gadm,
   reducer: ee.Reducer.pearsonsCorrelation(),
   scale: 120, 
   xProperty: "system:time_start"
}).setOptions({
   title: "Pearson-Korrelation: Distanz zum Grünen und LST",
   vAxis: {title: "Korrelationskoeffizient"},
  trendlines: {0: {type: "linear", color: "black"}},
   pointSize: 3
});
print(korrelation_DISTLST_chart);


// Darstellung in Karte und Export (Für Analyse nicht wichtig, aber zur Illustration und Export )
function layer_jahre_export(collection, band, year, visParams, label, exportName) {
  var image = collection
    .filterDate(year + "-01-01", year + "-12-31")
    .select(band)
    .median();

  // Darstellung auf Karte
  Map.addLayer(image, visParams, label + " " + year);

  // Export als GeoTIFF
  Export.image.toDrive({
    image: image.clip(hamburg_gadm), // falls du auf Hamburg begrenzen willst
    description: exportName + "_" + year,
    folder: "GEE_Exports", // oder dein Wunschordner auf Google Drive
    fileNamePrefix: exportName + "_" + year,
    region: hamburg_gadm, 
    scale: 30, 
    crs: "EPSG:25832", 
    maxPixels: 1e13
  });
}
layer_jahre_export(kombi, "NDBI", 2024, ndbiVis, "NDBI", "ndbi_2024",false);
layer_jahre_export(sommer, "LST", 1994, lstVis, "LST", "lst_1994_sommer",false);
layer_jahre_export(sommer, "LST", 2004, lstVis, "LST", "lst_2004_sommer",false);
layer_jahre_export(sommer, "LST", 2014, lstVis, "LST", "lst_2014_sommer",false);
layer_jahre_export(sommer, "LST", 2024, lstVis, "LST", "lst_2024_sommer",false);
layer_jahre_export(frueling, "LST", 1994, lstVis, "LST", "lst_1994_frueling",false);
layer_jahre_export(frueling, "LST", 2004, lstVis, "LST", "lst_2004_frueling",false);
layer_jahre_export(frueling, "LST", 2014, lstVis, "LST", "lst_2014_frueling",false);
layer_jahre_export(frueling, "LST", 2024, lstVis, "LST", "lst_2024_frueling",false);
layer_jahre_export(herbst, "LST", 1994, lstVis, "LST", "lst_1994_herbst",false);
layer_jahre_export(herbst, "LST", 2004, lstVis, "LST", "lst_2004_herbst",false);
layer_jahre_export(herbst, "LST", 2014, lstVis, "LST", "lst_2014_herbst",false);
layer_jahre_export(herbst, "LST", 2024, lstVis, "LST", "lst_2024_herbst",false);
layer_jahre_export(winter, "LST", 1994, lstVis, "LST", "lst_1994_winter",false);
layer_jahre_export(winter, "LST", 2004, lstVis, "LST", "lst_2004_winter",false);
layer_jahre_export(winter, "LST", 2014, lstVis, "LST", "lst_2014_winter",false);
layer_jahre_export(winter, "LST", 2024, lstVis, "LST", "lst_2024_winter",false);

