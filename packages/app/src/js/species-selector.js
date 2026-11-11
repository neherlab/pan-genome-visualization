import d3 from "d3";
import autocomplete from './third_party/autocomplete';

//** make species dropdown_menu
export const create_species_dropdown = function (div, species_dt) {
    var menu = d3.select(div);

    var selector = menu
        .append("select")
        .attr("class", "form-control")
        .attr("id", "sel1")
        .attr("onchange", "location = this.options[this.selectedIndex].value;");

    // for homepage, nothing is selected;
    // for page from clicked item on dropdown list, it shows the selected species.
    if (speciesAbbr=='null'){
        selector.append("option")
            .attr("value", '')
            .attr("disabled", '')
            .attr("selected", '')
            .text('Selected species (see below for more species)');
    }else{
        selector.append("option")
            .attr("value", speciesAbbr)
            .text(species_dt[speciesAbbr]);
    }

    for(var key in species_dt) {
        var value = species_dt[key];
        if (key.startsWith('optgroup')){
            let optgroup= selector.append("optgroup").attr("label",value['label']);
            for (let species of value['members']){
                optgroup.append("option").attr("value", species).text(species_dt[species]);
            }
        }
    }
}

//** setup and render autocomplete for species
export const autocomplete_species = function (){
    var mc = autocomplete(document.getElementById('species-search'))
            .keys(species_search_dt)
            .dataField("species")
            .placeHolder("Search species")
            .onSelected(function onSelect(d) {
                location.href = d.linkName;
            })
            .render();
}