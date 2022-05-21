function make_radial_plot() {


}

function make_sankey_plot() {
    var obj = document.getElementById('sankey');

    while (obj.firstChild) {
        obj.removeChild(obj.lastChild);
    }
    google.charts.load('current', {
        'packages': ['sankey']
    });

    var divWidth = obj.offsetWidth;

    google.charts.setOnLoadCallback(drawChart);

    var places = []

    for (const key in chocolate_data) {
        var bar = chocolate_data[key];

        places.push([bar["Company Location"] + " company", bar["Country of Bean Origin"] + " bean", bar["Rating"], "From " + bar["Company Location"] + " to " + bar["Country of Bean Origin"] + ", rating: " + bar["Rating"]]);
    }


    var to_remove = [];

    if (places.length > 70) {
        for (let i = 0; i < places.length; i++) {

            if (places.filter((value) => value[0] == places[i][0]).length < 3 || places.filter((value) => value[1] == places[i][1]).length < 3) {
                console.log(places[i])
                to_remove.push(places[i]);
            }

        }

    }
    places = places.filter((value) => !to_remove.includes(value));


    function drawChart() {
        var data = new google.visualization.DataTable();
        data.addColumn('string', 'From');
        data.addColumn('string', 'To');
        data.addColumn('number', 'Weight');
        data.addColumn({
            type: 'string',
            role: 'tooltip'
        });

        data.addRows(places);
        // Sets chart options.
        var options = {
            tooltip: {
                trigger: 'selection',
                isHtml: true,
                textStyle: {
                    color: 'black'
                },

            },
            showTooltip: true,
            showInfoWindow: true,
            sankey: {
                node: {
                    label: {
                        color: 'black'
                    }
                },
                link: {
                    color: {
                        fillOpacity: 1, // Transparency of the link.
                        stroke: 'brown', // Color of the link border.
                        strokeWidth: 0.1 // Thickness of the link border (default 0).
                    },
                }
            }
        };

        // Instantiates and draws our chart, passing in some options.

        if (obj !== null) {
            console.log('making sankey');
            chart = new google.visualization.Sankey(obj);
            chart.draw(data, options);
            console.log(chart)

        }



    }



}


function calculate_chocolate_scores(coco_percent, new_ingredients_indices, new_flavors_idx, use_vectors) {
    var distances = []

    for (const key in chocolate_data) {
        var bar = chocolate_data[key];
        var coco_percent_similarity = 100 - Math.abs(bar['Cocoa Percent Int'] - coco_percent)
        var ingredients_common = 0;
        for (let i = 0; i < new_ingredients_indices.length; i++) {
            ingredients_common += (bar['Ingredients List'].indexOf(ingredients[new_ingredients_indices[i]]) != -1) ? 1 : 0;
        }

        if (!use_vectors) {
            console.log("no vectors")
            var flavors_common = 0;
            for (let i = 0; i < new_flavors_idx.length; i++) {
                flavors_common += (bar['New Flavours'].indexOf(flavours[new_flavors_idx[i]]) != -1) ? 1 : 0;
            }
            var score = (coco_percent_similarity / 100 * COCO_PERCENT_FACTOR) + ((ingredients_common / new_ingredients_indices.length) * INGREDIENTS_FACTOR) + ((flavors_common / new_flavors_idx.length) * FLAVORS_FACTOR)
            distances.push({ idx: key, sc: score });
        } else {
            // console.log("using vectors")
            var flavor_vectors = []
            for (let i = 0; i < new_flavors_idx.length; i++) {
                flavor_vectors.push(embeddings[flavours[new_flavors_idx[i]]]['vector'])
            }
            // console.log("pushed vectors: ", flavor_vectors)
            var flavors_average = calculate_mean(flavor_vectors)
                // console.log("average: ", flavors_average)
            var flavors_score = cosinesim(flavors_average, bar['Flavours Vectors']);
            // console.log("score: ", flavors_score)
            var score = (coco_percent_similarity / 100 * COCO_PERCENT_FACTOR) + ((ingredients_common / new_ingredients_indices.length) * INGREDIENTS_FACTOR) + ((flavors_score / 1) * FLAVORS_FACTOR)
            distances.push({ idx: key, sc: score });
        }

    }

    distances.sort((a, b) => b.sc - a.sc)
        //  for(let i = 0; i < 5; i++){
        //      console.log(chocolate_data[distances[i].idx])
        //      console.log(distances[i])
        //  }
    return distances
}

async function init() {
    make_sankey_plot();
    // console.log(chocolate_data[0])
    // console.log(embeddings)
}

init();