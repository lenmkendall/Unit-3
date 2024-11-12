//begin script when window loads
window.onload = setMap(); 

//set up choropleth map
function setMap() {
    
    //map frame dimensions
    var width = 960,
        height = 460;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height)

    //create Albers equal area conic projection centered on France
    var projection = d3.geoAlbers()
        .center([-0.6, 38.7])
        .rotate([96, 0])
        .parallels([29.5, 45.5])
        .scale(925)
        .translate([480, 250]); 

    var path = d3.geoPath()
        .projection(projection);
    
    //use Promise.all to parallelize asynchronous data loading
    var promises = [];
        
        promises.push(d3.csv("data/StatePopulation.csv")); //load attributes from csv
        promises.push(d3.json("data/Countries.topojson.json")); //load background spatial data
        promises.push(d3.json("data/States.topojson.json")); //load choropleth spatial data

        Promise.all(promises).then(callback);

            function callback(data) {
                var csvData = data[0],
                worldCountries = data[1], 
                worldStates = data[2]; 
            console.log(csvData);
            console.log(worldCountries);
            console.log(worldStates);

            //translate worldcountries TopoJSON
            var naCountries = topojson.feature(worldCountries, worldCountries.objects.Countries),
                usaStates = topojson.feature(worldStates, worldStates.objects.States).features;

            //add Countries to map
            var countries = map.append("path")
                .datum(naCountries)
                .attr("class", "countries")
                .attr("d", path);

            //add stats regions to map
            var states = map.selectAll(".name")
                .data(usaStates)
                .enter()
                .append("path")
                .attr("class", function(d) {
                    return "states " + d.properties.adm1_code;
                })
                .attr("d", path);

            //examine the results
            //console.log(europeCountries);
            //console.log(franceRegions);
            }; 
}