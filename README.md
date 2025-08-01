# BA-JustinLL-UHI-Hamburg
Bachelorarbeit: Dynamiken städtischer Wärmeinseln (UHI) - Zeitserienanalyse der Auswirkungen urbaner Grünflächen auf das lokale Klima in Hamburg. Analyse mit Google Earth Engine 

Der Code befasst sich mit der Analyse der Dynamiken städtischer Wärmeinseln (UHI) und wird in diesem Repository zur Verfügung gestellt. Für die Reproduzierbarkeit ist zu vernehmen, dass Teile des Codes nach Belieben angepasst werden müssen, um die genaue Analyse der Bachelorarbeit nacharbeiten zu können. Darunter allen voran Zeile 190 Denn für die Berechnung der Indizes sowie die Distanz zur nächsten Grünfläche wurde jeweils der Ausschnitt ausgewählt, welcher zeitlich mit "sommerbildMedian" manuell ausgewählt wurde. Soll die Dist to Green in einem anderen Jahr analysiert werden, muss dies also händisch angepasst werden. Des Weiteren lassen sich mit der Funktion ab Zeile 1111 die Layer in der Karte anzeigen, sowie für den Export bereitstellen. Soll dies nicht bei jedem Re-run des Codes erfolgen, muss die Funktion vorher ausgegraut werden /* */
Zudem kommen in Zeile 352 bei der Funktion saisonStats_lst in der Wintersaison Fehlermeldungen, aufgrund schlechter Datenlage der Saison. Es ist dennoch beabsichtigt, dass die Fehlermeldung im Code bestehen bleibt, da Sie innerhalb der Bachelorarbeit als Kritik beim Reflektieren der Methode bestehen bleibt.

Quellen:
-Google Documentation (o. J.). Google Earth Engine API-Dokumentation.URL: https://developers.google.com/earth-engine/apidocs (Stand: 28.07.25)
-LST Visualisierung: Medium.com:URL:https://medium.com/@ridhomuh002/analyzing-land-surface-temperature-lst-with-landsat-8-data-in-google-earth-engine-f4dd7ca28e70 (Stand: 26.07.25)
-OpenAI: ChatGPT (Version o4), https://chat.openai.com/, Stand: 22.07.2025.*
-Youtube: Google Earth Engine Tut 153 | Our First Land Surface Temperature Image for our ROI | View From Space: https://www.youtube.com/watch?v=Q-ONsvJpPSA
-YouTube: Google Earth Engine Tut 154 | An Iteration Process to Generate Many LST Images | View From Space: https://www.youtube.com/watch?v=WHtMY9etmtw&t=12s
-YouTube: Google Earth Engine Tut 156 | Change of Dataset to Better Present LST & UHI Images | View From Space: https://www.youtube.com/watch?v=aV5PVeuXw7A
-YouTube: Google Earth Engine Tut 157 | Land Surface Temperature Images & Time Series Charts | View From Space: https://www.youtube.com/watch?v=5sQrId6DJJA
-YouTube: Google Earth Engine Tut 162 | In Pursuit of Urban Heat Map or Hot Spot for the ROI | View From Space: https://www.youtube.com/watch?v=HayJdZuB4YY
-YouTube: Google Earth Engine 101: An Introduction for Complete Beginners: https://www.youtube.com/watch?v=oAElakLgCdA&t=1806s
-Youtube: Google Earth Engine Tutorial-50: Urban Green Space Monitoring, using Sentinel-2: https://www.youtube.com/watch?v=BP_UtJ1i_MY
-Youtube: How to Estimate Urban Green Space using Sentinel 2A imagery in Google Earth Engine: https://www.youtube.com/watch?v=QxwJwCdKi0E
-YouTube: LST, Urban Heat Island Effect, and UTFVI Analysis using Google Earth Engine and Landsat dataset: https://www.youtube.com/watch?v=5W84zme9QmE

*Hinweis: ChatGPT wurde innerhalb der Arbeit zur Bestimmung und Ausmerzung von Fehlerquellen im Code verwendet, sowie zur Strukturhilfe einiger Funktionen (layer_jahre_export, l8_preparel7_l5_prepare und zonenAnalyseJahr)
Zur Erstellung des QR-Codes wurde R verwendet
