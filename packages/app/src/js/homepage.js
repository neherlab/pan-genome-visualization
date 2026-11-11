import d3 from "d3";
import {create_species_dropdown, autocomplete_species} from "./species-selector";
import {datasetFileUrl, datasetPagePath, datasets} from "./context";

import $ from 'jquery';

//** make species dropdown_menu
create_species_dropdown('#species-selector');
//** setup and render autocomplete for species
autocomplete_species();

const create_dataTable = function (div, columns_set) {
    var datatable_div = d3.select(div);
    var thead = datatable_div.append("thead")
        .attr("align", "left");

    thead.append("tr")
        .selectAll("th")
        .data( columns_set )
        .enter()
        .append("th")
        .text(function(d) {return d});
};

const downloads_table_id='download_table';
const column_display={"column_display_order": ["species name", "panX link", "#strains", "source", "core gene alignments", "all gene alignments", "strain/species tree", "metadata table"]};//, "gene cluster json"]};

//** one row per dataset of index.json, with the URLs of its downloads in the shown release
const downloads_table_rows = () => datasets.map((dataset) => ({
    "species name": dataset.name,
    "panX link": dataset.id,
    "#strains": dataset.strains,
    "source": dataset.source,
    "core gene alignments": datasetFileUrl("core_gene_alignments.tar.gz", dataset.id),
    "all gene alignments": datasetFileUrl("all_gene_alignments.tar.gz", dataset.id),
    "strain/species tree": datasetFileUrl("strain_tree.nwk", dataset.id),
    "metadata table": datasetFileUrl("metadata.tsv", dataset.id),
}));

const create_downloads_table = (downloads_table_id) => {
        var downloads_table;
        //# create meta table
        var column_display_order = column_display['column_display_order'].slice();
        //console.log(column_display, column_display_order)
        create_dataTable('#'+downloads_table_id, column_display_order);

        //# assign data to each column
        var columnDefs_list=[];
        for (var i = 0, len = column_display_order.length; i < len; i++) {
            var column_config={'targets': i,'data': column_display_order[i]};
            if (["panX link"].indexOf(column_display_order[i]) >= 0){
                column_config['render']= function(data, type, row, meta){
                                            return '<a href="'+datasetPagePath(data)+'" target="_blank"><i class="glyphicon glyphicon-new-window" style="vertical-align: middle;"></a>';
                                        }
            }
            else if (["species name", "panX link", "#strains", "source"].indexOf(column_display_order[i]) < 0) {
                column_config['render']= function(data, type, row, meta){
                                            return '<a href="'+data+'" target="_blank"> <i class="glyphicon glyphicon-download-alt" style="vertical-align: middle;"></i> </a>';
                                        }
            }
            columnDefs_list.push(column_config);
        }

        downloads_table= $('#'+downloads_table_id).DataTable({
                'data': downloads_table_rows(),
                'responsive': true,
                'search':true,
                'paging':true,
                'scrollX': true,
                'scrollY': '200px',//'30vh',
                'bAutoWidth': true,
                'bDeferRender': true,
                'columnDefs': columnDefs_list
            });
}

create_downloads_table(downloads_table_id);
