/*Start by setting up the canvas */
var margin = {t:50,r:100,b:50,l:50};
var width = document.getElementById('plot').clientWidth - margin.r - margin.l,
    height = document.getElementById('plot').clientHeight - margin.t - margin.b;


//Scales - create color scale based on activity classification
var scalePieColor = d3.scale.ordinal().domain([0,1,2,3,4,5,6,7]).range(['orangered','orange','darkcyan','darkviolet','lawngreen','darkgreen','peru','sienna','tan']); //ordinal scale does 1:1 lookup
var scaleX = d3.scale.linear().domain([0,150]).range([0,width]),
    scaleY = d3.scale.linear().domain([0,90]).range([height, 0]),
    scaleR = d3.scale.sqrt().range([0, .02]),  //set values based on sizes that I wanted to obtain - seems awfully small?
    scaleW = d3.scale.linear().domain([0,2.75]).range([0,width/5]);  //set scale for width of commuteBars

//draw plot, create svg canvas, translate as necessary to fit screen
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
    //await saves the output of file 1 and file 2, in the order run (bostonMap should be geoJSON, csvData should be parsed csv.
    .await( function(err, bostonMap, cityData, csvData, cityMetadata, timeMetadata, transitMetadata) {

         console.log(cityData);

        //define a lookup table based on metadata csv - ties time labels in data array (timeUnder10, etc) to numerical values
        for (i = 0; i < timeMetadata.length; i++) {
            timeLookup.set(timeMetadata[i].timeLabel, timeMetadata[i].timeNumber);
        }

        //define a lookup table for transitMetadata; tie transit name to specific color
        for (i = 0; i < transitMetadata.length; i++) {
            transitColorLookup.set(transitMetadata[i].transitType, scalePieColor(i));
        }

        //Nest data array by city name, so that there are two subarrays containing data by type (metro/city)
        var nestedCitiesName = d3.nest()
            .key(function (d) {
                return d.name
            })
            .entries(cityData.data);
        console.log(nestedCitiesName);

        //create some text to use as labels for each screen to identify data
        var narrativeText = [
            '10 cities with the worst commutes',
            'City population',
            'Average commute time',
            'Number of commuters',
            'Number of commuters in each time bin',
            'Metro area commuters',
            'Transit types used',
            'Average time by transit type'
        ];

        //set a variable to scale the transition and duration times (useful for running functions quickly when re-loading out of order)
        var transitionTime = 1000;
        var durationTime = 300;


        //Listen for button click, load the correct function when called
            d3.selectAll('.btn').on('click', function () {

                //Keep track of which button has been pushed last (decides whether to run from previous, or whether to clear screen and reload all svg items)
                var tracker;

                var mode = d3.select(this).attr('id');
                console.log(mode);
                //If button 1 is pushed, set tracker to 1 and run the averageCommuteBubbles function
                if (mode == 'btn-1') {
                    tracker = 1;
                    averageCommuteBubbles(nestedCitiesName,timeMetadata,narrativeText, transitMetadata,transitionTime, durationTime);
                }
                //If button 2 is pushed, check tracker variable to see if button 1 was run last; if so, run function directly
                //Otherwise, run acerageCommuteBubbles first, but using very short transition and duration times so that
                //the user doesn't see the refresh. (Have to use transition time of 30 ms for the first function for some
                //reason - don't know why, but without the longer delay time, it doesn't display the population circles reliably)
                else if (mode == 'btn-2') {
                    if (tracker ==1 ){
                        tracker = 2;
                        commuteDistributionBubbles(nestedCitiesName,timeMetadata,narrativeText, transitMetadata, transitionTime, durationTime);
                    }
                    else {
                        tracker = 2;
                        plot.selectAll("*").remove();
                        averageCommuteBubbles(nestedCitiesName,timeMetadata,narrativeText, transitMetadata,30,.01);
                        commuteDistributionBubbles(nestedCitiesName,timeMetadata,narrativeText, transitMetadata, transitionTime, durationTime);
                    }

                }

                else if (mode == 'btn-3') {
                    if (tracker == 2) {
                        tracker = 3;
                        metroCommuteBubbles(nestedCitiesName, timeMetadata, narrativeText, transitMetadata, transitionTime, durationTime);
                    }
                    else {
                        tracker = 3;
                        plot.selectAll("*").remove();
                        averageCommuteBubbles(nestedCitiesName,timeMetadata,narrativeText, transitMetadata,30,.01);
                        commuteDistributionBubbles(nestedCitiesName,timeMetadata,narrativeText, transitMetadata,.1,.01);
                        metroCommuteBubbles(nestedCitiesName, timeMetadata, narrativeText, transitMetadata, transitionTime, durationTime);
                    }
                }

                else if (mode == 'btn-4') {
                    if (tracker ==3) {
                        tracker = 4;
                        commutePies(nestedCitiesName, timeMetadata, narrativeText, transitMetadata, transitionTime, durationTime);
                    }
                    else {
                        tracker=4;
                        plot.selectAll("*").remove();
                        averageCommuteBubbles(nestedCitiesName,timeMetadata,narrativeText, transitMetadata,30,.01);
                        commuteDistributionBubbles(nestedCitiesName,timeMetadata,narrativeText, transitMetadata,.1,.01);
                        metroCommuteBubbles(nestedCitiesName, timeMetadata, narrativeText, transitMetadata, .1,.01);
                        commutePies(nestedCitiesName, timeMetadata, narrativeText, transitMetadata, transitionTime, durationTime);


                    }
                }

                else if (mode == 'btn-5') {
                    if (tracker==4) {
                        tracker = 5;
                        commuteBars(nestedCitiesName,timeMetadata,narrativeText,transitMetadata, transitionTime, durationTime);
                    }
                    else{
                        tracker = 5;
                        plot.selectAll("*").remove();
                        averageCommuteBubbles(nestedCitiesName,timeMetadata,narrativeText, transitMetadata,30,.01);
                        commuteDistributionBubbles(nestedCitiesName,timeMetadata,narrativeText, transitMetadata,.1,.01);
                        metroCommuteBubbles(nestedCitiesName, timeMetadata, narrativeText, transitMetadata, .1,.01);
                        commutePies(nestedCitiesName, timeMetadata, narrativeText, transitMetadata,  .1,.01);
                        commuteBars(nestedCitiesName,timeMetadata,narrativeText,transitMetadata, transitionTime, durationTime, pieCharts);
                    }
                }

                else {
                    tracker = 0;
                    console.log('broken');
                }
            })
        });


//Plots population circles for each city, translates to average commute time, draws a line at average time
function averageCommuteBubbles(nestedCitiesName,timeMetadata,narrativeText, transitMetadata, transitionTime, durationTime){

    //clear the screen
    plot.selectAll("*").remove();

    //create a group to hold plot labels
    allLabels = plot
        .append('g')
        .attr('class', 'labels-group');

    //create a text object to display information about data shown (from narrativeText array). Place it in the labels group.
    var narration = allLabels.append('text')
        .attr('class','narrate-text')
        .text(function(d,i){
            return (narrativeText[0])
        })
        .attr('transform',function(d,i){
            //console.log(timeMetadata[i].timeNumber);
            return 'translate('+width/2+ ',' + scaleY(65) + ')'})
        .attr('text-anchor', 'middle')
        .attr('font-size', '18px')
        .style('fill', 'rgb(200,200,200');

    //create 10 groups bound to the city names
    var popCircles = plot.selectAll('.city-metro-groups')
        .data(nestedCitiesName)
        .enter()
        .append('g')
        .attr('class', 'city-metro-group')
        .attr('transform', function (d, i) {
            return 'translate(' + ((i * width / 10.5) + width / 10.5) + ',' + 0 + ')'
        });

    //Create groups to put city-specific and metro-specific data in
    cityPopCircles = popCircles
        .append('g')
        .attr('class', 'city-population-group');

    metroPopCircles = popCircles
        .append('g')
        .attr('class', 'metro-population-group');

    //bind data to the cityPopCircles group
    cityPopCircles.selectAll('city-population-circles')
        .data(nestedCitiesName) //duplicated DC city data for metro - otherwise, returns an error b/c only one array element!
        .enter();


    //add a label for each city, display in the center of the screen
    cityLabels = cityPopCircles.append('text')
        .text(function (d, i) {
            return d.key;
        })//retrieve city label from rows array, use as text
        .attr('class', 'label')
        .attr('text-anchor', 'middle')
        .attr('transform',function(d,i){
            return 'translate('+0+ ',' + scaleY(55) + ')'})
        .attr('font-size', '6px')
        .style('fill', 'rgb(200,200,200)');

    //move the city labels to the top of the screen, out of the way of the rest of the animation
    cityLabels.transition().delay(2*transitionTime).duration(1*durationTime)
        .attr('transform',function(d,i){
            return 'translate('+0+ ',' + scaleY(85) + ')'});

    //move the narration text out of the way also, but not as far as the labels (still need to view it while data displays)
    narration.transition().delay(2*transitionTime).duration(1*durationTime)
        .attr('transform',function(d,i){
            return 'translate('+width/2+ ',' + scaleY(70) + ')'});

    //append circles showing the city population. Place at a fixed position to begin, so that the viewer can compare city size alone
    //start with a radius of 0, and use transition to grow in (need to start in right place, otherwise they fly in from edge of screen)
    popCircles = cityPopCircles.append('circle')
        .attr('class','city-population-circle')
        .attr('cx', 0) //function (d, i) {return i * width / 10 + width / 10            })
        .attr('cy', height/2+50)
        .attr('r', 0);

   //call the transition function to make the population circles grow in
    popCircles.transition().delay(3*transitionTime).duration(1.5*durationTime)
        .attr('r', function (d, i) {
            return scaleR(d.values[1].population)
        });

    //Update the narration to identify city population data
    narration.transition().delay(3*transitionTime).duration(.7*durationTime)
        .text(function(d,i){
            return (narrativeText[1])
        })
        .style('fill', 'rgb(95,188,211)'); //44,90,160

    //Move the city population circles to their average commute times
    popCircles.transition().delay(5*transitionTime).duration(.4*durationTime)
        .attr('cy', function (d, i) {
            return scaleY(d.values[1].transitTypes.totalCommute.overallAverageTime)
        });

    //Add a line showing the average commute time for each circle. Begin with width zero, transition to grow in
    averageLine = cityPopCircles.append('line')
        .attr('class','average-line')
        .attr('x1',0)
        .attr('y1', function (d, i) {
            return scaleY(d.values[1].transitTypes.totalCommute.overallAverageTime)
        })
        .attr('x2', 0)
        .attr('y2', function (d, i) {
            return scaleY(d.values[1].transitTypes.totalCommute.overallAverageTime)
        });
    //The line weight/color seems to be inconsistent in the drawing, but the CSS style is never contradicted in the script. Not
    //sure why there should be a difference?

    //draw the average line
    averageLine.transition().delay(5.5*transitionTime).duration(1.5*durationTime)
        .attr('x1', function (d, i) {
            return (-7-(scaleR(d.values[1].population)));
        })
        .attr('x2', function (d, i) {
            return (7+  (scaleR(d.values[1].population)));
        });

    //update narrative text to describe average commute time
    narration.transition().delay(5*transitionTime).duration(.4*durationTime)
        .text(function(d,i){
            return (narrativeText[2])
        })
        .style('fill', 'rgb(11,34,40)');

    //add axis labels in the label group - draw first as white, then display
    var axisLabels = allLabels.selectAll('.labels-group')
        .data(timeMetadata)
        .enter()
        .append('text')
        .attr('class','axis-labels')
        .text(function(d,i){
            return (timeMetadata[i].timeNumber + ' mins')
        })
        .attr('transform',function(d,i){
            return 'translate('+0+ ',' + scaleY(timeMetadata[i].timeNumber) + ')'})
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .style('fill', 'white');

    //show axis labels
    axisLabels.transition().delay(5.5*transitionTime).duration(.4*durationTime)
        .style('fill', 'rgb(200,200,200)');

}

//Adds a dotted line showing how many people commute in each city, then displays the count for people in each time interval
//using a set of circles positioned at the lower bound for each interval.
function commuteDistributionBubbles(nestedCitiesName,timeMetadata,narrativeText, transitMetadata, transitionTime, durationTime){

    //create a circle with a dashed stroke. Set radius to 0 to prep for later transition
     dashCircle = cityPopCircles.append('circle')
        .attr('class','city-commuter-pop')
        .attr('cx', 0)
        .attr('cy', function (d, i) {
            return scaleY(d.values[1].transitTypes.totalCommute.overallAverageTime);
        })
        .attr('r', 0);

    //change the size of the circle to represent the number of people who commute in each city
    dashCircle.transition().delay(0*transitionTime).duration(.4*durationTime)
        .attr('r',function (d, i) {
            return scaleR(d.values[1].transitTypes.totalCommute.totalCount);
        });

    //create a variable to access the narration text (created in previous function; want to update it here)
    var narration = plot.selectAll('.narrate-text');

    //update narration text to identify data added
    narration.transition().delay(0*transitionTime).duration(.4*durationTime)
        .text(function(d,i){
            return (narrativeText[3])
        })
        .style('fill', 'rgb(38,122,142)');

    //append a group to hold the commuting interval circles for each city
    cityCommuteCircles = cityPopCircles
        .append('g')
        .attr('class','city-commute-circles');

    //bind the data and draw the circles. Begin with radius of zero at the center of the population circles, use transition to populate
    cityCircles = cityCommuteCircles.selectAll('.city-commute-circles')
        .data(function(d,i){
            var localCommuteIntervals = [];

            for (j=0; j<timeMetadata.length; j++){
                localCommuteIntervals.push(d.values[1].transitTypes.totalCommute[timeMetadata[j].timeLabel]);
            }

            return localCommuteIntervals;
        })
        .enter()
        .append('circle')
        .attr('class','city-commute-circle')
        .attr('cx',0)
        .attr('cy',function (d, i) {
            return scaleY(nestedCitiesName[i].values[1].transitTypes.totalCommute.overallAverageTime);
        })
        .attr('r', 0);

    //translate the commute circles to their proper locations
    cityCircles.transition().delay(2*transitionTime).duration(.8*durationTime)
        .attr('cy',function (d, i) {
            return scaleY([timeMetadata[i].timeNumber]);
        })
        .attr('r',function(d,i){return scaleR(d)});

    //update narration text to indicate change of data
    narration.transition().delay(2*transitionTime).duration(.4*durationTime)
        .text(function(d,i){
            return (narrativeText[4])
        })
        .attr('transform',function(d,i){
            return 'translate('+width/2+ ',' + scaleY(75) + ')'})
        .style('fill', 'rgb(38,122,142)');

}

//This function adds circles representing the people in the urban metro area who commute in each time interval
function metroCommuteBubbles(nestedCitiesName,timeMetadata,narrativeText, transitMetadata, transitionTime, durationTime){

    //set up a group to hold circles
    metroCommuteCircles = metroPopCircles
        .append('g')
        .attr('class','metro-commute-circles');

    //bind data, create circles w/ radius of 0
    metroCircles = metroCommuteCircles.selectAll('.metro-commute-circles')
        .data(function(d,i){
            var localCommuteIntervals = [];

            for (j=0; j<timeMetadata.length; j++){
                localCommuteIntervals.push(d.values[0].transitTypes.totalCommute[timeMetadata[j].timeLabel]);
            }

            return localCommuteIntervals;
        })
        .enter()
        .append('circle')
        .attr('class','metro-commute-circle')
        .attr('cx',0)
        .attr('cy',function (d, i) {
            return scaleY([timeMetadata[i].timeNumber]);
        })
        .attr('r',0);

    //scale circles to metro area counts
    metroCircles.transition().delay(0*transitionTime).duration(.4*durationTime)
        .attr('r',function(d,i){return scaleR(d)});

    //create narration variable for this function
    var narration = plot.selectAll('.narrate-text');

    //update narration text
    narration.transition().delay(0*transitionTime).duration(.4*durationTime)
        .text(function(d,i){
            return (narrativeText[5])
        })
        .style('fill', 'rgb(175,221,233)')
        .attr('transform',function(d,i){
            //console.log(timeMetadata[i].timeNumber);
            return 'translate('+width/2+ ',' + scaleY(75) + ')'});

}

//This function hides all of the population and commute interval information, then updates the average lines and draws
//one pie chart for each city, to show the different kinds of public transit used
function  commutePies(nestedCitiesName,timeMetadata,narrativeText,transitMetadata, transitionTime, durationTime) {

    //declare an empty array to serve as holder variable
    var percentPieData = [];

    //Layout function - creates angles needed to create pie charts using data
    var pieLayout = d3.layout.pie();

    //define an arc generator function for the pie chart. This one will be used to bind the data, and has a radius of zero
    var beginArcGenerator = d3.svg.arc()
        //.startAngle()  //already stored in data w/ correct name by pieLayout function.
        //.endAngle()
        .innerRadius(0)
        .outerRadius(0);

    //this second generator function will be run at the transition to re-create the pie charts when needed
    var arcGenerator = d3.svg.arc()
        .innerRadius(0)
        .outerRadius(35);

    //create a selection and bind data to create groups for the pie charts to land in
    var cityTransitTypes = plot.selectAll('.transit-types')
        .data(function(d,i){
            return nestedCitiesName})
        .enter()
        .append('g')
        .attr('class', 'city-transit-types');

    //append a group to hold each pie chart (composed of several slices)
    cityPies = cityTransitTypes
        .append('g')
        .attr('class','transit-pie-chart')
        .attr('transform', function(d,i){return 'translate(' + ((i * width / 10.5) + width / 10.5) + ',' + scaleY(d.values[1].transitTypes.totalCommute.overallAverageTime) + ')' });

    //create a pie chart for each bound data object. Need to bind to the subarray data to create the pie wedges; extract this first
    pieCharts = cityPies.selectAll('.transit-pie-chart')//.append('g')
        .data(function(d,i) {
            var localCommuteData = [];

            //use a lookup table to extract just the array elements that we need,convert to percent
            //push these elements to a temporary storage array
            for (j=0; j<transitMetadata.length; j++){
                localCommuteData.push(d.values[1].transitTypes[transitMetadata[j].transitType].totalCount/d.values[1].transitTypes.totalCommute.totalCount*100);
            }

            //run the pieLayout function on the array, return this as the data to bind for the arc generator function
            return pieLayout(localCommuteData);
        })
        .enter()
        .append('path')
        .attr('class', 'slice')
        .attr('d', beginArcGenerator) //create geometry of path
        .style('fill', function (d, i) {
            return scalePieColor(i);
        });

    //Grab the metro circles left on the svg canvas from the last function, shrink their radius to zero
    metroBubbles = plot.selectAll('.metro-commute-circle');
    metroBubbles.transition().delay(0*transitionTime)
        .attr('r',0);


    //clean up the DOM by removing unused elements
    metroBubbles.remove(); //metroBubbles.exit is not a function (because not bound here?)

    //Similarly, grab commute circles, translate them to the appropriate average commute time, and shrink radius
    commuteBubbles = plot.selectAll('.city-commute-circle');
    commuteBubbles.transition().delay(1*transitionTime)
        .attr('cy',function(d,i){
            //use index value (between 0 and 89 - 9 circles per city, 10 cities) to determine the appropriate
            //y position for the average commute time. Couldn't figure out how to extract from the bound data using a
            //selection created from DOM elements
            if (i<9){
               return  scaleY(nestedCitiesName[0].values[1].transitTypes.totalCommute.overallAverageTime);
            }
            else if (i<18){
                //console.log('9<18');
                return  scaleY(nestedCitiesName[1].values[1].transitTypes.totalCommute.overallAverageTime);
            }
            else if (i<27){
                return  scaleY(nestedCitiesName[2].values[1].transitTypes.totalCommute.overallAverageTime);
            }
            else if (i<36){
                //console.log('27<36');
                return  scaleY(nestedCitiesName[3].values[1].transitTypes.totalCommute.overallAverageTime);
            }
            else if (i<45){
                //console.log('36<45');
                return  scaleY(nestedCitiesName[4].values[1].transitTypes.totalCommute.overallAverageTime);
            }
            else if (i<54){
                return  scaleY(nestedCitiesName[5].values[1].transitTypes.totalCommute.overallAverageTime);
            }
            else if (i<63){
                return  scaleY(nestedCitiesName[6].values[1].transitTypes.totalCommute.overallAverageTime);
            }
            else if (i<72){
                return  scaleY(nestedCitiesName[7].values[1].transitTypes.totalCommute.overallAverageTime);
            }
            else if (i<81) {
                return scaleY(nestedCitiesName[8].values[1].transitTypes.totalCommute.overallAverageTime);
            }
            else if (i<90){
                return  scaleY(nestedCitiesName[9].values[1].transitTypes.totalCommute.overallAverageTime);
            }
        });

    commuteBubbles.transition().delay(1.5*transitionTime).attr('r',0).remove();

    //Grab population circle, dashed lines, and translated commute circles, and set radii to zero.
    //I think I should be able to combine these transitions by selecting multiple classes at once
    //(assigning multiple classes is ('class', 'class1 class2') - Wk 7 Ex3, but calling more than one didn't work here.
    popBubbles = plot.selectAll('.city-population-circle');

    popBubbles.transition().delay(1.5*transitionTime).duration(.5*durationTime)
        .attr('r',0)
        .remove();

    commuterPopBubbles = plot.selectAll('.city-commuter-pop');

    commuterPopBubbles.transition().delay(1.5*transitionTime).duration(.5*durationTime)
        .attr('r',0)
        .remove();

    //update pie charts using the arc generator function - grow in where the population circles were
    //(Would be nice if this were smoother...)
    pieCharts.transition().delay(2.5*transitionTime).duration(0*durationTime)
        .attr('d', arcGenerator); //create geometry of path;

    //update the average line to fit the pie charts (previously scaled to the size of the population circles)
    averageLine = plot.selectAll('.average-line');
    averageLine.transition().delay(2.5*transitionTime).duration(.5*durationTime)
        .attr('x1',-49)
        .attr('x2',49);

    //update the narration text to explain the pie charts to the user
    var narration = plot.selectAll('.narrate-text');
    narration.transition().delay(2.5*transitionTime).duration(.4*durationTime)
        .text(function(d,i){
            return (narrativeText[6])
        })
        .style('fill', 'darkcyan');

    //set label text for different transit types
    var transitLabelText = ['Bus', 'Carpool', 'Drove alone', 'Rail or Ferry', 'Streetcar', 'Taxi', 'Walked'];

    //add labels with the appropriate colors to the screen
    allLabels = plot.selectAll('.labels-group');
    var transitLabels = allLabels.selectAll('.transit-labels')  //allLabels.selectAll('.labels-group')
        .data(transitLabelText)
        .enter()
        .append('text')
        .attr('class','transit-labels')
        .text(function(d,i){
            return (d)
        })
        //.attr('text-anchor', 'middle')
        .attr('transform',function(d,i){
            //console.log(timeMetadata[i].timeNumber);
            //console.log(transitMetadata[i].transitType);
            //console.log(nestedCitiesName[9].values[1].transitTypes);
            return 'translate('+((10.5*width/10.5+5))+ ',' + scaleY(35+5*i) + ')'})
        .attr('font-size', '14px')
        .style('fill', 'white');

    transitLabels.transition().delay(2.5*transitionTime).duration(.5*durationTime)
        .style('fill', function(d,i){
            return scalePieColor(i)
        });

}

//this function adds colored bars to represent the average commute times for each form of transit used in each city
function commuteBars(nestedCitiesName,timeMetadata,narrativeText,transitMetadata, transitionTime, durationTime, pieCharts) {

    //Re-define the arc generator function for the pie chart, for exit animation
    var beginArcGenerator = d3.svg.arc()
        //.startAngle()  //already stored in data w/ correct name by pieLayout function.
        //.endAngle()
        .innerRadius(0)
        .outerRadius(0);

    //grab DOM elements in a selection
     var cityTransitTypes = plot.selectAll('.city-transit-types');

    //append a group to hold colored bars
    cityTransitBars = cityTransitTypes
        .append('g')
        .attr('class','transit-time-bars')
        .attr('transform', function(d,i){return 'translate('+ ((i * width / 10.5) + width / 10.5) + ',' + 0 + ')'});

    //append bars to cityTransit group, one for each transit type (could connect to generator function to link position and color to data, but works with the bind also)
    transitBars = cityTransitBars.selectAll('bars')
        .data(function(d,i) {
            var localtransitTimes = [];

            //as for the pie charts above, extract the appropriate data to a temporary array
            for (j=0; j<transitMetadata.length; j++){
                localtransitTimes.push({overallAverage:d.values[1].transitTypes.totalCommute.overallAverageTime,
                    transitAverages:d.values[1].transitTypes[transitMetadata[j].transitType].overallAverageTime,
                    overallCount:d.values[1].transitTypes.totalCommute.totalCount,
                    transitCount:d.values[1].transitTypes[transitMetadata[j].transitType].totalCount
                });
            }
            //return the temporary array for data binding
            return localtransitTimes;
        })
        .enter()
        .append('rect')
        .attr('class','bar')
        .attr('x', 1) //use negative of 1/2 bar width to center in containing group
        .attr('y', function(d,i){
            return scaleY(d.overallAverage)-1.5;
        })
        .attr('width',0)
        .attr('height',3)
        .style('fill', function(d,i){
            //checked color order - coming out in order for Detroit
            return scalePieColor(i)
        });

    //use a transition to allow the bars to grow in
    transitBars.transition().delay(.1*transitionTime).duration(.7*durationTime)
        .attr('x',function(d,i){
            console.log(scaleW(d.transitCount/ d.overallCount));
            return -scaleW(d.transitCount/ d.overallCount)})
        .attr('width', function(d,i){
            return 2*scaleW(d.transitCount/ d.overallCount)
        });

    //pieCharts = plot.selectAll('.transit-pie-chart');

    //This doesn't appear to be a smooth transition - removes pie charts abruptly.
    //Would prefer to make it smoother by accessing the radius, but this doesn't seem to work for pielayouts
    pieCharts.transition().delay(.1*transitionTime).duration(10*durationTime)
        .attr('d', beginArcGenerator)
        .remove();

    //update the average line to fit the pie charts (previously scaled to the size of the population circles)
    averageLine = plot.selectAll('.average-line');
    averageLine.style('stroke-dasharray','5px 5px');

    //and move them to the appropriate time average for each transit type
    transitBars.transition().delay(.85*transitionTime).duration(.75*durationTime)
        .attr('y', function(d,i){
            return scaleY(d.transitAverages);
        });

    //grab the transit labels from the last function
    var transitLabels = plot.selectAll('.transit-labels');

    //and update them to move next to the appropriate bars for the last column of data
    transitLabels.transition().delay(.9*transitionTime).duration(.5*durationTime)
        .attr('transform',function(d,i){
             return 'translate('+((10.5*width/10.5))+ ',' + scaleY(nestedCitiesName[9].values[1].transitTypes[transitMetadata[i].transitType].overallAverageTime - 1) + ')'
        });

    //update narrative text
    var narration = plot.selectAll('.narrate-text');

    narration.transition().delay(.1*transitionTime).duration(.4*durationTime)
        .text(function(d,i){
            return (narrativeText[7])
        })
        .style('fill', 'rgb(200,200,200)')
        .attr('transform',function(d,i){
            //console.log(timeMetadata[i].timeNumber);
            return 'translate('+width/2+ ',' + scaleY(75) + ')'});


    //add a pointless transition on an already-hidden item - to make sure that reducing the transition time doesn't cut off the animation for the
    //last few animations (not sure that this is still a problem in this version of the code, but I was having problems with the function terminating
    //after the final transition time. If the final transition had a non-zero duration, this caused problems.
    var endTimer = plot.selectAll('.city-population-circle');

    endTimer.transition().delay(30*transitionTime).duration(1000)
        .attr('r',0);
}


function parse(csvData){
//Not sure I even need the parse function anymore?? Was using it to load csv data in a previous iteration of the code.
//Could also use it to parse metadata files, but was having trouble with multiple calls and passing back more than one variable...

    //Link the commuteTime values to a geoID to create a lookup table for accessing the geoJSON data. Also save name stored in csv.
    commuteTime.set(csvData.geoid, {time:+csvData.time30to34, name: csvData.name});

    return(csvData);

}

