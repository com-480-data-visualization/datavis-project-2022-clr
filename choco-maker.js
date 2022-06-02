const COCO_PERCENT_FACTOR = 0.2
const INGREDIENTS_FACTOR = 0.4
const FLAVORS_FACTOR = 0.4
var map = L.map('map').setView([36.59788913307022, 23.906250000000004], 1);

function cosinesim(A, B) {
    var dotproduct = 0;
    var mA = 0;
    var mB = 0;
    for (i = 0; i < A.length; i++) {
        dotproduct += (A[i] * B[i]);
        mA += (A[i] * A[i]);
        mB += (B[i] * B[i]);
    }
    mA = Math.sqrt(mA);
    mB = Math.sqrt(mB);
    var similarity = (dotproduct) / ((mA) * (mB))
    return similarity;
}

function calculate_mean(vectors) {
    var mean = []
    for (let i = 0; i < vectors[0].length; i++) {
        var local_sum = 0;
        for (let j = 0; j < vectors.length; j++) {
            local_sum += vectors[j][i];
        }
        mean.push(local_sum / vectors.length)
    }

    return mean
}

function get_average_rating_for_ingredient(ingredient){
    var average_sum = 0, average_cnt = 0;
    for (const key in chocolate_data) {
        var bar = chocolate_data[key];
        if(bar['Ingredients List'].indexOf(ingredients[ingredient]) != -1){
            average_sum += bar['Rating'];
            average_cnt++;
        }
    }

    return average_sum/average_cnt;
}


function get_average_rating_for_flavor(flavor){
    var average_sum = 0, average_cnt = 0;
    for (const key in chocolate_data) {
        var bar = chocolate_data[key];
        if(bar['New Flavours'].indexOf(flavours[flavor]) != -1){
            average_sum += bar['Rating'];
            average_cnt++;
        }
    }

    return average_sum/average_cnt;
}

$("#main-form").on('submit', function(e) {
    console.log(e)
    //stop form submission
    e.preventDefault();

    //ajax call here
    console.log(e)
    var cocoa = $("#choco-cocoa")[0].value
    var checkboxes = $("[name='choco-ingredients']")
    var flavors_select = $("#choco-flavors")[0]

    var selected_ingredients = []
    for (let i = 0; i < checkboxes.length; i++) {
        if (checkboxes[i].checked) {
            selected_ingredients.push(checkboxes[i].value)
        }
    }

    var flavors = []
    for (let i = 0; i < flavors_select.length; i++) {
        if (flavors_select[i].selected) {
            flavors.push(flavors_select[i].value)
        }
    }


    // console.log(name)
    // console.log(cocoa)
    // console.log(selected_ingredients)
    // console.log(flavors)
    // var use_embed = $("[name='useEmbedding']")[0].checked ? $("[name='useEmbedding']")[0].value : $("[name='useEmbedding']")[1].value
    // console.log(use_embed)

    
    var distances = calculate_chocolate_scores(cocoa, selected_ingredients, flavors, true);
    var results_div = $("#results");
    results_div.empty()
    // results_div.append(`<p >The chocolate bars that are very similar to yours are: </p>`)
    var bar_ratings = []
    var cocoa_percentage_arr = []
    for (let i = 0; i < 30; i++) {
        // console.log(chocolate_data[distances[i].idx])
        //  console.log(distances[i])
        var company_html = `
        
            <div class="card" style="margin:3em">
                <div class="card-body">
                    <h5 class="card-title">${chocolate_data[distances[i].idx]['Specific Bean Origin or Bar Name']}</h5>
                    <p class="card-text"><b>Ingredients: </b> ${chocolate_data[distances[i].idx]['Ingredients List']}</p>
                    <p class="card-text"><b>Characteristics: </b> ${chocolate_data[distances[i].idx]['Most Memorable Characteristics']}</p>
                    <p class="card-text"><b>Coco Percentage: </b> ${chocolate_data[distances[i].idx]['Cocoa Percent']}</p>
                    <p class="card-text"><b>Last Rating: </b> ${chocolate_data[distances[i].idx]['Rating']}</p>
                </div>
            </div>
        `
        bar_ratings.push({
            rating: chocolate_data[distances[i].idx]['Rating'],
            html: company_html
        });
        
        if(!cocoa_percentage_arr.includes(parseFloat(chocolate_data[distances[i].idx]['Cocoa Percent']))){
            cocoa_percentage_arr.push(parseFloat(chocolate_data[distances[i].idx]['Cocoa Percent']))
        }

        var current_loc = chocolate_data[distances[i].idx]['Company Location'] 
        var company_name =  chocolate_data[distances[i].idx]['Company (Manufacturer)'];
        L.marker([company_locations[current_loc].latitude, company_locations[current_loc].longitude]).bindPopup(company_name).addTo(map);
    }

    var sorted = bar_ratings.sort(function(a,b){
        return b.rating - a.rating
    });

    sorted.forEach(bar => {
        results_div.append(bar.html)
    });

    var named_flavors = []
    var named_ingredients = []

    selected_ingredients.forEach(ingredient_idx => {
        named_ingredients.push(ingredients[ingredient_idx])
    })

    flavors.forEach(flavor_idx => {
        named_flavors.push(flavours[flavor_idx])
    })


    make_radial_plot(named_flavors, "Most Memorable Characteristics", 'flavors_radial_results');
    make_radial_plot(named_ingredients, "Ingredients List", 'ingredients_radial_results');

    cocoa_percentage_arr.sort()

    console.log(cocoa_percentage_arr)
    make_percentage_plot(cocoa_percentage_arr, "Cocoa Percent Int", 'cocoa_graph_results', 'line');

    map.invalidateSize()
    
    $("#picker_info").css("display", "none")
    $("#picker_results").css("display", "")

    
});

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


function populate_form() {
    var ingredients_div = $('#ingredients');
    var i = 0;
    ingredients.forEach(ingredient => {
        ingredients_div.append(`<input type="checkbox" class="btn-check" name="choco-ingredients" id="option_${i}" autocomplete="off" value="${i}"> `)
        ingredients_div.append(`<label class="btn btn-outline-primary" for="option_${i}">${ingredient}</label>`)
        i++
    });

    var flavors_select = $('#choco-flavors')
    i = 0;
    flavours.forEach(flavor => {
        flavors_select.append(`<option value=${i}>${flavor}</option>`)
        i++;
    })
}

function update_coco_percent_display() {
    var cocoa = $("#choco-cocoa")[0].value
    $("#coco_per_val")[0].innerText = `: ${cocoa}%`
}

async function init() {
    populate_form();
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    
    // console.log(chocolate_data[0])
    // console.log(embeddings)
}

var tabEl = document.getElementById('analysis-tab')
tabEl.addEventListener('shown.bs.tab', event => {
   console.log("analysis")
   setTimeout(function(){ map.invalidateSize()}, 500);
})

init();