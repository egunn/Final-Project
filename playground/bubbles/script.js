/*Start by setting up the canvas */
var margin = {t:50,r:50,b:50,l:50};
var width = document.getElementById('plot').clientWidth - margin.r - margin.l,
    height = document.getElementById('plot').clientHeight - margin.t - margin.b;	

plot = d3.select('.canvas')
	.append('svg')
   	.attr('width',width+margin.r+margin.l)
    	.attr('height',height + margin.t + margin.b)
	.append('g')
	.attr('class','canvas')
	.attr('transform', 'translate('+margin.l+','+margin.t+')');

var startbubbles = [];
var endbubbles = [];

for (i=0; i<150; i++){
	newbubble = {x:width*Math.random(),y:height+100,r:20*Math.random()+5,color:'blue'};
	anothernewbubble = {x:newbubble.x,y:-100,r:20*Math.random()+5,color:'rgb(200,200,255)'};
	startbubbles.push(newbubble);
	endbubbles.push(anothernewbubble);
}
	console.log(startbubbles);
	console.log(endbubbles);


draw(startbubbles);
draw(endbubbles);


function draw(dataArray) {
	bubblegroup = plot.selectAll('.bubble')
		.data(dataArray);

	bubblegroup.enter()
		.append('circle')
		.attr('class', 'bubble')
		.attr('cx', function (d) {
			return d.x;
		})
		.attr('cy', function (d) {
			return d.y;
		})
		.attr('r', function (d) {
			return d.r;
		})
		.style('fill', function (d) {
			return d.color;
		});

	bubblegroup.exit()
		.remove();

	bubblegroup
		.transition()
		.delay(function (d, i) {
			return i * 100;
		})
		.duration(5000)
		.attr('cx', function (d) {return d.x;})
		.attr('cy', function (d) {return d.y;})
		.attr('r', function (d) {return d.r;})
		.style('fill', function (d) {return d.color;});

}



