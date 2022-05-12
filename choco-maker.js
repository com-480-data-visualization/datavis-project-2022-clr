const COCO_PERCENT_FACTOR = 0.2
const INGREDIENTS_FACTOR = 0.4
const FLAVORS_FACTOR = 0.4


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
$("#main-form").on('submit', function(e) {
    //stop form submission
    e.preventDefault();

    //ajax call here
    console.log(e)
    var name = $("#choco-name")[0].value
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
    var use_embed = $("[name='useEmbedding']")[0].checked ? $("[name='useEmbedding']")[0].value : $("[name='useEmbedding']")[1].value
    console.log(use_embed)

    var distances = calculate_chocolate_scores(cocoa, selected_ingredients, flavors, (use_embed === "1"));
    var results_div = $("#results");
    results_div.empty()
    results_div.append(`<p >The chocolate bars that are very similar to yours are: </p>`)
    for (let i = 0; i < 5; i++) {
        // console.log(chocolate_data[distances[i].idx])
        //  console.log(distances[i])
        var company_html = `
        <div class="col-12">
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">${chocolate_data[distances[i].idx]['Specific Bean Origin or Bar Name']}</h5>
                    <p class="card-text"><b>Ingredients: </b> ${chocolate_data[distances[i].idx]['Ingredients List']}</p>
                    <p class="card-text"><b>Characteristics: </b> ${chocolate_data[distances[i].idx]['Most Memorable Characteristics']}</p>
                    <p class="card-text"><b>Coco Percentage: </b> ${chocolate_data[distances[i].idx]['Cocoa Percent']}</p>
                    <p class="card-text"><b>Last Rating: </b> ${chocolate_data[distances[i].idx]['Rating']}</p>
                </div>
            </div>
        </div>
        `
        results_div.append(company_html);
    }
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
    // console.log(chocolate_data[0])
    // console.log(embeddings)
}

init();