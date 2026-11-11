import d3 from "d3";
import autocomplete from '../vendor/autocomplete.js';
import {categories, datasetId, datasetPagePath, datasets} from './context';

//** make species dropdown_menu: one group per category of index.json, the datasets in their order
export const create_species_dropdown = function (div) {
    var menu = d3.select(div);

    var selector = menu
        .append("select")
        .attr("class", "form-control")
        .attr("id", "sel1")
        .on("change", function(){ window.location.href = this.value; });

    // for homepage, nothing is selected;
    // for page from clicked item on dropdown list, it shows the selected species.
    if (datasetId===null){
        selector.append("option")
            .attr("value", '')
            .attr("disabled", '')
            .attr("selected", '')
            .text('Selected species (see below for more species)');
    }else{
        const shown = datasets.find(function(dataset){return dataset.id===datasetId;});
        selector.append("option")
            .attr("value", datasetPagePath(datasetId))
            .text(shown.label);
    }

    for (const category of categories) {
        const optgroup= selector.append("optgroup").attr("label", `${category.label}:`);
        for (const dataset of datasets) {
            if (dataset.category===category.id){
                optgroup.append("option").attr("value", datasetPagePath(dataset.id)).text(dataset.label);
            }
        }
    }
}

//** setup and render autocomplete for species
export const autocomplete_species = function (){
    var mc = autocomplete(document.getElementById('species-search'))
            .keys(datasets.map(function(dataset){return {species: dataset.name, linkName: datasetPagePath(dataset.id)};}))
            .dataField("species")
            .placeHolder("Search species")
            .onSelected(function onSelect(d) {
                window.location.href = d.linkName;
            })
            .render();
}
