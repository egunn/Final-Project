/*Start by setting up the canvas */
var margin = {t:50,r:100,b:50,l:50};
var width = document.getElementById('plot').clientWidth - margin.r - margin.l,
    height = document.getElementById('plot').clientHeight - margin.t - margin.b;


//Scales - create color scale based on activity classification
var scalePieColor = d3.scale.ordinal().domain([0,1,2,3,4,5,6,7]).range(['orangered','orange','darkcyan','darkviolet','lawngreen','darkgreen','peru','sienna','tan']); //ordinal scale does 1:1 lookup
//need same # of items in domain and range for an ordinal scale
var scaleColor = d3.scale.category20b(); //for now, use pre-made color category generator
var scaleGradientColor = d3.scale.linear().domain([0,610000]).range(['white','green']);
//gradient from blue to red linear().domain([1,4]).range(['blue','red']);
var scaleX = d3.scale.linear().domain([0,150]).range([0,width]),
    scaleY = d3.scale.linear().domain([0,90]).range([height, 0]),
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

        //console.log(transitMetadata[1].transitType);

        //define a lookup table for transitMetadata; tie transit name to specific color
        for (i = 0; i < transitMetadata.length; i++) {
            transitColorLookup.set(transitMetadata[i].transitType, scalePieColor(i));
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

        //Nest data array by city name, so that there are two subarrays containing data by type (metro/city)
        var nestedCitiesName = d3.nest()
            .key(function (d) {
                return d.name
            })
            .entries(cityData.data);
        console.log(nestedCitiesName);

        var narrativeText = [
            '10 cities with the worst commutes',
            'City population',
            'Average commute time',
            'Number of commuters',
            'Distribution of commute times',
            'Metro area commuters',
            'Transit types used',
            'Average time by transit type'
        ];

        var transitionTime = 1000;
        var durationTime = 300;
//////////////////////////////development area







////////////////////////////////

            //csvData is an array of 312 objects, each with geoid, name, and time values for each commute length interval in the dataset.
            //The data from individual objects can be accessed using:
            // console.log(csvData[i].geoid);
            //console.log(csvData.geoid); returns undefined (contrast with use in parse function below...because parse goes
            // through the dataset row by row)

        //Listen for button click, load the correct function when called
            d3.selectAll('.btn').on('click', function () {

                var mode = d3.select(this).attr('id');
                console.log(mode);
                if (mode == 'btn-1') {
                    averageCommuteBubbles(nestedCitiesName,timeMetadata,narrativeText, transitMetadata,transitionTime, durationTime);
                }
                else if (mode == 'btn-2') {
                    commuteDistributionBubbles(nestedCitiesName,timeMetadata,narrativeText, transitMetadata, transitionTime, durationTime);
                }

                else if (mode == 'btn-3') {
                    metroCommuteBubbles(nestedCitiesName,timeMetadata,narrativeText, transitMetadata, transitionTime, durationTime);
                }

                else if (mode == 'btn-4') {
                    commutePies(nestedCitiesName,timeMetadata,narrativeText,transitMetadata, transitionTime, durationTime);
                }

                else if (mode == 'btn-5') {
                    commuteBars(nestedCitiesName,timeMetadata,narrativeText,transitMetadata, transitionTime, durationTime);
                }

                else {
                    console.log('broken');
                }
            })
        });
//    });


//function dataLoaded(err,geoData,pieData){
//}

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
        .attr('transform', function(d,i){
            return 'translate('+ ((i * width / 10.5) + width / 10.5) + ',' + 0 + ')'
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
        //.attr('x', function (d, i) {
        //    return i * width / 10 + width / 10
        //})
        .attr('class', 'label')
        .attr('text-anchor', 'middle')
        .attr('transform',function(d,i){
            //console.log(timeMetadata[i].timeNumber);
            return 'translate('+0+ ',' + scaleY(55) + ')'})
        .attr('font-size', '6px')
        .style('fill', 'rgb(200,200,200)');

    //move the city labels to the top of the screen, out of the way of the rest of the animation
    cityLabels.transition().delay(2*transitionTime).duration(1*durationTime)
        .attr('transform',function(d,i){
            //console.log(timeMetadata[i].timeNumber);
            return 'translate('+0+ ',' + scaleY(85) + ')'});

    //move the narration text out of the way also, but not as far as the labels (still need to view it while data displays)
    narration.transition().delay(2*transitionTime).duration(1*durationTime)
        .attr('transform',function(d,i){
        //console.log(timeMetadata[i].timeNumber);
            return 'translate('+width/2+ ',' + scaleY(70) + ')'});

    //append circles showing the city population. Place at a fixed position to begin, so that the viewer can compare city size alone
    //start with a radius of 0, and use transition to grow in (need to start in right place, otherwise they fly in from edge of screen)
    popCircles = cityPopCircles.append('circle')
        .attr('class','city-population-circle')
        .attr('cx', 0) //function (d, i) {return i * width / 10 + width / 10            })
        .attr('cy', height/2+50)
        .attr('r', 0);
        //.style('fill', 'green');
    //.attr('transform', function(d,i){return 'translate(' + 0 + ',' + scaleY(d.values[1].transitTypes.totalCommute.overallAverageTime) + ')' });

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
        //.style('stroke', 'rgb(22,45,80)')
        //.style('stroke-weight', '4px');

    //draw the average line
    averageLine.transition().delay(5.5*transitionTime).duration(1.5*durationTime)
        .attr('x1', function (d, i) {
            return (-7-(scaleR(d.values[1].population))); //(i * width / 10 + width / 10) - 7 - (scaleR(d.values[1].population))
        })
        .attr('x2', function (d, i) {
            return (7+  (scaleR(d.values[1].population)));//(i * width / 10 + width / 10) + 7 + (scaleR(d.values[1].population))
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
            //console.log(timeMetadata[i].timeNumber);
            return 'translate('+0+ ',' + scaleY(timeMetadata[i].timeNumber) + ')'})
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .style('fill', 'white');

    //show axis labels
    axisLabels.transition().delay(5.5*transitionTime).duration(.4*durationTime)
        .style('fill', 'rgb(200,200,200)');

    //commuteDistributionBubbles(nestedCitiesName,timeMetadata,narrativeText, transitMetadata, transitionTime, durationTime)

}


function commuteDistributionBubbles(nestedCitiesName,timeMetadata,narrativeText, transitMetadata, transitionTime, durationTime){

    //averageCommuteBubbles(nestedCitiesName,timeMetadata,narrativeText, transitMetadata,2, 2);

    dashCircle = cityPopCircles.append('circle')
        .attr('class','city-commuter-pop')
        .attr('cx', 0) //function (d, i) {                return i * width / 10 + width / 10            })
        .attr('cy', function (d, i) {
            return scaleY(d.values[1].transitTypes.totalCommute.overallAverageTime);
        })
        .attr('r', 0);

    dashCircle.transition().delay(0*transitionTime).duration(.4*durationTime)
        .attr('r',function (d, i) {
            //return (d.transitTypes.totalCommute.timeUnder10 / d.transitTypes.totalCommute.totalCount) * 100;  //returns as percent, not scaled to match population size
            //console.log(d.transitTypes.totalCommute.totalCount);
            return scaleR(d.values[1].transitTypes.totalCommute.totalCount);
        });

    var narration = plot.selectAll('.narrate-text');

    narration.transition().delay(0*transitionTime).duration(.4*durationTime)
        .text(function(d,i){
            return (narrativeText[3])
        })
        .style('fill', 'rgb(38,122,142)');

    cityCommuteCircles = cityPopCircles
        .append('g')
        .attr('class','city-commute-circles');
    //.attr();  //translate to match scale for population circles!!

    cityCircles = cityCommuteCircles.selectAll('.city-commute-circles')
        .data(function(d,i){
            var localCommuteIntervals = [];

            for (j=0; j<timeMetadata.length; j++){
                localCommuteIntervals.push(d.values[1].transitTypes.totalCommute[timeMetadata[j].timeLabel]);
                //console.log(d.transitTypes[transitMetadata[j].transitType].totalCount/d.transitTypes.totalCommute.totalCount*100);
            }

            return localCommuteIntervals;
        })//nestedDataName gives me 10 circles, one for each city - not what I want here! Need 9 circles, one for each entry in the timeMetadata array
        .enter()
        .append('circle')
        .attr('class','city-commute-circle')
        .attr('cx',0)
        .attr('cy',function (d, i) {
            //console.log(nestedCitiesName[i].values[1].transitTypes.totalCommute.overallAverageTime)
            return scaleY(nestedCitiesName[i].values[1].transitTypes.totalCommute.overallAverageTime);
        })//function (d, i) {
        //for(j=0; j<timeMetadata.length; j++) {
        // console.log(d.values[1].transitTypes.totalCommute[timeMetadata[j].timeLabel]);
        //console.log(d.values[1].transitTypes.totalCommute[timeMetadata[j]]);
        //}
        //d.transitTypes[transitMetadata[j].transitType].totalCount/d.transitTypes.totalCommute.totalCount*100
        // return scaleY([timeMetadata[i].timeNumber]);
        //})
        .attr('r', 0); //function(d,i){return scaleR(d)})
        //.style('fill','rgb(38,122,142)');

    cityCircles.transition().delay(2*transitionTime).duration(.8*durationTime)
        .attr('cy',function (d, i) {
            //for(j=0; j<timeMetadata.length; j++) {
            // console.log(d.values[1].transitTypes.totalCommute[timeMetadata[j].timeLabel]);
            //console.log(d.values[1].transitTypes.totalCommute[timeMetadata[j]]);
            //}
            //d.transitTypes[transitMetadata[j].transitType].totalCount/d.transitTypes.totalCommute.totalCount*100
            return scaleY([timeMetadata[i].timeNumber]);
        })
        .attr('r',function(d,i){return scaleR(d)});

    narration.transition().delay(2*transitionTime).duration(.4*durationTime)
        .text(function(d,i){
            return (narrativeText[4])
        })
        .attr('transform',function(d,i){
            //console.log(timeMetadata[i].timeNumber);
            return 'translate('+width/2+ ',' + scaleY(75) + ')'})
        .style('fill', 'rgb(38,122,142)');



}

function metroCommuteBubbles(nestedCitiesName,timeMetadata,narrativeText, transitMetadata, transitionTime, durationTime){
    metroCommuteCircles = metroPopCircles
        .append('g')
        .attr('class','metro-commute-circles');

    metroCircles = metroCommuteCircles.selectAll('.metro-commute-circles')
        .data(function(d,i){
            var localCommuteIntervals = [];

            for (j=0; j<timeMetadata.length; j++){
                localCommuteIntervals.push(d.values[0].transitTypes.totalCommute[timeMetadata[j].timeLabel]);
                //console.log(d.transitTypes[transitMetadata[j].transitType].totalCount/d.transitTypes.totalCommute.totalCount*100);
            }

            return localCommuteIntervals;
        })//nestedDataName gives me 10 circles, one for each city - not what I want here! Need 9 circles, one for each entry in the timeMetadata array
        .enter()
        .append('circle')
        .attr('class','metro-commute-circle')
        .attr('cx',0)
        .attr('cy',function (d, i) {
            //for(j=0; j<timeMetadata.length; j++) {
            // console.log(d.values[1].transitTypes.totalCommute[timeMetadata[j].timeLabel]);
            //console.log(d.values[1].transitTypes.totalCommute[timeMetadata[j]]);
            //}
            //d.transitTypes[transitMetadata[j].transitType].totalCount/d.transitTypes.totalCommute.totalCount*100
            return scaleY([timeMetadata[i].timeNumber]);
        })
        .attr('r',0);
        //.style('fill','none');
        //.style('stroke', 'purple');

    metroCircles.transition().delay(0*transitionTime).duration(.4*durationTime)
        .attr('r',function(d,i){return scaleR(d)});

    var narration = plot.selectAll('.narrate-text');

    narration.transition().delay(0*transitionTime).duration(.4*durationTime)
        .text(function(d,i){
            return (narrativeText[5])
        })
        .style('fill', 'rgb(175,221,233)');

    //commutePies(nestedCitiesName,timeMetadata,narrativeText,transitMetadata, transitionTime, durationTime)
}

function  commutePies(nestedCitiesName,timeMetadata,narrativeText,transitMetadata, transitionTime, durationTime) {

    //plot.selectAll("*").remove();

    //Based on In-Class 9-Ex 2
    var percentPieData = [];

    //Layout function - creates angles needed to create pie charts using data
    var pieLayout = d3.layout.pie();   //need to tell it which dataset to use

    var beginArcGenerator = d3.svg.arc()
        //.startAngle()  //already stored in data w/ correct name by pieLayout function.
        //.endAngle()
        .innerRadius(0)
        .outerRadius(0);

    var arcGenerator = d3.svg.arc()
        //.startAngle()  //already stored in data w/ correct name by pieLayout function.
        //.endAngle()
        .innerRadius(0)
        .outerRadius(35);

  /*  var axisLabels = plot.selectAll('.axisLabels')
        .data(timeMetadata)
        .enter()
        .append('text')
        .attr('class','axis-labels')
        .text(function(d,i){
            return (timeMetadata[i].timeNumber + ' mins')
        })
        .attr('transform',function(d,i){
            //console.log(timeMetadata[i].timeNumber);
            return 'translate('+0+ ',' + scaleY(timeMetadata[i].timeNumber) + ')'})
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .style('fill', 'rgb(215,215,215)');*/

    var cityTransitTypes = plot.selectAll('.transit-types')
        .data(function(d,i){
            //console.log(nestedCitiesName[i].values[1]);
            return nestedCitiesName})
        .enter()
        .append('g')
        .attr('class', 'city-transit-types');
    //.attr('transform', function(d,i){return 'translate(' + ((i * width / 10) + width / 10) + ',' + height / 2 + ')'});

/*    cityTransitTypes
        .append('text')
        .text(function(d,i){
            //console.log(d.values);
            return d.key}) //.attr('r', function(d,i){return scaleR(nestedCities[1].values[i].population)})
        .attr('class', 'label')
        .attr('text-anchor', 'middle')
        .attr('font-size', '6px')
        .style('fill', 'rgb(215,215,215)')
//********Fix height to match other function!!!
        .attr('transform', function(d,i){return 'translate('+ ((i * width / 10) + width / 10) + ',' + height / 15 + ')'});
*/

/*    cityTransitTypes.append('line')
        .attr('x1',function(d,i){return ((i * width / 10) + width / 10)-47})
        .attr('y1',function(d,i){return scaleY(d.values[1].transitTypes.totalCommute.overallAverageTime)})
        .attr('x2',function(d,i){return ((i * width / 10) + width / 10)+47})
        .attr('y2',function(d,i){return scaleY(d.values[1].transitTypes.totalCommute.overallAverageTime)})
        .style('stroke','blue')
        .style('stroke-weight','4px');
        */

    //create a pie chart for each bound data object, using the transitTypes attribute (show percent bus, carpool, drive, etc)
    cityPies = cityTransitTypes
        .append('g')
        .attr('class','transit-pie-chart')
        .attr('transform', function(d,i){return 'translate(' + ((i * width / 10.5) + width / 10.5) + ',' + scaleY(d.values[1].transitTypes.totalCommute.overallAverageTime) + ')' });


    pieCharts = cityPies.selectAll('.transit-pie-chart')//.append('g')
        .data(function(d,i) {
            //may not need to use lookup table in this way (though it may help with color constancy) - getting the same error with the for loop that returns an array
            //as I got with the direct indexing of nestedCities.
            var localCommuteData = [];

            for (j=0; j<transitMetadata.length; j++){
                //console.log(d.values[1].transitTypes.totalCommute.totalCount);
                localCommuteData.push(d.values[1].transitTypes[transitMetadata[j].transitType].totalCount/d.values[1].transitTypes.totalCommute.totalCount*100);
                //console.log(d.transitTypes[transitMetadata[j].transitType].totalCount/d.transitTypes.totalCommute.totalCount*100);
            }
            //console.log('localCommute '+ [localCommuteData]);
            //console.log(pieLayout(localCommuteData));
            return pieLayout(localCommuteData);
        })
        .enter()
        .append('path')
        .attr('class', 'slice')
        .attr('d', beginArcGenerator) //create geometry of path
        .style('fill', function (d, i) {
            return scalePieColor(i);
        });

    metroBubbles = plot.selectAll('.metro-commute-circle');
    metroBubbles.transition().delay(0*transitionTime)
        .attr('r',0);

    commuteBubbles = plot.selectAll('.city-commute-circle');

    commuteBubbles.transition().delay(1*transitionTime)
        .attr('cy',function(d,i){
            //console.log(i);
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

        });//function (d, i) {

           // console.log(nestedCitiesName[1].values[1].transitTypes.totalCommute.overallAverageTime);
            //scaleY(nestedCitiesName[1].values[1].transitTypes.totalCommute.overallAverageTime));

            /*tempAverages = [];

            for (k=0; k<nestedCitiesName.length; k++){
                //console.log(nestedCitiesName.length);
                tempAverages.push(scaleY(nestedCitiesName[1].values[1].transitTypes.totalCommute.overallAverageTime));

            }
            return tempAverages;*/
        //});

    commuteBubbles.transition().delay(1.5*transitionTime).attr('r',0);

//***********Should be able to combine these transitions - assign multiple classes, or figure out how to select multiple classes at once (assign is ('class', 'class1 class2') - Wk 7 Ex3
    popBubbles = plot.selectAll('.city-population-circle');

    popBubbles.transition().delay(1.5*transitionTime).duration(.5*durationTime)
        .attr('r',0);

    commuterPopBubbles = plot.selectAll('.city-commuter-pop');

    commuterPopBubbles.transition().delay(1.5*transitionTime).duration(.5*durationTime)
        .attr('r',0);

    pieCharts.transition().delay(2.5*transitionTime).duration(0*durationTime)
        .attr('d', arcGenerator); //create geometry of path;

    averageLine = plot.selectAll('.average-line');

    averageLine.transition().delay(2.5*transitionTime).duration(.5*durationTime)
        .attr('x1',-49)
        .attr('x2',49);


    var narration = plot.selectAll('.narrate-text');

    narration.transition().delay(2.5*transitionTime).duration(.4*durationTime)
        .text(function(d,i){
            return (narrativeText[6])
        })
        .style('fill', 'darkcyan');



    var transitLabelText = ['Bus', 'Carpool', 'Drove alone', 'Rail or Ferry', 'Streetcar', 'Taxi', 'Walked'];

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

    //commuteBars(nestedCitiesName,timeMetadata,narrativeText,transitMetadata, transitionTime, durationTime)

}


function commuteBars(nestedCitiesName,timeMetadata,narrativeText,transitMetadata, transitionTime, durationTime) {

    var cityTransitTypes = plot.selectAll('.city-transit-types');

    cityTransitBars = cityTransitTypes
        .append('g')
        .attr('class','transit-time-bars')
        .attr('transform', function(d,i){return 'translate('+ ((i * width / 10.5) + width / 10.5) + ',' + 0 + ')'});

    //console.log(nestedCities[1].values[k].transitTypes[transitMetadata[0].transitType].overallAverageTime);

    //write generator function for transitBars rectangles, using the output array of average times for each transit type
    //See wk 9 in class ex 1 for an example of a generator function.

    //append bars to cityTransit group, one for each transit type (connect to generator function to link position and color to data)
    transitBars = cityTransitBars.selectAll('bars')
        .data(function(d,i) {
            //may not need to use lookup table in this way (though it may help with color constancy) - getting the same error with the for loop that returns an array
            //as I got with the direct indexing of nestedCities.
            var localtransitTimes = [];

            for (j=0; j<transitMetadata.length; j++){
                localtransitTimes.push({overallAverage:d.values[1].transitTypes.totalCommute.overallAverageTime, transitAverages:d.values[1].transitTypes[transitMetadata[j].transitType].overallAverageTime});
                //console.log(d.transitTypes[transitMetadata[j].transitType].totalCount/d.transitTypes.totalCommute.totalCount*100);
            }
            //console.log('localCommute '+ [localCommuteData]);
            //console.log(scaleY());
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

    transitBars.transition().delay(.1*transitionTime).duration(.7*durationTime)
        .attr('x',-40)
        .attr('width', 80);

    transitBars.transition().delay(.85*transitionTime).duration(.75*durationTime)
        .attr('y', function(d,i){
            return scaleY(d.transitAverages);
        });

    var transitLabels = plot.selectAll('.transit-labels');

    transitLabels.transition().delay(.9*transitionTime).duration(.5*durationTime)
        .attr('transform',function(d,i){
             return 'translate('+((10.5*width/10.5))+ ',' + scaleY(nestedCitiesName[9].values[1].transitTypes[transitMetadata[i].transitType].overallAverageTime - 1) + ')'
        });


    var narration = plot.selectAll('.narrate-text');

    narration.transition().delay(.1*transitionTime).duration(.4*durationTime)
        .text(function(d,i){
            return (narrativeText[7])
        })
        .style('fill', 'rgb(200,200,200)');


    //a pointless transition on an already-hidden item - this is used only to make sure that reducing the transition time doesn't cut off the duration times for the last few animations
    var endTimer = plot.selectAll('.city-population-circle');

    endTimer.transition().delay(30*transitionTime).duration(1000)
        .attr('r',0);

}







































































function cityMetroBubbles(nestedCitiesName,timeMetadata) {

    plot.selectAll("*").remove();

    var narrativeText = [
        '10 cities with the worst commutes',
        'City population',
        'Average commute time',
        'Number of commuters',
        'Distribution of commute times',
        'Metro area commuters'
    ];

    var narration = plot.append('text')
        .attr('class','narrate-text')
        .text(function(d,i){
            return (narrativeText[0])
        })
        .attr('transform',function(d,i){
            //console.log(timeMetadata[i].timeNumber);
            return 'translate('+width/2+ ',' + scaleY(75) + ')'})
        .attr('text-anchor', 'middle')
        .attr('font-size', '18px')
        .style('fill', 'rgb(215,215,215');

    //create 10 groups bound to the city names
    var popCircles = plot.selectAll('.city-metro-groups')
        .data(nestedCitiesName)
        .enter()
        .append('g')
        .attr('class', 'city-metro-group')
        .attr('transform', function(d,i){
            return 'translate('+ ((i * width / 10) + width / 10) + ',' + 0 + ')'
        });

    //Create groups to put city-specific and metro-specific data in
    cityPopCircles = popCircles
        .append('g')
        .attr('class', 'city-population-group');

    metroPopCircles = popCircles
        .append('g')
        .attr('class', 'metro-population-group');

    cityPopCircles.selectAll('city-population-circles')
        .data(nestedCitiesName) //duplicated DC city data for metro - otherwise, returns an error b/c only one array element!
        .enter();

    cityLabels = cityPopCircles.append('text')
        .text(function (d, i) {
            return d.key;
        })//retrieve city label from rows array, use as text
        //.attr('x', function (d, i) {
        //    return i * width / 10 + width / 10
        //})
        .attr('class', 'label')
        .attr('text-anchor', 'middle')
        .attr('transform',function(d,i){
            //console.log(timeMetadata[i].timeNumber);
            return 'translate('+0+ ',' + scaleY(65) + ')'})
        .attr('font-size', '6px')
        .style('fill', 'rgb(215,215,215)');

    cityLabels.transition().delay(1800).duration(400)
        .attr('transform',function(d,i){
            //console.log(timeMetadata[i].timeNumber);
            return 'translate('+0+ ',' + scaleY(85) + ')'});

    narration.transition().delay(2300).duration(400)
        .text(function(d,i){
            return (narrativeText[1])
        })
        .style('fill', 'green');

    popCircles = cityPopCircles.append('circle')
        .attr('cx', 0) //function (d, i) {return i * width / 10 + width / 10            })
        .attr('cy', height/2+50)
        .attr('r', 0)
        .style('fill', 'green');
    //.attr('transform', function(d,i){return 'translate(' + 0 + ',' + scaleY(d.values[1].transitTypes.totalCommute.overallAverageTime) + ')' });

    popCircles.transition().delay(2500).duration(500)
        .attr('r', function (d, i) {
            return scaleR(d.values[1].population)
        });

    popCircles.transition().delay(3500).duration(400)
        .attr('cy', function (d, i) {
            return scaleY(d.values[1].transitTypes.totalCommute.overallAverageTime)
        });

    averageLine = cityPopCircles.append('line')
        .attr('x1',0)
        .attr('y1', function (d, i) {
            return scaleY(d.values[1].transitTypes.totalCommute.overallAverageTime)
        })
        .attr('x2', 0)
        .attr('y2', function (d, i) {
            return scaleY(d.values[1].transitTypes.totalCommute.overallAverageTime)
        })
        .style('stroke', 'blue')
        .style('stroke-weight', '4px');

    averageLine.transition().delay(4000).duration(400)
        .attr('x1', function (d, i) {
            return (-7-(scaleR(d.values[1].population))); //(i * width / 10 + width / 10) - 7 - (scaleR(d.values[1].population))
        })
        .attr('x2', function (d, i) {
            return (7+  (scaleR(d.values[1].population)));//(i * width / 10 + width / 10) + 7 + (scaleR(d.values[1].population))
        });

    narration.transition().delay(4000).duration(400)
        .text(function(d,i){
            return (narrativeText[2])
        })
        .style('fill', 'blue');

    var axisLabels = plot.selectAll('.axisLabels')
        .data(timeMetadata)
        .enter()
        .append('text')
        .attr('class','axis-labels')
        .text(function(d,i){
            return (timeMetadata[i].timeNumber + ' mins')
        })
        .attr('transform',function(d,i){
            //console.log(timeMetadata[i].timeNumber);
            return 'translate('+0+ ',' + scaleY(timeMetadata[i].timeNumber) + ')'})
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .style('fill', 'white');

    axisLabels.transition().delay(4000).duration(400)
        .style('fill', 'rgb(215,215,215)');


    dashCircle = cityPopCircles.append('circle')
        .attr('class','city-commuter-pop')
        .attr('cx', 0) //function (d, i) {                return i * width / 10 + width / 10            })
        .attr('cy', function (d, i) {
            return scaleY(d.values[1].transitTypes.totalCommute.overallAverageTime);
        })
        .attr('r', 0)
        .style('fill', 'none')
        .style('stroke', 'red')
        .style('stroke-width', '2px')
        .style('stroke-dasharray', '5px 5px');

    dashCircle.transition().delay(5500).duration(400)
        .attr('r',function (d, i) {
            //return (d.transitTypes.totalCommute.timeUnder10 / d.transitTypes.totalCommute.totalCount) * 100;  //returns as percent, not scaled to match population size
            //console.log(d.transitTypes.totalCommute.totalCount);
            return scaleR(d.values[1].transitTypes.totalCommute.totalCount);
        });

    narration.transition().delay(5500).duration(400)
        .text(function(d,i){
            return (narrativeText[3])
        })
        .style('fill', 'red');

    cityCommuteCircles = cityPopCircles
        .append('g')
        .attr('class','city-commute-circles');
    //.attr();  //translate to match scale for population circles!!

    cityCircles = cityCommuteCircles.selectAll('.city-commute-circles')
        .data(function(d,i){
            var localCommuteIntervals = [];

            for (j=0; j<timeMetadata.length; j++){
                localCommuteIntervals.push(d.values[1].transitTypes.totalCommute[timeMetadata[j].timeLabel]);
                //console.log(d.transitTypes[transitMetadata[j].transitType].totalCount/d.transitTypes.totalCommute.totalCount*100);
            }

            return localCommuteIntervals;
        })//nestedDataName gives me 10 circles, one for each city - not what I want here! Need 9 circles, one for each entry in the timeMetadata array
        .enter()
        .append('circle')
        .attr('class','city-commute-circle')
        .attr('cx',0)
        .attr('cy',function (d, i) {
            //console.log(nestedCitiesName[i].values[1].transitTypes.totalCommute.overallAverageTime)
            return scaleY(nestedCitiesName[i].values[1].transitTypes.totalCommute.overallAverageTime);
        })//function (d, i) {
        //for(j=0; j<timeMetadata.length; j++) {
        // console.log(d.values[1].transitTypes.totalCommute[timeMetadata[j].timeLabel]);
        //console.log(d.values[1].transitTypes.totalCommute[timeMetadata[j]]);
        //}
        //d.transitTypes[transitMetadata[j].transitType].totalCount/d.transitTypes.totalCommute.totalCount*100
        // return scaleY([timeMetadata[i].timeNumber]);
        //})
        .attr('r', 0)//function(d,i){return scaleR(d)})
        .style('fill','red');

    cityCircles.transition().delay(7500).duration(800)
        .attr('cy',function (d, i) {
            //for(j=0; j<timeMetadata.length; j++) {
            // console.log(d.values[1].transitTypes.totalCommute[timeMetadata[j].timeLabel]);
            //console.log(d.values[1].transitTypes.totalCommute[timeMetadata[j]]);
            //}
            //d.transitTypes[transitMetadata[j].transitType].totalCount/d.transitTypes.totalCommute.totalCount*100
            return scaleY([timeMetadata[i].timeNumber]);
        })
        .attr('r',function(d,i){return scaleR(d)});

    narration.transition().delay(7500).duration(400)
        .text(function(d,i){
            return (narrativeText[4])
        })
        .attr('transform',function(d,i){
            //console.log(timeMetadata[i].timeNumber);
            return 'translate('+width/2+ ',' + scaleY(75) + ')'})
        .style('fill', 'red');

    metroCommuteCircles = metroPopCircles
        .append('g')
        .attr('class','metro-commute-circles');

    metroCircles = metroCommuteCircles.selectAll('.metro-commute-circles')
        .data(function(d,i){
            var localCommuteIntervals = [];

            for (j=0; j<timeMetadata.length; j++){
                localCommuteIntervals.push(d.values[0].transitTypes.totalCommute[timeMetadata[j].timeLabel]);
                //console.log(d.transitTypes[transitMetadata[j].transitType].totalCount/d.transitTypes.totalCommute.totalCount*100);
            }

            return localCommuteIntervals;
        })//nestedDataName gives me 10 circles, one for each city - not what I want here! Need 9 circles, one for each entry in the timeMetadata array
        .enter()
        .append('circle')
        .attr('class','city-commute-circle')
        .attr('cx',0)
        .attr('cy',function (d, i) {
            //for(j=0; j<timeMetadata.length; j++) {
            // console.log(d.values[1].transitTypes.totalCommute[timeMetadata[j].timeLabel]);
            //console.log(d.values[1].transitTypes.totalCommute[timeMetadata[j]]);
            //}
            //d.transitTypes[transitMetadata[j].transitType].totalCount/d.transitTypes.totalCommute.totalCount*100
            return scaleY([timeMetadata[i].timeNumber]);
        })
        .attr('r',0)
        .style('fill','none')
        .style('stroke', 'purple');

    metroCircles.transition().delay(11000).duration(400)
        .attr('r',function(d,i){return scaleR(d)});

    narration.transition().delay(11000).duration(400)
        .text(function(d,i){
            return (narrativeText[5])
        })
        .style('fill', 'purple');

}



function multiplePies(nestedCitiesName, transitMetadata, timeMetadata) {
    //plot.selectAll("*").remove();

    //Based on In-Class 9-Ex 2
    var percentPieData = [];

    //Layout function - creates angles needed to create pie charts using data
    var pieLayout = d3.layout.pie();   //need to tell it which dataset to use

    var arcGenerator = d3.svg.arc()
        //.startAngle()  //already stored in data w/ correct name by pieLayout function.
        //.endAngle()
        .innerRadius(0)
        .outerRadius(35);

    var axisLabels = plot.selectAll('.axisLabels')
        .data(timeMetadata)
        .enter()
        .append('text')
        .attr('class','axis-labels')
        .text(function(d,i){
            return (timeMetadata[i].timeNumber + ' mins')
        })
        .attr('transform',function(d,i){
            //console.log(timeMetadata[i].timeNumber);
            return 'translate('+0+ ',' + scaleY(timeMetadata[i].timeNumber) + ')'})
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .style('fill', 'rgb(215,215,215)');

    var cityTransitTypes = plot.selectAll('.transit-types')
        .data(function(d,i){
            //console.log(nestedCitiesName[i].values[1]);
            return nestedCitiesName})
        .enter()
        .append('g')
        .attr('class', 'city-transit-types');
    //.attr('transform', function(d,i){return 'translate(' + ((i * width / 10) + width / 10) + ',' + height / 2 + ')'});

    cityTransitTypes
        .append('text')
        .text(function(d,i){
            //console.log(d.values);
            return d.key}) //.attr('r', function(d,i){return scaleR(nestedCities[1].values[i].population)})
        .attr('class', 'label')
        .attr('text-anchor', 'middle')
        .attr('font-size', '6px')
        .style('fill', 'rgb(215,215,215)')
//********Fix height to match other function!!!
        .attr('transform', function(d,i){return 'translate('+ ((i * width / 10) + width / 10) + ',' + height / 15 + ')'});


    cityTransitTypes.append('line')
        .attr('x1',function(d,i){return ((i * width / 10) + width / 10)-47})
        .attr('y1',function(d,i){return scaleY(d.values[1].transitTypes.totalCommute.overallAverageTime)})
        .attr('x2',function(d,i){return ((i * width / 10) + width / 10)+47})
        .attr('y2',function(d,i){return scaleY(d.values[1].transitTypes.totalCommute.overallAverageTime)})
        .style('stroke','blue')
        .style('stroke-weight','4px');

    //create a pie chart for each bound data object, using the transitTypes attribute (show percent bus, carpool, drive, etc)
    cityPies = cityTransitTypes
        .append('g')
        .attr('class','transit-pie-chart')
        .attr('transform', function(d,i){return 'translate(' + ((i * width / 10) + width / 10) + ',' + scaleY(d.values[1].transitTypes.totalCommute.overallAverageTime) + ')' });


    cityPies.selectAll('.transit-pie-chart')//.append('g')
        .data(function(d,i) {
            //may not need to use lookup table in this way (though it may help with color constancy) - getting the same error with the for loop that returns an array
            //as I got with the direct indexing of nestedCities.
            var localCommuteData = [];

            for (j=0; j<transitMetadata.length; j++){
                //console.log(d.values[1].transitTypes.totalCommute.totalCount);
                localCommuteData.push(d.values[1].transitTypes[transitMetadata[j].transitType].totalCount/d.values[1].transitTypes.totalCommute.totalCount*100);
                //console.log(d.transitTypes[transitMetadata[j].transitType].totalCount/d.transitTypes.totalCommute.totalCount*100);
            }
            //console.log('localCommute '+ [localCommuteData]);
            //console.log(pieLayout(localCommuteData));
            return pieLayout(localCommuteData);
        })
        .enter()
        .append('path')
        .attr('class', 'slice')
        .attr('d', arcGenerator) //create geometry of path
        .style('fill', function (d, i) {
            return scalePieColor(i);
        });



    cityTransitBars = cityTransitTypes
        .append('g')
        .attr('class','transit-time-bars')
        .attr('transform', function(d,i){return 'translate('+ ((i * width / 10) + width / 10) + ',' + 0 + ')'});

    //console.log(nestedCities[1].values[k].transitTypes[transitMetadata[0].transitType].overallAverageTime);

    //write generator function for transitBars rectangles, using the output array of average times for each transit type
    //See wk 9 in class ex 1 for an example of a generator function.

    //append bars to cityTransit group, one for each transit type (connect to generator function to link position and color to data)
    transitBars = cityTransitBars.selectAll('bars')
        .data(function(d,i) {
            //may not need to use lookup table in this way (though it may help with color constancy) - getting the same error with the for loop that returns an array
            //as I got with the direct indexing of nestedCities.
            var localtransitTimes = [];

            for (j=0; j<transitMetadata.length; j++){
                localtransitTimes.push({overallAverage:d.values[1].transitTypes.totalCommute.overallAverageTime, transitAverages:d.values[1].transitTypes[transitMetadata[j].transitType].overallAverageTime});
                //console.log(d.transitTypes[transitMetadata[j].transitType].totalCount/d.transitTypes.totalCommute.totalCount*100);
            }
            //console.log('localCommute '+ [localCommuteData]);
            //console.log(scaleY());
            return localtransitTimes;
        })
        .enter()
        .append('rect')
        .attr('class','bar')
        .attr('x', 1) //use negative of 1/2 bar width to center in containing group
        .attr('y', function(d,i){
            //console.log(nestedCitiesName[i].values[1]);
//**********Grabbing the wrong values - bound to an extracted array, so no way to get index for nested array to read overallAverageTime directly - bind differently?
            console.log(d.overallAverage);
            return scaleY(d.overallAverage)-1.5;//nestedCitiesName[i].values[1].transitTypes.totalCommute.overallAverageTime)
        })
        .attr('width',0)
        .attr('height',3)
        .style('fill', function(d,i){
            //checked color order - coming out in order for Detroit
            return scalePieColor(i)
        });

    transitBars.transition().delay(500).duration(500)
        .attr('x',-40)
        .attr('width', 80);

    transitBars.transition().delay(1000).duration(2000)
        .attr('y', function(d,i){
            return scaleY(d.transitAverages);
        });

    transitLabelText = ['Bus', 'Carpool', 'Drove alone', 'Rail or Ferry', 'Streetcar', 'Taxi', 'Walked'];

    var transitLabels = plot.selectAll('.transitLabels')
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
            return 'translate('+((10*width/10)+45)+ ',' + scaleY(nestedCitiesName[9].values[1].transitTypes[transitMetadata[i].transitType].overallAverageTime - 1) + ')'})
        .attr('font-size', '14px')
        .style('fill', function(d,i){
            return scalePieColor(i)
        });

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



//appends pie charts inside the square-graph group, using the time interval data for the total commute (wrong data! want to use transitTypes data)
/*squares.selectAll('.square-graph')//.append('g')
 //.attr('test-Pie')
 .data(function(d,i) {
 //likely don't need to use lookup table in this way (though it may help with color constancy) - getting the same error with the for loop that returns an array
 //as I got with the direct indexing of nestedCities.
 var localCommuteData = [];
 for (j=0; j<timeMetadata.length; j++){
 localCommuteData.push(d.transitTypes.totalCommute[timeMetadata[j].timeLabel]/d.transitTypes.totalCommute.totalCount);
 //console.log(d.transitTypes.totalCommute[timeMetadata[j].timeLabel]);

 }
 console.log('localCommute '+ [localCommuteData]);
 console.log(pieLayout([localCommuteData]));
 return pieLayout(localCommuteData);
 } /*
 function(d,i) {
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
 });*/




/////Old MultiplePies function!!
/*plot.selectAll("*").remove();

//Nest data array to create separate arrays for cities and metro areas. Use type attribute to sort.
var nestedCities = d3.nest()
    .key(function (d) {
        return d.type
    })
    .entries(cityData.data);
//console.log(nestedCities);


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
        (nestedCities[1].values[k].transitTypes[transitMetadata[6].transitType].totalCount / nestedCities[1].values[k].transitTypes.totalCommute.totalCount) * 100
    ];
    console.log(pieData);

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

    //console.log(nestedCities[1].values[k].transitTypes[transitMetadata[0].transitType].overallAverageTime);

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

/*
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
     //Set the pie chart values from the geoJSON data by compiling total,
 commuteTime.set(d.geoid, {time:+d.time30to34, name: d.name});
 console.log(commuteTime);

//Based on In-Class 9-Ex 2

//Layout function - creates angles needed to create pie charts using data
var pieLayout = d3.layout.pie();   //need to tell it which dataset to use
// function(d){return d.total})  //here, use total attribute to populate pie chart.
/*.sort(function(a,b){
 return b.activity1 - a.activity1;  //compare activity1 columns (comparing two strings) sort by value
 })

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
pieChart.append('circle')
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
 });
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

        var map = d3.select('.canvas')
     .append('svg')
     .attr('width',width+margin.r+margin.l)
     .attr('height',height + margin.t + margin.b)
     .append('g')
     .attr('class','map')
     .attr('transform','translate('+margin.l+','+margin.t+')');


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

     d3.select('.map')
     .append('g')
     .attr('class','neighborhoods')
     .append('path')
     .datum(neighborhoods)
     .attr('class','neighborhoods')
     .attr('d', pathGenerator)
     .style('stroke-width','2px')
     .style('fill','none')
     .style('stroke','gray');


}
*/

//.attr();  //translate to match scale for population circles!!
/*     cityTransitBars.selectAll('bars')
 .data(function(d,i) {
 //may not need to use lookup table in this way (though it may help with color constancy) - getting the same error with the for loop that returns an array
 //as I got with the direct indexing of nestedCities.
 var localtransitTimes = [];

 for (j=0; j<transitMetadata.length; j++){
 localtransitTimes.push(d.transitTypes[transitMetadata[j].transitType].overallAverageTime);
 //console.log(d.transitTypes[transitMetadata[j].transitType].totalCount/d.transitTypes.totalCommute.totalCount*100);
 }
 //console.log('localCommute '+ [localCommuteData]);
 //console.log(scaleY());
 return localtransitTimes;
 })
 .enter()
 .append('rect')
 .attr('class','bar')
 .attr('x', -40) //use negative of 1/2 bar width to center in containing group
 .attr('y', function(d,i){
 return scaleY(d);
 })
 .attr('width',80)
 .attr('height',3)
 .style('fill', function(d,i){
 //checked color order - coming out in order for Detroit
 return scalePieColor(i)
 });


 cityCommuteCircles.selectAll('.city-commute-circles')

 .data(nestedCitiesName)
 .enter()
 .append('circle')
 .attr('class','city-commute-circle')
 .attr('cx',function (d, i) {
 return i * width / 10 + width / 10
 })
 .attr('cy',function (d, i) {
 for(j=0; j<timeMetadata.length; j++) {
 console.log(d.values[1].transitTypes.totalCommute[timeMetadata[j].timeLabel]);
 //console.log(d.values[1].transitTypes.totalCommute[timeMetadata[j]]);
 }
 //d.transitTypes[transitMetadata[j].transitType].totalCount/d.transitTypes.totalCommute.totalCount*100
 return scaleY(d.values[1].transitTypes.totalCommute[timeMetadata[j].timeLabel]);
 })
 .attr('r',50)
 .style('fill','red');




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
 */
/*
//temporary function to hold working pie chart example with nested and multiply-bound data - delete once integrated!!
function tempPies (cityData,transitMetadata) {


    //Nest data array to create separate arrays for cities and metro areas. Use type attribute to sort.
    var nestedCities = d3.nest()
        .key(function (d) {
            return d.type
        })
        .entries(cityData.data);
    console.log(nestedCities[1].values);

    var cities = plot.selectAll('.cities')
        .data(nestedCities[1].values) //cannot bind to a number - needs to be an array!
        .enter()
        .append('g')
        .attr('class', 'city-group');

    //console.log(nestedCities[1].values[i].population);

    circles = cities.selectAll('city-group')
        .data(nestedCities[1].values)
        .enter()
        .append('circle')
        .attr('cx', function(d,i) {return 90*i})
        .attr('cy', 10)
        .attr('r', function(d,i){return scaleR(nestedCities[1].values[i].population)})
        .style('fill', 'black');

    var testIndex = [0, 1, 2, 3, 4, 5];
    console.log('testIndex '+testIndex);
    //console.log([nestedCities[1].values[0]]); //  .transitTypes[transitMetadata[0].transitType].totalCount
    var squares = plot.selectAll('.squares')
        .data(nestedCities[1].values)//[0].transitTypes[transitMetadata[0].transitType].totalCount])
        .enter()
        .append('g')
        .attr('class', 'square-graph')
        .attr('transform', function(d,i){ return 'translate('+ 90*i + ',' + 150 + ')'});  //translate the group, then indiv items relative to the group (group position will set pie chart position later)

    squares.append('rect')
        .attr('x', 0) //.attr('x', function(d,i) {return 90*i})
        .attr('y', 200)
        .attr('width', 10)
        .attr('height',100)
        .style('fill', 'red');

    squares.append('text')
        .text(function(d,i) {return d.name}) //nestedCities[1].values[i]
        .attr('class', 'label')
        .attr('text-anchor', 'middle')
        .attr('font-size', '6px')
        .style('fill', 'rgb(215,215,215)')
        .attr('transform', function(d,i){ return 'translate('+ 0 + ',' + 100 + ')'});



    //Layout function - creates angles needed to create pie charts using data
    var pieLayout = d3.layout.pie();   //need to tell it which dataset to use

    var arcGenerator = d3.svg.arc()
        //.startAngle()  //already stored in data w/ correct name by pieLayout function.
        //.endAngle()
        .innerRadius(0)
        .outerRadius(35);

    //console.log(timeMetadata[0].timeLabel, timeMetadata[1].timeLabel,timeMetadata[2].timeLabel,timeMetadata[3].timeLabel,timeMetadata[4].timeLabel,timeMetadata[5].timeLabel,timeMetadata[6].timeLabel,timeMetadata[7].timeLabel,timeMetadata[8].timeLabel);
    //console.log(timeMetadata.timeLabel);

    //create a pie chart for each bound data object, using the transitTypes attribute (show percent bus, carpool, drive, etc)
    squares.selectAll('.square-graph')//.append('g')
        //.attr('test-Pie')
        .data(function(d,i) {
            //may not need to use lookup table in this way (though it may help with color constancy) - getting the same error with the for loop that returns an array
            //as I got with the direct indexing of nestedCities.
            var localCommuteData = [];

            for (j=0; j<transitMetadata.length; j++){
                localCommuteData.push(d.transitTypes[transitMetadata[j].transitType].totalCount/d.transitTypes.totalCommute.totalCount*100);
                //console.log(d.transitTypes[transitMetadata[j].transitType].totalCount/d.transitTypes.totalCommute.totalCount*100);
            }
            //console.log('localCommute '+ [localCommuteData]);
            //console.log(pieLayout(localCommuteData));
            return pieLayout(localCommuteData);
        })
        .enter()
        .append('path')
        .attr('class', 'slice')
        .attr('d', arcGenerator) //create geometry of path
        .style('fill', function (d, i) {
//****************Switch to lookup table to link to color explicitly?? (Need to figure out how to do this for each wedge in the pie chart; scale allows whole pie chart at once
            //Possibly not necessary to change; as long as ordinal scale has enough entries, should be ok.
            return scalePieColor(i);
        });

}
*/

/*Old metrobubbles
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
/*
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
/*
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

 */


/*

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
 console.log(testKey);

// var timeRanges = [0, 10,15,20,25,30,35,45,60]; //use beginning of each time interval to set circle y position]

//Plot city circles based on population size
var cities = plot.selectAll('.cities')
    .data(cityData.data)
    .enter()
    .append('g')
    .attr('class', 'city');

plot.selectAll('.city')
 .append('circle')
 .attr('cx', function(d,i){return 100*i*Math.random()})
 .attr('cy', function(d,i){return 100*i*Math.random()})
 .attr('r', 5)
 .style('fill', 'green');

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
 .attr('class', 'commuteBubbles');

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
 .attr('class', 'commuteBubbles');

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

plot.selectAll('city')
 .data(function(d,i){
 console.log(cityData.data[i].transitTypes.totalCommute);
 return cityData.data[i].transitTypes.totalCommute;
 })
 .enter()
 .append('circle')
 .attr('cx', width/2)  //in final version, change this to be the calculated position of the city
 .attr('cy', function(d,i){return 10*i})
 .attr('r',5);

//console.log(cityData["data"]);
}

 */


/*
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

 testCircle.transition()
 .delay(500)
 .attr('r',0);

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

gradient.append("svg:stop")
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

 */


/*
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

    */

/*
 //Nest data array to create separate arrays for cities and metro areas. Use type attribute to sort.
 var nestedCities = d3.nest()
 .key(function (d) {
 return d.type
 })
 .entries(cityData.data);
 //console.log(nestedCities);
 */