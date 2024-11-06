//begin script when window loads
window.onload = setMap(); 

//set up choropleth map
function setMap() {
    //use Promise.all to parallelize asynchronous data loading
    var promises = [d3.csv("data/unitsData.csv"),
                    d3.json("data/EuropeCountries.topojson.json"),
                    d3.json("data/FranceRegions.topojson.json")
                    ];

            Promise.all(promises).then(callback);

            function callback(data) {
                var csvData = data[0],
                europe = data[1], 
                france = data[2]; 
            console.log(csvData);
            console.log(europe);
            console.log(france);

            //translate europe TopoJSON
            var europeCountries = topojson.feature(europe, europe.objects.EuropeCountries),
                franceRegions = topojson.feature(france, france.objects.FranceRegions);

            //examine the results
            console.log(europeCountries);
            console.log(franceRegions);
            };
}