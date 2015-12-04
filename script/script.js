/*Start by setting up the canvas */
var margin = {t:50,r:100,b:50,l:50};
var width = document.getElementById('plot').clientWidth - margin.r - margin.l,
    height = document.getElementById('plot').clientHeight - margin.t - margin.b;


//Scales - create color scale based on activity classification
var scalePieColor = d3.scale.ordinal().domain([0,1,2,3,4,5,6,7]).range(['orangered','orange','darkcyan','olivedrab','lawngreen','peru','sienna','tan']); //ordinal scale does 1:1 lookup
//need same # of items in domain and range for an ordinal scale
var scaleColor = d3.scale.category20b(); //for now, use pre-made color category generator
var scaleGradientColor = d3.scale.linear().domain([0,610000]).range(['white','green']);
//gradient from blue to red linear().domain([1,4]).range(['blue','red']);
var scaleX = d3.scale.linear().domain([0,150]).range([0,width]),
    scaleY = d3.scale.linear().domain([0,100]).range([height, 0]),
    scaleR = d3.scale.sqrt().range([0, .02]);  //set values based on sizes that I wanted to obtain - seems awfully small?

//draw plot, create svg canvas, translate as necessary
var plot = d3.select('#plot')
    .append('svg')
    .attr('width',width+margin.r+margin.l)
    .attr('height',height + margin.t + margin.b)
    .append('g')
    .attr('class','canvas')
    .attr('transform','translate('+margin.l+','+margin.t+')');

//Initialize axes (https://github.com/mbostock/d3/wiki/SVG-Axes)
var axisX = d3.svg.axis()
    .orient('bottom')
    .scale(scaleX)
    .tickFormat( d3.format('d'))
    .tickSize(-height)
    .tickValues([50,100,150]);
var axisY = d3.svg.axis()
    .orient('left')
    .scale(scaleY)
    .tickSize(-width)
    .tickValues([0,25,50,75,100]);

//Set up d3.map to store a map of commute times for a given city
var commuteTime = d3.map();
var timeLookup = d3.map();
var transitColorLookup = d3.map();

queue()
    //load files
    .defer(d3.json, "data/acs2013_5yr_B08303_14000US25025090600.geojson")
    .defer(d3.json, "data/all_city_plusmetro_commute_times_acs2013_5yr_B08134_16000US3658442_formatted.json")
    .defer(d3.csv, "data/bosMetrobyCity_acs2013_5yr_B08303_14000US25025090600_csv.csv", parse)
    .defer(d3.csv, "data/cityMetadata.csv", parse)
    .defer(d3.csv, "data/timeMetadata.csv", parse)
    .defer(d3.csv, "data/transitMetadata.csv", parse)
    //.defer(d3.csv, "data/commute_14Age.csv", parse)
    //await saves the output of file 1 and file 2, in the order run (bostonMap should be geoJSON, csvData should be parsed csv.
    .await( function(err, bostonMap, cityData, csvData, cityMetadata, timeMetadata, transitMetadata) {
        //console.log(commuteTime);

        //returns the contents of the "total" column in the Excel sheet, but only for one object at a time.
        //console.log(bostonMap.features[0].properties['B08303001 - Total:']);

        console.log(cityData);

        //define a lookup table based on metadata csv - ties time labels in data array (timeUnder10, etc) to numerical values
        for (i = 0; i < timeMetadata.length; i++) {
            timeLookup.set(timeMetadata[i].timeLabel, timeMetadata[i].timeNumber);
        }

        //make a lookup table for colors tied to city names
        //This works, but transitMetadata comes in alphabetized, and doesn't line up with the colors in the pie chart
        //drawing function (can't use .name to use lookup table, because not bound to cityData due to rebinding issue)
        //For now, hard code.
        //for (i = 0; i < transitMetadata.length; i++) {
        //    transitColorLookup.set(transitMetadata[i].transitType, scalePieColor(i));
        //}
        //timeLookup.set(['bus', {color: ''} );

        //console.log(transitColorLookup);

//////////////////////////////development area

        //Nest data array to create separate arrays for cities and metro areas. Use type attribute to sort.
        var nestedCities = d3.nest()
            .key(function (d) {
                return d.type
            })
            .entries(cityData.data);
        console.log(nestedCities);

        for (k=0; k < nestedCities[1].values.length; k++) {
            var circles = plot.selectAll('.circles')
                .data(function (d) {
                    return [nestedCities[1].values[0].population]
                }) //cannot bind to a number - needs to be an array!
                .enter()
                .append('g')
                .attr('class', 'circle-graph')
                .append('circle')
                .attr('cx', 90*k)
                .attr('cy', 10)
                .attr('r', 50);

            var testIndex = [0, 1, 2, 3, 4, 5];
            console.log([nestedCities[1].values[0]]); //  .transitTypes[transitMetadata[0].transitType].totalCount
            var squares = plot.selectAll('.squares')
                //.data(function (d,i) {
                //    for (j=0; j<nestedCities[1].values.length; j++) {  //length is 10; should have 10 entries
                //        [nestedCities[1].values[j].transitTypes[transitMetadata[0].transitType].totalCount]
                //    }
                //    return()
                //}) //cannot bind to a number - needs to be an array!
                .data([nestedCities[1].values[0].transitTypes[transitMetadata[0].transitType].totalCount])
                .enter()
                .append('g')
                .attr('class', 'square-graph');

            squares.append('circle')
                .attr('cx', 100)
                .attr('cy', 300)
                .attr('r', 50)
                .style('fill', 'red');

            squares.append('text')
                .text(nestedCities[1].values[k].name)
                .attr('class', 'label')
                .attr('text-anchor', 'middle')
                .attr('font-size', '6px')
                .style('fill', 'rgb(215,215,215)')
                .attr('transform', 'translate('+ 0 + ',' + height / 4 + ')');


        /*
        //Layout function - creates angles needed to create pie charts using data
        var pieLayout = d3.layout.pie();   //need to tell it which dataset to use

        var arcGenerator = d3.svg.arc()
            //.startAngle()  //already stored in data w/ correct name by pieLayout function.
            //.endAngle()
            .innerRadius(0)
            .outerRadius(35);

        squares.data(pieLayout(function(d,i) {
                    return nestedCities[1].values[k].transitTypes[transitMetadata[i].transitType].totalCount / nestedCities[1].values[k].transitTypes.totalCommute.totalCount * 100
                    }))
                .enter()
                .append('path')
                .attr('class', 'slice')
                .attr('d', arcGenerator) //create geometry of path
                .style('fill', function (d, i) {
                    //console.log(d);  Note that data is in a subobject called .data!!
                    //var classification = metadata.get(d); //returns (string) between 1-4
                    return scalePieColor(i);
                });
        */

        }





////////////////////////////////

            //csvData is an array of 312 objects, each with geoid, name, and time values for each commute length interval in the dataset.
            //The data from individual objects can be accessed using:
            // console.log(csvData[i].geoid);
            //console.log(csvData.geoid); returns undefined (contrast with use in parse function below...because parse goes
            // through the dataset row by row)

            d3.selectAll('.btn').on('click', function () {

                var mode = d3.select(this).attr('id');
                console.log(mode);
                if (mode == 'btn-1') {
                    displayMap(bostonMap);
                }
                else if (mode == 'btn-2') {
                    pieChart(csvData);
                }

                else if (mode == 'btn-3') {
                    lineChart(csvData);
                }

                else if (mode == 'btn-4') {
                    populationBars(cityData);
                }

                else if (mode == 'btn-5') {
                    averageBubbles(cityData);
                }

                else if (mode == 'btn-6') {
                    cityMetroBubbles(cityData,timeMetadata);
                }

                else if (mode == 'btn-7') {
                    multiplePies(cityData, transitMetadata);
                }

                else {
                    console.log('broken');
                }
            })
        });
//    });


//function dataLoaded(err,geoData,pieData){
//}

function multiplePies(cityData, transitMetadata) {

    plot.selectAll("*").remove();

    //Nest data array to create separate arrays for cities and metro areas. Use type attribute to sort.
    var nestedCities = d3.nest()
        .key(function (d) {
            return d.type
        })
        .entries(cityData.data);
    console.log(nestedCities);


    //Based on In-Class 9-Ex 2
    var percentPieData = [];

    //Layout function - creates angles needed to create pie charts using data
    var pieLayout = d3.layout.pie();   //need to tell it which dataset to use

    var arcGenerator = d3.svg.arc()
        //.startAngle()  //already stored in data w/ correct name by pieLayout function.
        //.endAngle()
        .innerRadius(0)
        .outerRadius(35);

    //for each city (repres as a .values array), append an empty group and translate to the right place
    for (k=0; k < nestedCities[1].values.length; k++) {
        var pieChartGroup = plot//.selectAll('.cities')
            .append('g')
            .attr('class', 'pie-chart-group')
            .attr('transform', 'translate(' + ((k * width / 10) + width / 10) + ',' + height / 2 + ')');

        var pieChartLabels = pieChartGroup
            .append('text')
            .text(nestedCities[1].values[k].name)
            .attr('class', 'label')
            .attr('text-anchor', 'middle')
            .attr('font-size', '6px')
            .style('fill', 'rgb(215,215,215)')
            .attr('transform', 'translate('+ 0 + ',' + height / 4 + ')');

        var pieData = [
            (nestedCities[1].values[k].transitTypes[transitMetadata[0].transitType].totalCount / nestedCities[1].values[k].transitTypes.totalCommute.totalCount) * 100,
            (nestedCities[1].values[k].transitTypes[transitMetadata[1].transitType].totalCount / nestedCities[1].values[k].transitTypes.totalCommute.totalCount) * 100,
            (nestedCities[1].values[k].transitTypes[transitMetadata[2].transitType].totalCount / nestedCities[1].values[k].transitTypes.totalCommute.totalCount) * 100,
            (nestedCities[1].values[k].transitTypes[transitMetadata[3].transitType].totalCount / nestedCities[1].values[k].transitTypes.totalCommute.totalCount) * 100,
            (nestedCities[1].values[k].transitTypes[transitMetadata[4].transitType].totalCount / nestedCities[1].values[k].transitTypes.totalCommute.totalCount) * 100,
            (nestedCities[1].values[k].transitTypes[transitMetadata[5].transitType].totalCount / nestedCities[1].values[k].transitTypes.totalCommute.totalCount) * 100,
            (nestedCities[1].values[k].transitTypes[transitMetadata[6].transitType].totalCount / nestedCities[1].values[k].transitTypes.totalCommute.totalCount) * 100,
        ];

    //**********************Change color scale and sort function, space out evenly on page, add labels, look into object constancy
        pieChartGroup.selectAll('pies')
            .append('g')
            .attr('class', 'bottom-pie')
            .data(pieLayout(pieData))
            .enter()
            .append('path')
            .attr('class', 'slice')
            .attr('d', arcGenerator) //create geometry of path
            .style('fill', function (d, i) {
                //console.log(d);  Note that data is in a subobject called .data!!
                //var classification = metadata.get(d); //returns (string) between 1-4
                return scalePieColor(i);
            });

        console.log(nestedCities[1].values[k].transitTypes[transitMetadata[0].transitType].overallAverageTime);

        pieChartGroup.selectAll('bars')
            .append('g')
            .attr('class','transit-bars')
            .data(nestedCities[1].values[k].transitTypes[transitMetadata[0].transitType].overallAverageTime)
            .enter()
            .append('rect')
            .attr('class','bar')
            .attr('x',0)
            .attr('y',nestedCities[1].values[k].transitTypes[transitMetadata[0].transitType].overallAverageTime)
            .attr('width',30)
            .attr('height',5)


    }
}

function cityMetroBubbles(cityData,timeMetadata) {

    plot.selectAll("*").remove();

    //console.log('cityData_name: ' + cityData.data[0].name);
    //console.log(cityMetadata[0].label);
    //console.log(cityMetadata);
    //tempMetadata =[];

    //Nest data array to create separate arrays for cities and metro areas. Use type attribute to sort.
    var nestedCities = d3.nest()
        .key(function (d) {
            return d.type
        })
        .entries(cityData.data);
    console.log(nestedCities);

    //Wk 8 in class, ex 4
//*************will need to sort using both name and type; since names are the same, the sort won't care which order it arranges them in.
//ignoring sort function when using string attributes; should calculate unicode value, but doesn't.
//    nestedCities[1].values.sort(function (a, b) {
//        console.log((+b.name) - (+a.name));
//************not sorting by name! console returns NaN. Why??? Sorting by population works...
//        return (+b.name) - (+a.name);
//    });

//************Need to implement lookup table to match x positions for different cities/metro areas; also possibly add to x-pos calc in generator fxn?
/*    nestedCities[0].values.sort(function (a, b) {
        // console.log(b.name);
        return b.population- a.population;
    });

    nestedCities[1].values.sort(function (a, b) {
        // console.log(b.name);
        return b.population- a.population;
    });
*/

//******************Need to implement sorting method to link cities and metro areas directly, and plot all circles in the correct columns!!!

    console.log(nestedCities);
    //upgrade/generalize the averageBubbles function to transition to new data structure (note that this version does not normalize city commute data!)

    var circles = plot.selectAll('.country')
        .data(function (d) {
            return [nestedCities[1].values[0].population]
        }) //cannot bind to a number - needs to be an array!
        .enter()
        .append('g')
        .attr('class', 'circle-graph');

    //Plot city circles based on population size
    var cities = plot.selectAll('.cities')
        .data(nestedCities[1].values)
        .enter()
        .append('g')
        .attr('class', 'city');

    //Plot metro area circles based on population size
    var metroAreas = plot.selectAll('.cities')
        .data(nestedCities[0].values)
        .enter()
        .append('g')
        .attr('class', 'metro');

    //append population bubbles with y value at average commute time (mins)
    cities.append('circle')
        .attr('cx', function (d, i) {
            return i * width / 10 + width / 10
        })
        .attr('cy', function (d, i) {
            return scaleY(d.transitTypes.totalCommute.overallAverageTime)
        })
        .attr('r', function (d, i) {
            return scaleR(d.population)
        })
        .style('fill', 'green');

    cities.append('line')
        .attr('x1', function (d, i) {
            return (i * width / 10 + width / 10) - 7 - (scaleR(d.population))
        })
        .attr('y1', function (d, i) {
            return scaleY(d.transitTypes.totalCommute.overallAverageTime)
        })
        .attr('x2', function (d, i) {
            return (i * width / 10 + width / 10) + 7 + (scaleR(d.population))
        })
        .attr('y2', function (d, i) {
            return scaleY(d.transitTypes.totalCommute.overallAverageTime)
        })
        .style('stroke', 'blue')
        .style('stroke-weight', '2px');

//*************font size isn't changing - why?
    cities.append('text')
        .text(function (d, i) {
            return d.name;
        })//retrieve city label from rows array, use as text
        .attr('x', function (d, i) {
            return i * width / 10 + width / 10
        })
        .attr('class', 'label')
        .attr('text-anchor', 'middle')
        .attr('font-size', '6px')
        .style('fill', 'rgb(215,215,215)');


    cities.forEach(function (d, i) {

        //show total number of commuters at the average commute times (on top of city population circles)
        cities.append('circle')
            .attr('cx', function (d, i) {
                return i * width / 10 + width / 10
            })
            .attr('cy', function (d, i) {
                return scaleY(d.transitTypes.totalCommute.overallAverageTime);
            })
            .attr('r', function (d, i) {
                //return (d.transitTypes.totalCommute.timeUnder10 / d.transitTypes.totalCommute.totalCount) * 100;  //returns as percent, not scaled to match population size
                //console.log(d.transitTypes.totalCommute.totalCount);
                return scaleR(d.transitTypes.totalCommute.totalCount);
            })
            .style('fill', 'none')
            .style('stroke', 'red')
            .style('stroke-width', '2px')
            .style('stroke-dasharray', '5px 5px');

        //append circles to show distribution of commuters in each time class.
        multiCircleGenerator(nestedCities[1], metroAreas, 'totalCommute', 'none', 'purple');
        multiCircleGenerator(nestedCities[1], cities, 'totalCommute', 'red', 'none');  //substitute string of any other attribute on the same level ('Bus', carpool, etc)
        //(data array, selection to append to, string for the attribute to represent

//takes a data array containing the counts for time points stored in timeMetadata as input, plots one circle for each value in timeMetadata, using counts given.
//*******************need to keep track of who ends up where in x - match to lookup table? Currently, plots L-->R; DC has no metroArea data!
        function multiCircleGenerator(countData, appendTo, attributeToPlot, fillColor, strokeColor) {
            for (index = 0; index < timeMetadata.length; index++) {
                appendTo.append('circle')
                    .attr('cx', function (d, i) {
                        return i * width / 10 + width / 10
                    })
                    .attr('cy', function (d, i) {
                        //console.log(timeMetadata[index].timeLabel); //[index].timeLabel
                        //console.log(timeLookup);
                        return scaleY(+(timeLookup.get(timeMetadata[index].timeLabel)));
                    })
                    .attr('r', function (d, i) {
                        //return (d.transitTypes.totalCommute.timeUnder10 / d.transitTypes.totalCommute.totalCount) * 100;  //returns as percent, not scaled to match population size
                        return scaleR(d.transitTypes[attributeToPlot][timeMetadata[index].timeLabel]);
                    })
                    .style('fill', fillColor)
                    .style('stroke', strokeColor);

            }
        }
    });
}

function averageBubbles(cityData){

    plot.selectAll("*").remove();


    var circles = plot.selectAll('.country')
        .data(function(d) {return [cityData.data[0].population]}) //cannot bind to a number - needs to be an array!
        .enter()
        .append('g')
        .attr('class','circle-graph');

    /*var testCircle = circles.append('circle')
     .attr('cx',width/2)
     .attr('cy', height/2)
     .attr('r', 50)
     .style('fill','blue');

     plot.append('line')
     .attr('x1',width/2-60)
     .attr('y1',height/2)
     .attr('x2',width/2+60)
     .attr('y2',height/2)
     .style('stroke','gray')
     .style('stroke-weight','2px');*/


    /*var totalCommuters = [];
     cityData.data.forEach(function(d,i){
     var tempData = cityData.data[i].transitTypes.totalCommute;
     totalCommuters.push(tempData);
     });*/

    //console.log(cityData['data'][0].transitTypes['totalCommute']);

    //cityData.data[0].transitTypes.totalCommute.totalCount works - single #
    //cityData[data].transitTypes.totalCommute.totalCount - data is undefined
    //cityData['data'].transitTypes.totalCommute.totalCount - returns an array of objects for which totalCommute is undefined
    // Array contains all 19 objects stored in cityData.data, but can't access properties of objects directly   .
    //cityData['data'][0] gives contents of 0th element of cityData.data. Can access all subarrays using .geoid, etc.,
    //but can't get subarray elements for all objects in the array at once; need to use forEach loop to collect by iterating.
    //[cityData['data']].geoid - returns undefined
    //[cityData['data']] returns an array with a single 19-element array inside it - not helpful


    /*var testKey = d3.nest()
     .key(function(d) { return d.name; })
     .entries(cityData.data);
     console.log(testKey);*/

    // var timeRanges = [0, 10,15,20,25,30,35,45,60]; //use beginning of each time interval to set circle y position]

    //Plot city circles based on population size
    var cities = plot.selectAll('.cities')
        .data(cityData.data)
        .enter()
        .append('g')
        .attr('class', 'city');

    /*plot.selectAll('.city')
     .append('circle')
     .attr('cx', function(d,i){return 100*i*Math.random()})
     .attr('cy', function(d,i){return 100*i*Math.random()})
     .attr('r', 5)
     .style('fill', 'green');*/

    //Tried to append circles based on contents of totalCommute array - doesn't work!!
    //Using numerical indices also did not work. Prints totalCommute value for each array to log, but doesn't
    //append anything to DOM. TotalCommute array is an object that contains 9 elements - should append 9 groups?
    //using the individual object values (totalCommute.time10tp14) does not help - doesn't appear to be a problem
    // with the values or array format
    /*citySelect = cities.selectAll('.city')
     .data(function(d,i){
     console.log(cityData.data[i].transitTypes.totalCommute);
     return cityData.data[i].transitTypes.totalCommute;
     })
     .enter()
     .append('g')
     .attr('class', 'commuteBubbles');*/

    //But it works this way, so maybe it's the data bind that doesn't work?
    /*citySelect = cities.selectAll('.city')
     .data(totalCommuters)
     .enter()
     .append('circle')
     .attr('cx', function(d,i){return 100*i*Math.random()})
     .attr('cy', function(d,i){return 100*i*Math.random()})
     .attr('r', 5)
     .style('fill', 'red')
     .attr('class', 'commuteBubbles');*/

    //create a key to hold a new variable that might bind
    var testKey = d3.nest()
        .key(function(d){return cityData.data[0].transitTypes.totalCommute})
        .entries(cityData.data);
    //console.log(testKey[0].values[0].transitTypes.totalCommute);

    //This works, but appends only one circle (because testKey has dim 1?)
    /*citySelect = cities.selectAll('.city')
     .data(function(d){return testKey})
     .enter()
     .append('circle')
     .attr('cx', function(d,i){return 100*i*Math.random()})
     .attr('cy', function(d,i){return 100*i*Math.random()})
     .attr('r', 5)
     .style('fill', 'red')
     .attr('class', 'commuteBubbles'); */

    //This doesn't return anything
    citySelect = cities.selectAll('.city')
        .data(function(d){return testKey[0].values[0].transitTypes.totalCommute})
        .enter()
        .append('circle')
        .attr('cx', function(d,i){return 100*i*Math.random()})
        .attr('cy', function(d,i){return 100*i*Math.random()})
        .attr('r', 5)
        .style('fill', 'red')
        .attr('class', 'commuteBubbles');

    //append population bubbles with y value at average commute time (mins)
//**********************sort metro and city pops, use only city in final plot!
    cities.append('circle')
        .attr('cx', function(d,i){return i*width/19+width/19})
        .attr('cy', function(d,i){return scaleY(cityData.data[i].transitTypes.totalCommute.overallAverageTime)})
        .attr('r', function(d,i){return (cityData.data[i].population)/500000})
        .style('fill', 'green');

    cities.append('line')
        .attr('x1',function(d,i){return (i*width/19+width/19)-10-(cityData.data[i].population)/500000})
        .attr('y1',function(d,i){return scaleY(cityData.data[i].transitTypes.totalCommute.overallAverageTime)})
        .attr('x2',function(d,i){return (i*width/19+width/19)+10+(cityData.data[i].population)/500000})
        .attr('y2',function(d,i){return scaleY(cityData.data[i].transitTypes.totalCommute.overallAverageTime)})
        .style('stroke','blue')
        .style('stroke-weight','2px');


    cities.append('text')
        .text(function(d,i){return cityData.data[i].name; })//retrieve city label from rows array, use as text
        .attr('x',function (d, i) {return i * width / 19 + width / 19})
        .attr('class', 'label')
        .attr('text-anchor', 'middle')
        .attr('font-size','8px')
        .style('fill','rgb(215,215,215)');

//**************************note - value scales don't match!! Need to fix proportions in final version,
    //change to square root scaling. scaleR = d3.scale.sqrt().range([10,50]); (Wk 7 in class 3)

//**************use metadata to access totalCommute subobjects one at a time???
    //maybe it's possible to append circles for each entry in totalCommute subarray directly to the cities selection??
    cities.forEach(function(d,i) {

        // console.log(cityData.data[i].transitTypes.totalCommute.totalCount);

        // for (var j = 0; j < 8; j++) {
        cities.append('circle')
            .attr('cx', function (d, i) {
                return i * width / 19 + width / 19
            })
            .attr('cy', function (d, i) {
                return scaleY(10)
            })
            .attr('r', function (d, i) {
                return (cityData.data[i].transitTypes.totalCommute.time10to14/cityData.data[i].transitTypes.totalCommute.totalCount) * 50
            })
            //.attr('r', 10)
            .style('fill', 'red');
        //}

        cities.append('circle')
            .attr('cx', function (d, i) {
                return i * width / 19 + width / 19
            })
            .attr('cy', function (d, i) {
                return scaleY(0)
            })
            .attr('r', function (d, i) {
                return (cityData.data[i].transitTypes.totalCommute.timeUnder10/cityData.data[i].transitTypes.totalCommute.totalCount) * 50
            })
            //.attr('r', 10)
            .style('fill', 'red');

        cities.append('circle')
            .attr('cx', function (d, i) {
                return i * width / 19 + width / 19
            })
            .attr('cy', function (d, i) {
                return scaleY(15)
            })
            .attr('r', function (d, i) {
                return (cityData.data[i].transitTypes.totalCommute.time15to19/cityData.data[i].transitTypes.totalCommute.totalCount) * 50
            })
            //.attr('r', 10)
            .style('fill', 'red');

        cities.append('circle')
            .attr('cx', function (d, i) {
                return i * width / 19 + width / 19
            })
            .attr('cy', function (d, i) {
                return scaleY(20)
            })
            .attr('r', function (d, i) {
                return (cityData.data[i].transitTypes.totalCommute.time20to24/cityData.data[i].transitTypes.totalCommute.totalCount) * 50
            })
            //.attr('r', 10)
            .style('fill', 'red');

        cities.append('circle')
            .attr('cx', function (d, i) {
                return i * width / 19 + width / 19
            })
            .attr('cy', function (d, i) {
                return scaleY(25)
            })
            .attr('r', function (d, i) {
                return (cityData.data[i].transitTypes.totalCommute.time25to29/cityData.data[i].transitTypes.totalCommute.totalCount) * 50
            })
            //.attr('r', 10)
            .style('fill', 'red');

        cities.append('circle')
            .attr('cx', function (d, i) {
                return i * width / 19 + width / 19
            })
            .attr('cy', function (d, i) {
                return scaleY(30)
            })
            .attr('r', function (d, i) {
                return (cityData.data[i].transitTypes.totalCommute.time30to34/cityData.data[i].transitTypes.totalCommute.totalCount) * 50
            })
            //.attr('r', 10)
            .style('fill', 'red');


        cities.append('circle')
            .attr('cx', function (d, i) {
                return i * width / 19 + width / 19
            })
            .attr('cy', function (d, i) {
                return scaleY(35)
            })
            .attr('r', function (d, i) {
                return (cityData.data[i].transitTypes.totalCommute.time35to44/cityData.data[i].transitTypes.totalCommute.totalCount) * 50
            })
            //.attr('r', 10)
            .style('fill', 'red');

        cities.append('circle')
            .attr('cx', function (d, i) {
                return i * width / 19 + width / 19
            })
            .attr('cy', function (d, i) {
                return scaleY(45)
            })
            .attr('r', function (d, i) {
                return (cityData.data[i].transitTypes.totalCommute.time45to59/cityData.data[i].transitTypes.totalCommute.totalCount) * 50
            })
            //.attr('r', 10)
            .style('fill', 'red');

        cities.append('circle')
            .attr('cx', function (d, i) {
                return i * width / 19 + width / 19
            })
            .attr('cy', function (d, i) {
                return scaleY(60)
            })
            .attr('r', function (d, i) {
                //console.log(cityData.data[i].transitTypes.totalCommute.timeOver60);  //check - different values for each i
                return (cityData.data[i].transitTypes.totalCommute.timeOver60/cityData.data[i].transitTypes.totalCommute.totalCount) * 50
            })
            //.attr('r', 10)
            .style('fill', 'red');

//**************Check scaling on all dots on this page - currently not consistent between datasets - inaccurate comparisons
        cities.append('circle')
            .attr('cx', function (d, i) {
                return i * width / 19 + width / 19
            })
            .attr('cy', function (d, i) {
                return scaleY(75)
            })
            .attr('r', function (d, i) {
                //console.log(cityData.data[i].transitTypes.totalCommute.timeOver60);  //check - different values for each i
                return ((cityData.data[i].transitTypes.totalCommute.timeOver60)+cityData.data[i].transitTypes.totalCommute.time45to59+
                    cityData.data[i].transitTypes.totalCommute.time35to44+cityData.data[i].transitTypes.totalCommute.time30to34/cityData.data[i].transitTypes.totalCommute.totalCount) /100000                })
            //.attr('r', 10)
            .style('fill', 'purple');


    });

    /*plot.selectAll('city')
     .data(function(d,i){
     console.log(cityData.data[i].transitTypes.totalCommute);
     return cityData.data[i].transitTypes.totalCommute;
     })
     .enter()
     .append('circle')
     .attr('cx', width/2)  //in final version, change this to be the calculated position of the city
     .attr('cy', function(d,i){return 10*i})
     .attr('r',5);*/

    //console.log(cityData["data"]);
}

function populationBars(cityData){

    plot.selectAll("*").remove();

    console.log(cityData.data[0].population); //have to use index to access subarray values - need a forEach to cycle through?

    var circles = plot.selectAll('.country')
        .data(function(d) {return [cityData.data[0].population]}) //cannot bind to a number - needs to be an array!
        .enter()
        .append('g')
        .attr('class','circle-graph');

    var testCircle = circles.append('circle')
        .attr('cx',width/2)
        .attr('cy', height/2)
        .attr('r', 50)
        .style('fill','blue');

    plot.append('line')
        .attr('x1',width/2-60)
        .attr('y1',height/2)
        .attr('x2',width/2+60)
        .attr('y2',height/2)
        .style('stroke','gray')
        .style('stroke-weight','2px');

    /*testCircle.transition()
     .delay(500)
     .attr('r',0);*/

    var whiteRect1 = plot.append('rect')
        .attr('x',width/2-51)
        .attr('y',height/2+50)
        .attr('width',102)
        .attr('height',0)
        .style('fill','white');

    var whiteRect2 = plot.append('rect')
        .attr('x',width/2-51)
        .attr('y',height/2-50)
        .attr('width',102)
        .attr('height',0)
        .style('fill','white');

    whiteRect1.transition().delay(1000).duration(500)
        .attr('y',height/2)
        .attr('height',50)
        .style('fill','white');

    whiteRect2.transition().delay(1000).duration(500)
        .attr('y',height/2-50)
        .attr('height',50)
        .style('fill','white');

    plot.append('line')
        .attr('x1',width/2-60)
        .attr('y1',height/2)
        .attr('x2',width/2+60)
        .attr('y2',height/2)
        .style('stroke','gray')
        .style('stroke-weight','2px');

    //compiles the commute time totals for each city/metro area in the original data array, returns a series of objects
    //with nested commute times.
    var gradientDataArray = [];
    cityData.data.forEach(function(d,i){
        var tempData = cityData.data[i].transitTypes.totalCommute;

        gradientDataArray.push(tempData);
    });

    console.log(gradientDataArray);

    var gradientTestArray = [405710,470228,476524,490854,198966,512784,269934,346700,613926];
//***************need to calc based on size of time steps for final version! **************************
    var gradientOffsets = [0,10,20,30,40,50,60,70,80,90];

//**********************http://tutorials.jenkov.com/svg/svg-gradients.html
// also, look into nesting gradient inside a <def> - can these still be updated on the fly?
    // from http://stackoverflow.com/questions/22138897/d3-js-getting-gradients-on-a-bar-chart
    var gradient = plot.append("svg:defs")
        .append("svg:linearGradient")
        .attr("id", "gradient")
        .attr("x1", "50%")//x1,x2,y1,y2 define a line to determine gradient placement/orientation. Positions given in % of containing object.
        .attr("y1", "100%")
        .attr("x2", "50%")
        .attr("y2", "0%")
        .attr("spreadMethod", "pad");


    gradientTestArray.forEach(function(d,i){   //switch to use gradientDataArray
        gradient.append("svg:stop")
            .attr("offset", gradientOffsets[i] +"%")
            .attr("stop-color", scaleGradientColor(gradientTestArray[i]))
            .attr("stop-opacity", 1);
    });

    /*gradient.append("svg:stop")
     .attr("offset", "0%")
     .attr("stop-color", scaleGradientColor(gradientTestArray[0]))
     .attr("stop-opacity", 1);

     gradient.append("svg:stop")
     .attr("offset", "5%")
     .attr("stop-color", scaleGradientColor(gradientTestArray[2]))
     .attr("stop-opacity", 1);

     gradient.append("svg:stop")
     .attr("offset", "10%")
     .attr("stop-color", scaleGradientColor(gradientTestArray[3]))
     .attr("stop-opacity", 1);

     gradient.append("svg:stop")
     .attr("offset", "15%")
     .attr("stop-color", scaleGradientColor(gradientTestArray[4]))
     .attr("stop-opacity", 1);

     gradient.append("svg:stop")
     .attr("offset", "20%")
     .attr("stop-color", scaleGradientColor(gradientTestArray[5]))
     .attr("stop-opacity", 1);

     gradient.append("svg:stop")
     .attr("offset", "30%")
     .attr("stop-color", scaleGradientColor(gradientTestArray[6]))
     .attr("stop-opacity", 1);

     gradient.append("svg:stop")
     .attr("offset", "40%")
     .attr("stop-color", scaleGradientColor(gradientTestArray[7]))
     .attr("stop-opacity", 1);

     gradient.append("svg:stop")
     .attr("offset", "55%")
     .attr("stop-color", scaleGradientColor(gradientTestArray[8]))
     .attr("stop-opacity", 1);
     */

    var testRect = plot.append('rect')
        .attr('x',width/2-25)
        .attr('y',height/2)
        .attr('width',50)
        .attr('height',0)
        .style('fill','url(#gradient)');

    testRect.transition().delay(1800)
        .duration(1000)
        .attr('x',width/2-25)
        .attr('y',height/2-350/2)
        .attr('width',50)
        .attr('height',350);

}


function lineChart(csvData){

    plot.selectAll("*").remove();

    //for now, choose data on commute times for Boston as the test dataset (same as used for pie chart)
    lineData = [csvData[189].timeunder5, csvData[189].time5to9, csvData[189].time10to14, csvData[189].time15to19,
        csvData[189].time20to24, csvData[189].time25to29, csvData[189].time30to34, csvData[189].time35to39, csvData[189].time40to44,
        csvData[189].time45to49,csvData[189].time60to89,csvData[189].timeover90];

    //Draw axes
    plot.append('g').attr('class','axis axis-x')
        .attr('transform','translate(0,'+height+')')
        .call(axisX);
    plot.append('g').attr('class','axis axis-y')
        .call(axisY);
}

function countryCircles(cityData) {
    //develop code in queue function, move here later
}

function pieChart(csvData) {

    plot.selectAll("*").remove();

    var percentPieData = [];
    //**********************need to figure out how to clear the screen!! (Enter exit update pattern??)******************

    //choose just one city (Boston, element 189 in the csvData) for now
    //console.log(csvData[189].name);

    pieData = [csvData[189].timeunder5, csvData[189].time5to9, csvData[189].time10to14, csvData[189].time15to19,
        csvData[189].time20to24, csvData[189].time25to29, csvData[189].time30to34, csvData[189].time35to39, csvData[189].time40to44,
        csvData[189].time45to49,csvData[189].time60to89,csvData[189].timeover90];

    //removed csvData[189].total from beginning of pieData to get rid of 100% wedge

    //console.log(pieData[0]/csvData[189].total*100);

    pieData.forEach(function(d,i){
        percentPieData.push(pieData[i]/csvData[189].total*100)
    });

    //console.log(pieData);
   // console.log(csvData);
/*    //Set the pie chart values from the geoJSON data by compiling total,
    commuteTime.set(d.geoid, {time:+d.time30to34, name: d.name});
    console.log(commuteTime);
*/
      //Based on In-Class 9-Ex 2

//Layout function - creates angles needed to create pie charts using data
    var pieLayout = d3.layout.pie();   //need to tell it which dataset to use
        // function(d){return d.total})  //here, use total attribute to populate pie chart.
        /*.sort(function(a,b){
            return b.activity1 - a.activity1;  //compare activity1 columns (comparing two strings) sort by value
        })*/

    var arcGenerator = d3.svg.arc()
        //.startAngle()  //already stored in data w/ correct name by pieLayout function.
        //.endAngle()
        .innerRadius(0)
        .outerRadius(250);

    //use enter exit update to create pie slices for ea element in the array
    var pieChart = plot
        .append('g')
        .attr('class','pie-chart')
        .attr('transform','translate('+width/2+','+height/2+')');
    pieChart
        .selectAll('.slice')      //0 on first run, 46 thereafter (b/c ea path has class slice, defined below)
        .data(pieLayout(percentPieData))
        .enter()
        .append('path')
        .attr('class', 'slice')
        .attr('d', arcGenerator) //create geometry of path
        .style('fill', function(d,i){
            //console.log(d);  Note that data is in a subobject called .data!!
            //var classification = metadata.get(d); //returns (string) between 1-4
            return scaleColor(i);
        });
    /*pieChart.append('circle')
        .attr('r', 200)
        .style('fill','none')
        .style('stroke','black')
        .style('stroke-dasharray','5px 5px')
        .style('stroke-width','1px');

    pieChart.selectAll('text')
        .data(pieLayout(pieData))
        .enter()
        .append('text')
        .text(function(d){return d.data.activity2})
        .attr('transform', function(d){
            var angle = ((d.startAngle+ d.endAngle)/2)/(2*Math.PI)*360-90;  //for SVG, needs to be in degrees not radians!
            //90 because text defines angle differntely
            return 'rotate('+angle+')'+'translate(250,0)'; //translate command inherits the x axis of the original item (self-referential)

            //'rotate(a) translate(xy)'
        });*/
}

function displayMap(geoData){

    plot.selectAll("*").remove();

    //Based on Assignment 5

    //**********************Add a slider with commute time ranges, update map as user moves the slider bar****************

    //store long/lat for Boston in an array for easy access
    var bostonLngLat = [-71.088066,42.315520]; //from http://itouchmap.com/latlong.html
    var chicagoLngLat = [-87.629798, 41.878114];

    //Set up a mercator projection, and a d3.geo.path() generator
    var projection = d3.geo.mercator() //set up a mercator projection function

        .center(bostonLngLat)  //change the projection center to Boston
        .translate([width/2,height/2])     //Center the projection on the screen
        //**********note that this scale currently forces the map to extend out of the svg canvas (also, still really small)
        .scale(18000); //from documentation page - may need to change back to a simple multiple

    //set up a path generator function that uses the mercator projection function
    var pathGenerator = d3.geo.path().projection(projection);

    //Color scale
    //****************use d3.max to calculate correct scale range**********************
    var colorScale = d3.scale.linear().domain([0,6000]).range(['white','red']); //range 0-1 is too broad; redefine for max 20% unemployment

/*    var map = d3.select('.canvas')
        .append('svg')
        .attr('width',width+margin.r+margin.l)
        .attr('height',height + margin.t + margin.b)
        .append('g')
        .attr('class','map')
        .attr('transform','translate('+margin.l+','+margin.t+')');
        */

    //draw map (assuming neighborhoods and blocks arrays input)
    var map = plot.append('g')
        .attr('class','block-groups')
        .selectAll('.boundary')
        .data(geoData.features)
        .enter()
        .append('path')
        .attr('class','boundary')
        .attr('d', pathGenerator)
        .style('fill', function(d){

            //console.log(d);

            //return "white";

            //console.log(d.properties.geoid);

            var lookUpTime = (commuteTime.get(d.properties.geoid)).time;

            console.log("lookup" + lookUpTime);

            if (lookUpTime == 0){
                return "gray"
            }
            else if (lookUpTime == undefined){
                return "blue"
            }
            else {
                return colorScale(lookUpTime);
            }
        })
        .style('stroke','gray');

   /* d3.select('.map')
        .append('g')
        .attr('class','neighborhoods')
        .append('path')
        .datum(neighborhoods)
        .attr('class','neighborhoods')
        .attr('d', pathGenerator)
        .style('stroke-width','2px')
        .style('fill','none')
        .style('stroke','gray');
*/

}

function parse(csvData){
//Parse function is called from the d3.csv command - pieData is the output from the csv file, /not/ the geoJSON data!!!

    //console.log(d);
    //console.log(csvData);

    //Link the commuteTime values to a geoID to create a lookup table for accessing the geoJSON data. Also save name stored in csv.
    commuteTime.set(csvData.geoid, {time:+csvData.time30to34, name: csvData.name});

    //console.log(commuteTime);
    
    //send this data back to the await function
    return(csvData);

/*returns values parsed from Excel table format - switch to geoJSON instead
   return {
        geoid:d['geoid'],
        total:d['B08303001 - Total:'],
        time60to89:d['B08303012 - 60 to 89 minutes;']
    };

    return {
        activity1:d['activity 1'],
        activity2:d['activity 2'],
        total:+d.Total,
        men:+d.Men,
        women:+d.Women
    }*/
}

function parseTimeMetadata(d){

}


//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//Scrap code
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

//****************************check metadata import - creates [object,object], but doesn't seem to be accessible...
//set up and populate lookup tables for time and city labels.

//var cityMetadata = d3.map();
//populate the lookup tables
//timeMetadata.set(timeMetadatain.timeLabel, timeMetadatain.timeNumber);
//cityMetadata.set(cityMetadata.geoid, {label:cityMetadata.label, type:cityMetadatain.type});*/
//console.log('timeMetadata ' +timeMetadata);

//console.log('metadata ' +timeMetadata.timeLabel);

//console.log(cityData.data[0].population); //have to use index to access subarray values - need a forEach to cycle through?

        /*
         cities.append('circle')
         .attr('cx', function (d, i) {
         return i * width / 10 + width / 10
         })
         .attr('cy', function (d, i) {
         return scaleY(+timeLookup.get('time10to14')); //represents min time value for the interval recorded - update to calculate real value in final version
         })
         .attr('r', function (d, i) {
         //return (d.transitTypes.totalCommute.time10to14 / d.transitTypes.totalCommute.totalCount) * 100;
         return scaleR(d.transitTypes.totalCommute.time10to14);
         })
         .style('fill', 'red');

         cities.append('circle')
         .attr('cx', function (d, i) {
         return i * width / 10 + width / 10
         })
         .attr('cy', function (d, i) {
         return scaleY(+timeLookup.get('time15to19')); //represents min time value for the interval recorded - update to calculate real value in final version
         })
         .attr('r', function (d, i) {
         //return (d.transitTypes.totalCommute.time10to14 / d.transitTypes.totalCommute.totalCount) * 100;
         return scaleR(d.transitTypes.totalCommute.time15to19);
         })
         .style('fill', 'red');

         cities.append('circle')
         .attr('cx', function (d, i) {
         return i * width / 10 + width / 10
         })
         .attr('cy', function (d, i) {
         return scaleY(+timeLookup.get('time20to24'));
         })
         .attr('r', function (d, i) {
         return scaleR(d.transitTypes.totalCommute.time20to24);
         })
         .style('fill', 'red');

         cities.append('circle')
         .attr('cx', function (d, i) {
         return i * width / 10 + width / 10
         })
         .attr('cy', function (d, i) {
         return scaleY(+timeLookup.get('time25to29'));
         })
         .attr('r', function (d, i) {
         return scaleR(d.transitTypes.totalCommute.time25to29);
         })
         .style('fill', 'red');

         cities.append('circle')
         .attr('cx', function (d, i) {
         return i * width / 10 + width / 10
         })
         .attr('cy', function (d, i) {
         return scaleY(+timeLookup.get('time30to34'));
         })
         .attr('r', function (d, i) {
         return scaleR(d.transitTypes.totalCommute.time30to34);
         })
         .style('fill', 'red');

         cities.append('circle')
         .attr('cx', function (d, i) {
         return i * width / 10 + width / 10
         })
         .attr('cy', function (d, i) {
         return scaleY(+timeLookup.get('time35to44'));
         })
         .attr('r', function (d, i) {
         return scaleR(d.transitTypes.totalCommute.time35to44);
         })
         .style('fill', 'red');

         cities.append('circle')
         .attr('cx', function (d, i) {
         return i * width / 10 + width / 10
         })
         .attr('cy', function (d, i) {
         return scaleY(+timeLookup.get('time45to59'));
         })
         .attr('r', function (d, i) {
         return scaleR(d.transitTypes.totalCommute.time45to59);
         })
         .style('fill', 'red');

         cities.append('circle')
         .attr('cx', function (d, i) {
         return i * width / 10 + width / 10
         })
         .attr('cy', function (d, i) {
         return scaleY(+timeLookup.get('timeOver60'));
         })
         .attr('r', function (d, i) {
         return scaleR(d.transitTypes.totalCommute.timeOver60);
         })
         .style('fill', 'red');
         */




/*
 //**************Check scaling on all dots on this page - currently not consistent between datasets - inaccurate comparisons
 cities.append('circle')
 .attr('cx', function (d, i) {
 return i * width / 19 + width / 19
 })
 .attr('cy', function (d, i) {
 return scaleY(75)
 })
 .attr('r', function (d, i) {
 //console.log(cityData.data[i].transitTypes.totalCommute.timeOver60);  //check - different values for each i
 return ((cityData.data[i].transitTypes.totalCommute.timeOver60)+cityData.data[i].transitTypes.totalCommute.time45to59+
 cityData.data[i].transitTypes.totalCommute.time35to44+cityData.data[i].transitTypes.totalCommute.time30to34/cityData.data[i].transitTypes.totalCommute.totalCount) /100000                })
 //.attr('r', 10)
 .style('fill', 'purple');


 });
 */




/* //lookup table for city/metro by type and names (follow wk 10 in class, Ex 3)
 cityLookup = d3.map();
 for (i=0; i<cityMetadata.length; i++){
 cityLookup.set(cityMetadata[i].label, {geoid:cityMetadata[i].geoid, type:cityMetadata[i].type});
 //tempMetadata.push(tempMetadata);
 }*/

//        citiesData = [];
//        citiesData.push("data","422");
//        console.log('test'+citiesData);
//        metroData = [];
/*for(){
 if (cityLookup.get(cityData.data[0].name).type == 1){
 citiesData.push(cityData[i]);
 }

 else if (cityLookup.get(cityData.data[0].name).type == 2){
 metroData = ;
 }

 else {
 console.log('failed to find city or metro data')
 }
 }*/

//console.log(cityLookup);

// var test1 = cityData;
//console.log('lookup' +cityLookup.label);
//needs to represent population
//var pop = (popByState.get(d.properties.STATE)).pop; //from GeoJSON - get state ID using d.properties.STATE.
// Go to look up in table using popbyState.get. Get an object back - ask for .pop entry
//console.log(pop);








/*
var percentPieData = [];


//use enter exit update to create pie slices for ea element in the array
var pieChartGroup = plot//.selectAll('.cities')
    .data(function (d) {
     return [nestedCities[1].values]; //bind to the city data stored in the array - one object for each city in nestedData
     //*************** (Note that this is different than what was used in the cityMetroBubbles function - update that one to match this?
     }) //cannot bind to a number - needs to be an array!
     .enter()
    .append('g')
    .attr('class', 'pie-chart-group')
    .attr('transform', function(d,i){return 'translate('+ ((i * width / 10) + width / 10) + ',' +height/2 + ')'} );


//choose just one city (Boston, element 189 in the csvData) for now
//console.log(csvData[189].name);

//Bus, carpool, droveAlone, railFerry, streetCar, taxi,walked, totalCommute.totalCount
//*************Update this to generalize access pattern for nestedData array
//console.log(nestedCities[1].values[0].transitTypes.Bus.totalCount);
//console.log(transitMetadata[0].transitType); //returns "Bus"
//console.log(nestedCities[1].values[0].transitTypes[transitMetadata[0].transitType]);

 /*
 //make a group to hold a pie chart for each city
 var pies = pieChartGroup.selectAll('.slice')
 .data(nestedCities[1].values)  //previously pieLayout(percentPieData)
 .enter()
 .append('g')
 .attr('class','pie')
 .attr('transform', function(d,i){return 'translate('+ ((i * width / 10) + width / 10) + ',' +height/2 + ')'} );
 //'translate('+ function(d,i){ return ((i * width / 10) + width / 10)} + ',' +height/2 + ')' does not parse
 //the function; saves it as a string for later use, which doesn't work. Need to return the entire string from
 //the function in order for this to work.


//Layout function - creates angles needed to create pie charts using data
var pieLayout = d3.layout.pie();   //need to tell it which dataset to use

var arcGenerator = d3.svg.arc()
    //.startAngle()  //already stored in data w/ correct name by pieLayout function.
    //.endAngle()
    .innerRadius(0)
    .outerRadius(100);

//       console.log(pies[0]);
//nestedCities[1].values.forEach(function(d,i){
var pieData = [
    (nestedCities[1].values[0].transitTypes[transitMetadata[0].transitType].totalCount/nestedCities[1].values[1].transitTypes.totalCommute.totalCount)*100,
    (nestedCities[1].values[0].transitTypes[transitMetadata[1].transitType].totalCount/nestedCities[1].values[1].transitTypes.totalCommute.totalCount)*100,
    (nestedCities[1].values[0].transitTypes[transitMetadata[2].transitType].totalCount/nestedCities[1].values[1].transitTypes.totalCommute.totalCount)*100,
    (nestedCities[1].values[0].transitTypes[transitMetadata[3].transitType].totalCount/nestedCities[1].values[1].transitTypes.totalCommute.totalCount)*100,
    (nestedCities[1].values[0].transitTypes[transitMetadata[4].transitType].totalCount/nestedCities[1].values[1].transitTypes.totalCommute.totalCount)*100,
    (nestedCities[1].values[0].transitTypes[transitMetadata[5].transitType].totalCount/nestedCities[1].values[1].transitTypes.totalCommute.totalCount)*100,
    (nestedCities[1].values[0].transitTypes[transitMetadata[6].transitType].totalCount/nestedCities[1].values[1].transitTypes.totalCommute.totalCount)*100,
];


//bottomPieCharts = plot.selectAll('.pie-charts')
pieChartGroup.selectAll('pies')
    .append('g')
    .attr('class','bottom-pie')
    .data(pieLayout(pieData))
    .enter()
    .append('path')
    .attr('class', 'slice')
    .attr('d', arcGenerator) //create geometry of path
    .style('fill', function(d,i){
        //console.log(d);  Note that data is in a subobject called .data!!
        //var classification = metadata.get(d); //returns (string) between 1-4
        return scaleColor(i);
    });

//        });


// console.log(onePie);


//console.log(nestedCities[1].values[1].transitTypes[transitMetadata[0].transitType].totalCount); //.transitType
//console.log(transitMetadata[0].transitType);

pies.data(pieLayout(
 [
 (nestedCities[1].values[1].transitTypes[transitMetadata[0].transitType].totalCount/nestedCities[1].values[1].transitTypes.totalCommute.totalCount)*100,
 (nestedCities[1].values[1].transitTypes[transitMetadata[1].transitType].totalCount/nestedCities[1].values[1].transitTypes.totalCommute.totalCount)*100,
 (nestedCities[1].values[1].transitTypes[transitMetadata[2].transitType].totalCount/nestedCities[1].values[1].transitTypes.totalCommute.totalCount)*100,
 (nestedCities[1].values[1].transitTypes[transitMetadata[3].transitType].totalCount/nestedCities[1].values[1].transitTypes.totalCommute.totalCount)*100,
 (nestedCities[1].values[1].transitTypes[transitMetadata[4].transitType].totalCount/nestedCities[1].values[1].transitTypes.totalCommute.totalCount)*100,
 (nestedCities[1].values[1].transitTypes[transitMetadata[5].transitType].totalCount/nestedCities[1].values[1].transitTypes.totalCommute.totalCount)*100,
 (nestedCities[1].values[1].transitTypes[transitMetadata[6].transitType].totalCount/nestedCities[1].values[1].transitTypes.totalCommute.totalCount)*100,
 (nestedCities[1].values[1].transitTypes[transitMetadata[7].transitType].totalCount/nestedCities[1].values[1].transitTypes.totalCommute.totalCount)*100
 ]))
 .enter()
 .append('path')
 .attr('class', 'slice')
 .attr('d', arcGenerator) //create geometry of path
 .style('fill', function(d,i){
 //console.log(d);  Note that data is in a subobject called .data!!
 //var classification = metadata.get(d); //returns (string) between 1-4
 return scaleColor(i);
 });

//});

 nestedCities[1].values.forEach(function(d,i){
 var percentPieData = []; //reset percentPieData each time (new pie chart for each city)

 //console.log((d.transitTypes[transitMetadata[0].transitType].totalCount/d.transitTypes.totalCommute.totalCount)*100);

 for (j=0; j< transitMetadata.length-1; j++){  //calculate the percentPieData array from the input data, using transitMetadata to index.
 percentPieData.push((d.transitTypes[transitMetadata[j].transitType].totalCount/d.transitTypes.totalCommute.totalCount)*100);
 }

 console.log(percentPieData);


 //console.log(pieLayout);



 pies.append('path')
 .attr('class', 'slice')
 .attr('d', arcGenerator) //create geometry of path
 .style('fill', function(d,i){
 //console.log(d);  Note that data is in a subobject called .data!!
 //var classification = metadata.get(d); //returns (string) between 1-4
 return scaleColor(i);
 });


 });









//removed csvData[189].total from beginning of pieData to get rid of 100% wedge

function multiCircleGenerator(countData, appendTo, attributeToPlot, fillColor, strokeColor) {
    for (index = 0; index < timeMetadata.length; index++) {
        appendTo.append('circle')
            .attr('cx', function (d, i) {
                return i * width / 10 + width / 10
            })
            .attr('cy', function (d, i) {
                //console.log(timeMetadata.length);
                return scaleY(+timeLookup.get(timeMetadata[index].timeLabel));
            })
            .attr('r', function (d, i) {
                //return (d.transitTypes.totalCommute.timeUnder10 / d.transitTypes.totalCommute.totalCount) * 100;  //returns as percent, not scaled to match population size
                return scaleR(d.transitTypes[attributeToPlot][timeMetadata[index].timeLabel]);
            })
            .style('fill', fillColor)
            .style('stroke', strokeColor);

    }
}





*/