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

function createCountries(elem, path, worldData, ratingsMap, colorInterp) {
    const countryData = topojson.feature(worldData, worldData.objects.countries).features

    const ratingScore = (d) => {
        if (!ratingsMap.has(d.properties.name)) {
            return "white";
        }
        return colorInterp(ratingsMap.get(d.properties.name));
    }

    elem.selectAll(".country")
        .remove();

    elem.selectAll(".country")
        .data(countryData)
        .enter().append("path")
        .attr("class", "country")
        .attr("d", path)
        .style("fill", d => ratingScore(d));
}

function drawCard(elem, card) {
    elem.html(d => `
		<h5 class="card-title text-black">Company: ${d.company_names}</h5>
		<p class="card-text">Bean used: <b>${d.specific_bean_origin.split(", batch")[0]}</b> from <b>${d.country_bean_origin}</b></p>
		<p class="card-text">Cocoa percentage: <b>${d.cocoa_percent}</b></p>
		<p class="card-text">Rating: <b>${d.rating}</b> (Reviewed in: ${d.review_date})</p>
		`);
}

function drawBeansCard(elem, card) {
    elem.html(d => `
		<h5 class="card-title text-blackj>Manufacturer: ${d.company_names}</h5>
		<p class="card-text">Located in: <b>${d.company_location}</b></p>
		<p class="card-text">Cocoa percentage: <b>${d.cocoa_percent}</b></p>
		<p class="card-text">Rating: <b>${d.rating}</b> (Reviewed in: ${d.review_date})</p>
		`);
}

function flyingArc(link, projection, skyProjection) {
    function locationOnArc(start, end, loc) {
        var interpolator = d3.geoInterpolate(start, end);
        return interpolator(loc)
    }

    var source = [link.longitude + 0.5, link.latitude],
        target = [link.longitude_beans - 0.5, link.latitude_beans];

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

    return fade(dist);
}

function createRatingMap(chocoData) {
    var ret = new Map(chocoData.map(d => [d.location_name, d.rating_mean]));
    // Manually fix naming inconsistencies
    ret.set("United States of America", ret.get("U.S.A."));
    ret.set("United Kingdom", ret.get("U.K."));
    ret.set("Czechia", ret.get("Czech Republic"));
    return ret;
}

function createLegend(elem, countryGroup, path, countryData, chocoRatingsMap, beansRatingsMap, colorInterp) {
    var group = elem.append("g");

    var xPos = width - 110;
    var yPos = -50;

    // background
    group.append("rect")
        .attr("x", xPos)
        .attr("y", yPos)
        .attr("width", 100)
        .attr("height", 160)
        .attr("class", "legend");

    function createLabel(yPosition, fill, image, ratingsMap) {
        group.append("circle")
            .attr("cx", xPos + 20)
            .attr("cy", yPosition)
            .attr("r", 10)
            .attr("fill", fill)
            .on("mouseover", (event, d) => {
                d3.select(event.currentTarget).attr("fill", "orange");
            })
            .on("mouseout", (event, d) => {
                d3.select(event.currentTarget).attr("fill", fill);
            })
            .style("opacity", 0.5)
            .on("click", (event, d) => {
                event.stopPropagation();
                createCountries(countryGroup, path, countryData, ratingsMap, colorInterp);
            });

        group.append("svg:image")
            .attr("x", xPos + 40)
            .attr("y", yPosition - 25)
            .attr("width", 50)
            .attr("height", 50)
            .attr("xlink:href", image);
    }

    createLabel(-10, "steelblue", "chocolate-bar.png", chocoRatingsMap);
    createLabel(70, "chocolate", "cocoa.png", beansRatingsMap);
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


        this.countryGroup = this.elem.append("g");
        //createGraticule(this.elem, this.path);
        const chocoRatingsMap = createRatingMap(chocoData);
        const beansRatingsMap = createRatingMap(beanData);

        const colorInterp = d3.scaleLinear()
            .domain(d3.extent(chocoRatingsMap.values()))
            .range(["#ffc296", "#9c5144"]);

        createCountries(this.countryGroup, this.path, countryData, chocoRatingsMap, colorInterp);

        this.chocoMarkerGroup = elem.append('g');
        this.beansMarkerGroup = elem.append('g');
        this.arcsGroup = elem.append('g');

        this.enableRotation();
        this.enableZoom();

        this.swoosh = d3.line()
            .x(function(d) { return d[0] })
            .y(function(d) { return d[1] })
            .curve(d3.curveBasis);

        this.selectedIsBeans = false;

        this.elem.on("click", _ => {
            this.selectedLocation = null;
            this.drawCards([]);
            this.draw();
        });

        createLegend(this.elem, this.countryGroup, this.path, countryData, chocoRatingsMap, beansRatingsMap, colorInterp);
    }

    draw() {
        this.elem.selectAll("path").attr("d", this.path);
        this.drawMarkers(this.chocoMarkerGroup, this.chocoData, "steelblue", 0.5, false);
        this.drawMarkers(this.beansMarkerGroup, this.beanData, "chocolate", -0.5, true);
        this.drawArcs(this.selectedLocation, this.selectedIsBeans);
    }

    drawMarkers(group, dataset, fill, longitudeOffset, isBeans) {
        // Keep only points on this side of the sphere
        dataset = dataset.filter(d => {
            const coordinate = [d.longitude + longitudeOffset, d.latitude];
            // Points on the other side of the sphere have a distance of > pi / 2 from the center.
            const arc_distance = d3.geoDistance(coordinate, this.projection.invert(center));
            return arc_distance <= 1.57;
        })

        group.selectAll("circle")
            .data(dataset)
            .join("circle")
            .attr("cx", d => this.projection([d.longitude + longitudeOffset, d.latitude])[0])
            .attr('cy', d => this.projection([d.longitude + longitudeOffset, d.latitude])[1])
            .attr("fill", fill)
            .attr("r", d => 3 + d.location_count / 20)
            .on("click", (event, d) => {
                event.stopPropagation();

                this.selectedLocation = d;
                this.selectedIsBeans = isBeans;
                this.drawCards(d.card);
                this.draw();
            })
            .on("mouseover", (event, d) => {
                d3.select(event.currentTarget).attr("fill", "orange");
            })
            .on("mouseout", (event, d) => {
                d3.select(event.currentTarget).attr("fill", fill);
            })
            .style("opacity", 0.5);

        var textData = this.selectedLocation ? [this.selectedLocation] : [];
        const offset = 10;
        this.elem.selectAll("text")
            .data(textData)
            .join("text")
            .attr("x", d => this.projection([d.longitude + longitudeOffset, d.latitude])[0] + offset)
            .attr('y', d => this.projection([d.longitude + longitudeOffset, d.latitude])[1] - offset)
            .text(d => d.location_name);
    }

    drawCards(cards) {
        this.labelElem.select('p').remove();

        this.labelElem.selectAll("div")
            .data(cards)
            .join("div")
            .attr("class", "card")
            .call(this.selectedIsBeans ? drawBeansCard : drawCard);
    }

    drawArcs(selectedLocation = null, selectedIsBeans = false) {
        var dataset = this.linkData;
        if (selectedLocation != null) {
            if (selectedIsBeans) {
                dataset = dataset.filter(d => d.bean_location_name == selectedLocation.location_name);
            } else {
                dataset = dataset.filter(d => d.company_location_name == selectedLocation.location_name);
            }
        }

        var arcWidthScale = d3.scaleLinear()
            .domain(d3.extent(dataset, d => d.link_count))
            .range([0.2, 5]);

        this.arcsGroup.selectAll("path")
            .data(dataset)
            .join("path")
            .attr("class", "arc")
            .attr("d", d => {
                return this.swoosh(flyingArc(d, this.projection, this.skyProjection));
            })
            .style("stroke-width", d => arcWidthScale(d.link_count))
            .style("opacity", d => {
                return fadeAtEdge(d, this.projection);
            });
    }

    enableRotation() {
        var curRotX = 0;
        var curRotY = 0;

        const drag = d3.drag().on("drag", (event, d) => {
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


const svg = d3.select('#globe').attr("viewBox", `0 -50 ${width *3/2.5} ${height *3/2.5}`);
const cards = d3.select('#cards');

Promise.all([
    d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'),
    d3.json('preprocessing/jsons/aggregated_dataset.json'),
    d3.json('preprocessing/jsons/bean_dataset.json'),
    d3.json('preprocessing/jsons/link_dataset.json'),
]).then(([worldData, chocolateData, beanData, linkData]) => {
    var drawer = new GlobeDrawer(svg, cards, worldData, chocolateData, beanData, linkData);
    drawer.draw();
});