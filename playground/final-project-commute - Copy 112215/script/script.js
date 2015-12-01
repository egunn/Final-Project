/*Start by setting up the canvas */
var margin = {t:50,r:100,b:50,l:50};
var width = document.getElementById('plot').clientWidth - margin.r - margin.l,
    height = document.getElementById('plot').clientHeight - margin.t - margin.b;

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
    .tickSize(-height)
    .tickValues([10000,50000,100000]);
var axisY = d3.svg.axis()
    .orient('left')
    .tickSize(-width)
    .tickValues([0,25,50,75,100]);

//Set up d3.map to store a map of commute times for a given city
var commuteTime = d3.map();

queue()
    .defer(d3.json, "data/acs2013_5yr_B08303_14000US25025090600.geojson")
    .defer(d3.csv, "data/bosMetrobyCity_acs2013_5yr_B08303_14000US25025090600_csv.csv", parse)
    //.defer(d3.csv, "data/commute_14Age.csv", parse)
    //await saves the output of file 1 and file 2, in the order run (bostonMap should be geoJSON, csvData should be parsed csv.
    .await( function(err, bostonMap, csvData){
        //console.log(commuteTime);

        //returns the contents of the "total" column in the Excel sheet, but only for one object at a time.
        //console.log(bostonMap.features[0].properties['B08303001 - Total:']);

        //csvData is an array of 312 objects, each with geoid, name, and time values for each commute length interval in the dataset.
        //The data from individual objects can be accessed using:
        // console.log(csvData[i].geoid);
        //console.log(csvData.geoid); returns undefined (contrast with use in parse function below...because parse goes
        // through the dataset row by row)

        d3.selectAll('.btn').on('click', function() {

            var mode = d3.select(this).attr('id');
            console.log(mode);
            if (mode == 'btn-1') {
                displayMap(bostonMap);
            }
            else if (mode == 'btn-2') {
                pieChart(csvData);
            }

            else {
                console.log('broken');
            }
        })
    });


/*queue()
    .defer(d3.csv,'data/commute_14Age.csv',parse)
    //.defer(d3.csv,'data/metadata.csv',parseMetadata)
    .await(dataLoaded);

//Layout function
//receives data object - how do we get the data we need from this structure? Parent --> children, how to calculate box sizes
//writes several new attributes, including x,y,dx,dy,and key, hierarchy level, children/parent attributes,
var partition = d3.layout.partition()
    .size([width,height])  //how big should the overall (envelope) rectangle be? [horiz,vertical]
    .children(function(d){
        //given the hierarchy, how do we go down a tree level?
        return d.values;
    })
    .value(function(d){
        //calculate size of indiv slices
        //adds up all values for each level, then calcs value for levels above
        return d.total;
    });

//Generators?
//take data attribute, create start/end angle, inner/outer radius
var arcGenerator = d3.svg.arc()
    //x position from rectangular partition diagram (zeros map, 360 circle mmaps to full width rect)
    .startAngle(function(d){return scaleAngle(d.x)})
    .endAngle(function(d){return scaleAngle(d.x+ d.dx)})
    .innerRadius(function(d){return scaleR(d.y)})
    .outerRadius(function(d){return scaleR(d.y+ d.dy)});
*/



function dataLoaded(err,geoData,pieData){

    console.log(commuteTime);
    console.log('do you hear me??');

}


var percentPieData = [];

function pieChart(csvData) {

    //**********************need to figure out how to clear the screen!! (Enter exit update pattern??)******************

    //choose just one city (Boston, element 189 in the csvData) for now
    console.log(csvData[189].name);

    pieData = [csvData[189].total, csvData[189].timeunder5, csvData[189].time5to9, csvData[189].time10to14, csvData[189].time15to19,
        csvData[189].time20to24, csvData[189].time25to29, csvData[189].time30to34, csvData[189].time35to39, csvData[189].time40to44,
        csvData[189].time45to49,csvData[189].time60to89,csvData[189].timeover90];

    console.log(pieData[0]/csvData[189].total*100);

    pieData.forEach(function(d,i){
        percentPieData.push(pieData[i]/csvData[189].total*100)
    });
        //console.log(pieData[index])
        //percentPieData = percentPieData.push(percent);
    //);

    console.log(pieData);
    console.log(percentPieData);
/*    //Set the pie chart values from the geoJSON data by compiling total,
    commuteTime.set(d.geoid, {time:+d.time30to34, name: d.name});
    console.log(commuteTime);
*/
      //Based on In-Class 9-Ex 2

//Layout function - creates angles needed to create pie charts using data
    var pieLayout = d3.layout.pie(csvData)   //need to tell it which dataset to use
        .value(function(d){return d.total})  //here, use total attribute to populate pie chart.
        .sort(function(a,b){
            return b.activity1 - a.activity1;  //compare activity1 columns (comparing two strings) sort by value
        });

    /*
    var arcGenerator = d3.svg.arc()
        //.startAngle()  //already stored in data w/ correct name by pieLayout function.
        //.endAngle()
        .innerRadius(100)
        .outerRadius(function(d){
            return (d.data.men/ d.data.women *100+100);
        });


    //use enter exit update to create pie slices for ea element in the array
    var pieChart = plot
        .append('g')
        .attr('class','pie-chart')
        .attr('transform','translate('+width/2+','+height/2+')');
    pieChart
        .selectAll('.slice')      //0 on first run, 46 thereafter (b/c ea path has class slice, defined below)
        .data(pieLayout(data))    //46 entries
        .enter()
        .append('path')
        .attr('class', 'slice')
        .attr('d', arcGenerator) //create geometry of path
        .style('fill', function(d){

            //console.log(d);  Note that data is in a subobject called .data!!

            var classification = metadata.get(d.data.activity1); //returns (string) between 1-4

            return scaleColor(classification);
        });
    pieChart.append('circle')
        .attr('r', 200)
        .style('fill','none')
        .style('stroke','black')
        .style('stroke-dasharray','5px 5px')
        .style('stroke-width','1px');

    pieChart.selectAll('text')
        .data(pieLayout(data))
        .enter()
        .append('text')
        .text(function(d){return d.data.activity2})
        .attr('transform', function(d){
            var angle = ((d.startAngle+ d.endAngle)/2)/(2*Math.PI)*360-90;  //for SVG, needs to be in degrees not radians!
            //90 because text defines angle differntely
            return 'rotate('+angle+')'+'translate(250,0)'; //translate command inherits the x axis of the original item (self-referential)

            //'rotate(a) translate(xy)'
        });

    //Scales - create color scale based on activity classification
    var scaleColor = d3.scale.ordinal().domain([1,2,3,4]).range(['blue','orange','green','red']); //ordinal scale does 1:1 lookup
    //need same # of items in domain and range.

    //gradient from blue to red linear().domain([1,4]).range(['blue','red']);
*/

}

function displayMap(geoData){
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

function parseMetadata(d){
}