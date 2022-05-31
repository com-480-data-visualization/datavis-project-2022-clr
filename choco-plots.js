function make_radial_plot(selected_labels, column, id) {

    var mean_ratings = {};

    const average = arr => arr.reduce((p, c) => p + c, 0) / arr.length;

    for (let i = 0; i < selected_labels.length; i++) {
        label = selected_labels[i];
        mean_ratings[label] = [];
        for (const key in chocolate_data) {
            var bar = chocolate_data[key];
            if (bar[column] !== undefined) {
                if (bar[column].includes(label)) {
                    mean_ratings[label].push(bar["Rating"]);
                }

            }

        }
        mean_ratings[label] = average(mean_ratings[label]);
    }



    const data = {
        labels: selected_labels,
        datasets: [{
            label: 'Rating',
            data: Object.values(mean_ratings),
            fill: true,
            backgroundColor: '#51280d',
            borderColor: 'white',
            pointBackgroundColor: '#51280d',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#51280d'
        }]
    };

    const config = {
        type: 'radar',
        data: data,
        options: {
            elements: {
                line: {
                    borderWidth: 3
                }
            },
            scales: {
                grid: {
                    display: false
                },
                r: {
                    min: 1,
                    max: 5,
                }

            },

        },

    };


    var radar_plot = new Chart(
        document.getElementById(id),
        config
    );

}


function make_percentage_plot(selected_labels, column, id, type_plot) {

    var mean_ratings = {};

    const average = arr => arr.reduce((p, c) => p + c, 0) / arr.length;

    for (let i = 0; i < selected_labels.length; i++) {
        label = selected_labels[i];
        mean_ratings[label] = [];
        for (const key in chocolate_data) {
            var bar = chocolate_data[key];
            if (bar[column] !== undefined) {
                if (bar[column] == label) {
                    mean_ratings[label].push(bar["Rating"]);
                }

            }

        }
        mean_ratings[label] = average(mean_ratings[label]);
    }



    const data = {
        labels: selected_labels,
        datasets: [{
            label: 'Rating',
            data: Object.values(mean_ratings),
            fill: true,
            backgroundColor: '#51280d',
            borderColor: 'white',
            pointBackgroundColor: '#51280d',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#51280d'
        }]
    };

    const config = {
        type: type_plot,
        data: data,
        options: {
            elements: {
                line: {
                    borderWidth: 3
                }
            },
            scales: {
                grid: {
                    display: false
                },
                y: {
                    min: 1,
                    max: 5,
                }

            },

        },

    };


    var single_plot = new Chart(
        document.getElementById(id),
        config
    );

}

async function init() {
    // make_sankey_plot();
    var selected_flavours = [
        'spicy',
        'oily',
        'classic',
        'almond',
        'cocoa',
        'sweet',
        'coffee'
    ];

    make_radial_plot(selected_flavours, "Most Memorable Characteristics", 'radial_flavours');

    var selected_ingredients = [
        "Beans", "Sugar", "Cocoa Butter", "Lecithin"
    ];

    make_radial_plot(selected_ingredients, "Ingredients List", 'radial_ingredients');

    var selected_percentages = [
        69, 70, 71, 72, 73, 74
    ];

    make_percentage_plot(selected_percentages, "Cocoa Percent Int", 'cocoa_percentage', 'line');

    var selected_countries = [
        "France", "Germany", "Italy", "Switzerland", "India", "U.S.A."
    ];

    make_percentage_plot(selected_countries, "Company Location", 'bar_plot', 'bar');

}

init();


// deprecated
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

    if (places.length > 20) {
        for (let i = 0; i < places.length; i++) {

            if (places.filter((value) => value[0] == places[i][0]).length < 12 || places.filter((value) => value[1] == places[i][1]).length < 12) {
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
                        color: '#51280d'
                    }
                },
                link: {
                    color: {
                        fillOpacity: 0.2, // Transparency of the link.
                        stroke: '#753d22', // Color of the link border.
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