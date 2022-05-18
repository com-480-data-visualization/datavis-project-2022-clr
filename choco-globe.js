const initialDraggingSpeed = 0.3;
var draggingSpeed = initialDraggingSpeed;

const width = 960;
const height = 500;
const center = [width / 2, height / 2]

const radius = 300;
const arcHeight = 80;

function createGraticule(elem, path, divisions = 10) {
    // Graticule only has to be created once
    const graticule = d3.geoGraticule().step([divisions, divisions]);

    elem.append("path")
        .datum(graticule)
        .attr("class", "graticule")
        .attr("d", path)
        .style("fill", "#fff")
        .style("stroke", "#ccc");
}

function createCountries(elem, path, worldData) {
    const countryData = topojson.feature(worldData, worldData.objects.countries).features

    elem.selectAll(".country")
        .data(countryData)
        .enter().append("path")
        .attr("class", "country")
        .attr("d", path);
}

function drawCard(elem, card) {
    elem.selectAll("*").remove();
    elem.append('h5').attr("class", 'card-title text-black').text(d => "Company: " + d.company_names);

    elem.append('p').attr("class", 'card-text').attr("id", 'cardtext').text(d => "Bean origin: " + d.country_bean_origin);
    elem.append('p').attr("class", 'card-text').attr("id", 'cardtext').text(d => "Cocoa percentage: " + d.cocoa_percent);
    elem.append('p').attr("class", 'card-text').attr("id", 'cardtext').text(d => "Specific Bean name: " + d.specific_bean_origin);
    elem.append('p').attr("class", 'card-text').attr("id", 'cardtext').text(d => "Reviewed in: " + d.review_date);
    elem.append('p').attr("class", 'card-text').attr("id", 'cardtext').text(d => "Rating: " + d.rating);
}

function flyingArc(link, projection, skyProjection) {
    function locationOnArc(start, end, loc) {
        var interpolator = d3.geoInterpolate(start, end);
        return interpolator(loc)
    }

    var source = [link.longitude, link.latitude],
        target = [link.longitude_beans, link.latitude_beans];

    var mid1 = locationOnArc(source, target, .333);
    var mid2 = locationOnArc(source, target, .667);
    var result = [projection(source),
        skyProjection(mid1),
        skyProjection(mid2),
        projection(target)
    ]

    return result;
}

function fadeAtEdge(link, projection) {
    var centerPos = projection.invert(center);

    var source = [link.longitude, link.latitude],
        target = [link.longitude_beans, link.latitude_beans];

    var start_dist = 1.57 - d3.geoDistance(source, centerPos),
        end_dist = 1.57 - d3.geoDistance(target, centerPos);

    var fade = d3.scaleLinear().domain([-.1, 0]).range([0, .1])
    var dist = start_dist < end_dist ? start_dist : end_dist;

    return fade(dist)
}


class GlobeDrawer {
    constructor(elem, labelElem, countryData, chocoData, beanData, linkData) {
        this.elem = elem;
        this.labelElem = labelElem;

        this.chocoData = chocoData;
        this.beanData = beanData;
        this.linkData = linkData;

        this.projection = d3.geoOrthographic().scale(radius);
        this.skyProjection = d3.geoOrthographic().scale(radius + arcHeight);

        this.path = d3.geoPath().projection(this.projection);

        this.elem.append("circle")
            .attr("cx", center[0])
            .attr("cy", center[1])
            .attr("r", this.projection.scale())
            .attr("class", "globe-background");

        createGraticule(this.elem, this.path);
        createCountries(this.elem, this.path, countryData);

        this.chocoMarkerGroup = elem.append('g');
        this.beansMarkerGroup = elem.append('g');
        this.arcsGroup = elem.append('g');

        this.enableRotation();
        this.enableZoom();

        this.swoosh = d3.line()
            .x(function(d) { return d[0] })
            .y(function(d) { return d[1] })
            .curve(d3.curveBasis);

        this.elem.on("click", _ => {
            this.selectedLocation = null;
            this.drawCards([]);
            this.draw();
        });
    }

    draw() {
        this.elem.selectAll("path").attr("d", this.path);
        this.drawMarkers(this.chocoMarkerGroup, this.chocoData, "steelblue");
        this.drawMarkers(this.beansMarkerGroup, this.beanData, "chocolate");
        this.drawArcs(this.selectedLocation);
    }

    drawMarkers(group, dataset, fill) {
        // Keep only points on this side of the sphere
        dataset = dataset.filter(d => {
            const coordinate = [d.longitude, d.latitude];
            // Points on the other side of the sphere have a distance of > pi / 2 from the center.
            const arc_distance = d3.geoDistance(coordinate, this.projection.invert(center));
            return arc_distance <= 1.57;
        })

        group.selectAll("circle")
            .data(dataset)
            .join("circle")
            .attr("cx", d => this.projection([d.longitude, d.latitude])[0])
            .attr('cy', d => this.projection([d.longitude, d.latitude])[1])
            .attr("fill", fill)
            .attr("r", d => 3 + d.location_count / 20)
            .on("click", (event, d) => {
                event.stopPropagation();

                this.selectedLocation = d;
                this.drawCards(d.card);
                this.draw();
            })
            .on("mouseover", function() {
                d3.select(this).attr("fill", "orange");
            })
            .on("mouseout", function() {
                d3.select(this).attr("fill", fill);
            })
            .style("opacity", 0.5);

        var textData = this.selectedLocation ? [this.selectedLocation] : [];
        const offset = 10;
        this.elem.selectAll("text")
            .data(textData)
            .join("text")
            .attr("x", d => this.projection([d.longitude, d.latitude])[0] + offset)
            .attr('y', d => this.projection([d.longitude, d.latitude])[1] - offset)
            .text(d => d.location_name);
    }

    drawCards(cards) {
        console.log(cards);
        this.labelElem.selectAll("div")
            .data(cards)
            .join("div")
            .attr("class", "card")
            .call(drawCard);
    }

    drawArcs(selectedLocation = null) {
        var dataset = this.linkData;
        if (selectedLocation != null) {
            dataset = dataset.filter(d => (d.company_location_name || d.bean_location_name) == selectedLocation.location_name);
        }
        this.arcsGroup.selectAll("path")
            .data(dataset)
            .join("path")
            .attr("class", "arc")
            .attr("d", d => {
                return this.swoosh(flyingArc(d, this.projection, this.skyProjection));
            })
            .style("stroke-width", d => d.link_count / 10)
            .style("opacity", d => {
                return fadeAtEdge(d, this.projection);
            });
    }

    enableRotation() {
        var curRotX = 0;
        var curRotY = 0;

        const drag = d3.drag().on("drag", event => {
            curRotX += event.dx * draggingSpeed;
            curRotY += event.dy * draggingSpeed;
            curRotY = Math.max(-90, Math.min(90, curRotY));
            this.projection.rotate([curRotX, -curRotY, 0]);
            this.skyProjection.rotate([curRotX, -curRotY, 0]);
            this.draw()
        });
        this.elem.call(drag);
    }

    enableZoom() {
        const scaleExtent = [1, 8];
        const zoom = d3.zoom().scaleExtent(scaleExtent).on("zoom", event => {
            draggingSpeed = initialDraggingSpeed / event.transform.k;
            this.projection.scale(radius * event.transform.k);
            this.skyProjection.scale((radius + arcHeight) * event.transform.k);

            this.elem.select("circle").attr("r", this.projection.scale());
            this.draw();
        })
        this.elem.call(zoom);
    }

}


const svg = d3.select('#globe').attr("viewBox", `0 -70 ${width} ${height+150}`);
const cards = d3.select('#cards');

Promise.all([
    d3.json('https://gist.githubusercontent.com/mbostock/4090846/raw/d534aba169207548a8a3d670c9c2cc719ff05c47/world-110m.json'),
    d3.json('preprocessing/jsons/aggregated_dataset.json'),
    d3.json('preprocessing/jsons/bean_dataset.json'),
    d3.json('preprocessing/jsons/link_dataset.json'),
]).then(([worldData, chocolateData, beanData, linkData]) => {
    var drawer = new GlobeDrawer(svg, cards, worldData, chocolateData, beanData, linkData);
    drawer.draw();
});