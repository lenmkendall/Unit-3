//wrap everything in a self-executing anonymous function to move to local scope
(function() {

    //pseudo-global variables
    var attrArray = ["total_pop", "pop_over65"]; //list of attributes
    var expressed = attrArray[0]; //initial attribute

    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 473,
        leftPadding = 25,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    //create a scale to size bars proportionally to frame and for axis
    var yScale = d3.scaleLinear()
        .range([463, chartHeight])
        .domain([0,40000000]);

    //begin script when window loads
    window.onload = setMap(); 

    //set up choropleth map
    function setMap() {
    
        //map frame dimensions
        var width = window.innerWidth * 0.5,
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
            .rotate([92, 0])
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
                    var csvData = data[0], worldCountries = data[1], worldStates = data[2]; 
                
                //console.log(csvData);
                //console.log(worldCountries);
                //console.log(worldStates);

                //translate worldcountries TopoJSON
                var naCountries = topojson.feature(worldCountries, worldCountries.objects.Countries),
                    usaStates = topojson.feature(worldStates, worldStates.objects.States).features;


                //add Countries to map
                var countries = map.append("path")
                    .datum(naCountries)
                    .attr("class", "countries")
                    .attr("d", path);

            //join csv data to GeoJSON enumeration units
            usaStates = joinData(usaStates, csvData);

            //create the color scale
            var colorScale = makeColorScale(csvData);

            //add enumeration units to the map
            setEnumerationUnits(usaStates, map, path, colorScale);
    
            //add coordinated visualization to the map
            setChart(csvData, colorScale);    

            //add dropdown to the map
            createDropdown(csvData);

            //change attribute
            //changeAttribute(attribute, csvData);

        };
}; //end of setMap()


//function joinData
function joinData(usaStates, csvData) {
            //variables for data join
            var attrArray = ["total_pop", "pop_over65"]; 

            //loop through csv to assign each set of csv attribute values to geojson state
            for (var i = 0; i < csvData.length; i++) {
                var csvState = csvData[i]; //the current state
                var csvKey = csvState.name; //the csv primary key

                //loop through geojson states to find correct region
                for (var a = 0; a < usaStates.length; a++) {

                    var geojsonProps = usaStates[a].properties; //the current state geojson properties

                    var geojsonKey = geojsonProps.name; //the geojson primary key

                    //where primary keys match, transfer csv data to geojson properties object
                    if (geojsonKey == csvKey) {

                        //assign all attributes and values
                        attrArray.forEach(function(attr) {
                            var val = parseFloat(csvState[attr]); //get csv attribute value
                            geojsonProps[attr] = val; //assign attribute and value to geojson properties
                        });
                    };
                };
            };
        return usaStates;
    };

    
//states block 
function setEnumerationUnits(usaStates, map, path, colorScale) {
            //add stats regions to map
            var states = map.selectAll(".name")
                .data(usaStates)
                .enter()
                .append("path")
                .attr("class", function(d) {
                    return "states " + d.properties.name;
                })
                .attr("d", path)
                .style("fill", function(d) {
                    var value = d.properties[expressed];
                    if (value) {
                        return colorScale(value);
                    } else {
                        return "#ccc";
                    }
                })
                .on("mouseover", function(event, d) {
                    highlight(d.properties);
                })
                .on("mouseout", function(event, d) {
                    dehighlight(d.properties);
                })
                .on("mousemove", moveLabel);
                var desc = states.append("desc")
                    .text('{"stroke": "#000", "stroke-width": "0.5px"}');

            //examine the results
            //console.log(naCountries);
            //console.log(usaStates);
            }; 


//function to create color scale generator quantile
function makeColorScale(data){
    var colorClasses = [
        "#D4B9DA",
        "#C994C7",
        "#DF65B0",
        "#DD1C77",
        "#980043"
    ];

    //create color scale generator
    var colorScale = d3.scaleQuantile()
        .range(colorClasses);

    //build array of all values of the expressed attribute
    var domainArray = [];
    for (var i=0; i<data.length; i++){
        var val = parseFloat(data[i][expressed]);
        domainArray.push(val);
    };

    //assign array of expressed values as scale domain
    colorScale.domain(domainArray);

    return colorScale;
};

//function to create coordinated bar chart
function setChart(csvData, colorScale) {
    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.425, 
        chartHeight = 460;
        leftPadding = 50,
        rightPadding = 2,
        topBottomPadding = 5
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";
        

    //create a second svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart"); 

    //create a rectangle for chart background fill
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);
        
    //create a scale to size bars proportionally to frame
    var yScale = d3.scaleLinear()
        .range([0, chartHeight])
        .domain([0, 40000000]); 

    //set bars for each state
    var bars = chart.selectAll(".bar")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b) {
            return b[expressed] - a[expressed]
        })
        .attr("class", function(d) {
            return "bar " + d.name;
        })
        .attr("width", chartInnerWidth / csvData.length - 1)
        .attr("x", function(d, i) {
            return i * (chartInnerWidth / csvData.length) + leftPadding;
        })
        .attr("height", function(d, i) {
            return 40000000 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i) {
            return chartHeight - yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        .style("fill", function(d) {
            return colorScale(d[expressed]);
        })
        .on("mouseover", function(event, d) {
            highlight(d);
        })
        .on("mouseout", function(event, d) {
            dehighlight(d);
        })
        .on("mousemove", moveLabel);

        var desc = bars.append("desc")
            .text('{"stroke": "none", "stroke-width": "0px"}');


    /*
    //annotate bars with attribute value text
    var numbers = chart.selectAll(".numbers")
        .data(csvData)
        .enter()
        .append("text")
        .sort(function(a, b) {
            return b[expressed] - a[expressed]
        })
        .attr("class", function(d) {
            return "numbers " + d.name;
        })
        .attr("text-anchor", "middle")
        .attr("x", function(d, i) {
            var fraction = chartWidth / csvData.length;
            return i * fraction + (fraction -1) / 2;
        })
        .attr("y", function(d) {
            return chartHeight - yScale(parseFloat(d[expressed])) + 0
        })
        .text(function(d) {
            return (d[expressed] / 1000000 + "M");
        }); */

    //create a text element for the chart title
    var charTitle = chart.append("text")
        .attr("x", 70)
        .attr("y", 40)
        .attr("class", "chartTitle")
        .text("Population in each State");

    //create vertical axis generator
    var yAxis = d3.axisLeft()
        .scale(yScale);

    //place axis
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);

    //create frame for chart border
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        //.attr("height", chartInnerHeight)
        .attr("transform", translate);
};

//function to create a dropdown menu for attribute selection
function createDropdown(csvData) {
    //add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function() {
            changeAttribute(this.value, csvData)
        });

    //add initial option
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Attribute");

    //add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d) { return d })
        .text(function(d) {return d });
};

//dropdown change event handler
function changeAttribute(attribute, csvData) {
    //change the expressed attribute
    expressed = attribute; 

    //recreate the color scale
    var colorScale = makeColorScale(csvData);

    //recolor enumeration units
    var usaStatesrecolor = d3.selectAll(".states")
        .transition()
        .duration(1000)
        .style("fill", function (d) {
            var value = d.properties[expressed];
            if (value) {
                return colorScale(d.properties[expressed]); //d.properties[expressed] in parenthesis
            } else {
                return "#ccc";
            }
    });

    //sort, resize, and recolor bars
    var bars = d3.selectAll(".bar")
        //sort bars
        .sort(function(a, b) {
            return b[expressed] - a[expressed];
        })
        .transition() //add animation
        .delay(function(d, i) {
            return i * 20
        })
        .duration(500);

    updateChart(bars, csvData.length, colorScale);

};


//function to position, size, and color bars in chart
function updateChart(bars, n, colorScale) {
    //position bars
    bars.attr("x", function(d, i) {
        return i * (chartInnerWidth / n) + leftPadding;
    })
    //size/resize bars
    .attr("height", function(d, i) {
        return 40000000 - yScale(parseFloat(d[expressed])) + topBottomPadding;
    })
    //color/recolor bars
    .style("fill", function(d) {
        var value = d[expressed];
        if(value) {
            return colorScale(value);
        } else {
            return "#ccc";
        }
    });
};

//function to highlight enumeration units and bars
function highlight(props) {
    //change stroke
    var selected = d3.selectAll("." + props.name)
        .style("stroke", "blue")
        .style("stroke-width", "2");
};

//function to reset the element style on mouseout
function dehighlight(props) {
    var selected = d3.selectAll("." + props.name)
        .style("stroke", function() {
            return getStyle(this, "stroke")
        })
        .style("stroke-width", function() {
            return getStyle(this, "stroke-width") 
        });

    function getStyle(element, styleName) {
        var styleText = d3.select(element)
            .select("desc")
            .text();

        var styleObject = JSON.parse(styleText);

        return styleObject[styleName];
    };
    //remove info label
    d3.select(".infolabel")
        .remove();
};

//function to create dynamic label
function setLabel(props) {
    //label content
    var labelAttribute = "<h1>" + props[expressed] + "</h1><b>" + expressed + "</b>";

    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", props.name + "_label")
        .html(labelAttribute);

    var stateName = infolabel.append("div")
        .attr("class", "labelname")
        .html(props.nameLabel);
};

//function to move info label with mouse
function moveLabel(event) {
    //get width of label
    var labelWidth = d3.select(".infolabel")
        .node()
        .getBoundingClientRect()
        .width; 

    //use coordinates of mousemove event to set label coordinates
    var x1 = event.clientX + 10, 
        y1 = event.clientY - 75,
        x2 = event.clientX - labelWidth -10,
        y2 = event.clientY + 25;

    //horizontal label coodinate, testing for overflow
    var x = event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
    //vertical label coordinate, testing for overflow
    var y = event.clientY < 75 ? y2 : y1;

        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
};

})(); //last line of main.js