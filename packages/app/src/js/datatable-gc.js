import d3 from "d3";
import $ from 'jquery';
import {button_tooltip, append_download_button} from './tooltips';
import {panXClusterTable} from './global';
import {clusterColumns, clusters, datasetFileUrl, datasetId, release} from './context';
import {describeReason, DataError, loadLoci} from '../data';

/** Return the text of a gene name or annotation, `None` for a gene without one. */
export const nameText = function(name){
    return name ?? 'None';
};

//## dc_DataTables configuration <div style="display:inline-block" ></div>
//** rows: the clusters of clusters.json with `rank` (row position + 1) and `locus` (the locus tags, see `loadLocusTags`)
var table_columns= [
    {'defaultContent': '<button type="button" class="btn btn-info btn-xs" data-toggle="tooltip"  data-placement="bottom"  title="amino acid alignment" >aa </button> <button type="button" class="btn btn-primary btn-xs" data-toggle="tooltip"  data-placement="bottom"  title="nucleotide alignment" >na </button> ',  'name':'Alignment','tooltip':'multiple sequence alignment'},
    {'defaultContent': '', 'className': 'geneName-details-control', 'orderable': false,  'name':''},//geneName expand
    {'data':'gene', 'render': nameText, 'name':'Name','tooltip':'gene name'},//geneName
    {'defaultContent': '', 'className': 'ann-details-control', 'orderable': false,  'name':''},//annotation expand
    {'data':'annotation', 'render': nameText, 'name':'Annotation','tooltip':'gene annotation'},//annotation    //'width':10,
    {'data':'strains',  'name':'#Strains','tooltip':'strain count'},//count
    {'defaultContent': '', 'className': 'dup-details-control', 'orderable': false,  'name':''},//duplication expand
    {'data':function(row){return row.duplications.length ? 'yes' : 'no';},  'name':'Duplicated','tooltip':'whether duplicated and duplication count in each strain'},//duplication
    {'data':'events',  'name':'Events','tooltip':'gene gain/loss events count'},
    {'data':'diversity', 'defaultContent': '', 'name':'Diversity','tooltip':'gene diversity'},
    {'data':'length',  'name':'Length','tooltip':'average gene length'},
    {'data':'rank','visible': false,  'name':'','tooltip':''},
    {'data':function(row){return searchNames(row.annotations);},'visible': false,  'name':'','tooltip':''},
    {'data':function(row){return searchNames(row.genes);},'visible': false,  'name':'','tooltip':''},
    {'defaultContent': '','data':'locus','visible': false,  'name':'','tooltip':''}
    //{'data':'msa','visible': false}
];

/** Return the names of `[name, count]` pairs, joined by spaces, for the hidden searchable columns. */
function searchNames(pairs){
    return pairs.filter(function(pair){return pair[0]!==null;}).map(function(pair){return pair[0];}).join(' ');
}

//** column header title for display
export var geneCluster_table_columns=[];
//** column title tooltip
export const clusterTable_tooltip_dict= {};
var header, column_data;
for (let i=0, len=table_columns.length ; i<len; i++) {
    column_data= table_columns[i];
    header=column_data['name'];
    //** header for display
    geneCluster_table_columns.push(header);
    //** header tooltip
    if (header.length!=0){
        clusterTable_tooltip_dict[header]=column_data['tooltip']
    }
}

//** add the extra columns of the dataset (cluster_columns of dataset.json) after the column "Length", in their order
var insertion_index= geneCluster_table_columns.indexOf('Length')+1;
for (const cluster_column of clusterColumns) {
    const new_column_data= {
        'data': function(row){return row.extra[cluster_column.key] ?? null;},
        'defaultContent': '',
        'name': cluster_column.label,
        'tooltip': cluster_column.description,
        'group': cluster_column.group
    };
    geneCluster_table_columns.splice(insertion_index, 0, new_column_data.name);
    clusterTable_tooltip_dict[new_column_data.name]=new_column_data.tooltip;
    table_columns.splice(insertion_index, 0, new_column_data);
    insertion_index+=1;
}

//** prepare column configuration for cluster datatable
var column_data, column_config=[];
for (let i=0, len=table_columns.length ; i<len; i++) {
    column_data= table_columns[i];
    //** push index in targets
    column_data['targets']=i;
    column_config.push(column_data); //width:60,
}
//**configure the sorting order when clicking header (order direction control)
const click_sortDescend={"sorting": [ "desc", "asc" ],"targets": [ "_all" ]};
column_config.push(click_sortDescend);
//** column descend/ascend sorting order
const column_desc= '#Strains',
      column_asc= 'Name',
      column_desc_index= geneCluster_table_columns.indexOf(column_desc),
      column_asc_index= geneCluster_table_columns.indexOf(column_asc);
//const table_sort_order= [[, 'desc' ],[8, 'asc' ]];
//console.log(column_desc_index,column_asc_index)
const table_sort_order= [[column_desc_index, 'desc' ],[column_asc_index, 'asc' ]];

//** button for showing/hiding columns in table
//## pay attention to GC table column order
//export const clusterTable_standard_dropdown=['multiple sequence alignment','geneName','annotation','#strain','duplicated', 'gene gain/loss events','diversity','gene length'];
const clusterTable_standard_dropdown= table_columns
                                        //.filter(function(n){return n.name!='' && n.visible!=false})
                                        .filter(function(n){return n.name!='' && !n.group})
                                        .map(function(n){return n.name})
//** create GC table HTML structure
export const create_dataTable = function (div, columns_set) {
    var datatable_div = d3.select(div);
    var thead = datatable_div.append("thead")
        .attr("align", "left");

    thead.append("tr")
        .selectAll("th")
        .data( columns_set )
        .enter()
        .append("th")
        .text(function(d) {return d.charAt(0).toUpperCase()+ d.slice(1); });
};

//** create multiselect dropdown for dataTables
export const create_multiselect = function (div, standard_columns, GC_table_association_groups) {
    var select_panel = d3.select(div);
    if (GC_table_association_groups!=undefined){
        const groups= Object.keys(GC_table_association_groups);
        for (var i = 0, len= groups.length; i < len; i++) {
            var select_group=select_panel.append("optgroup")
                                .attr("label", groups[i]);
            const group_elements= GC_table_association_groups[groups[i]];
            for (var e = 0, elem_len= group_elements.length; e < elem_len; e++) {
                select_group.append("option")
                    .attr("value", group_elements[e])
                    .attr("selected", "selected")
                    .text(group_elements[e]);
            }
        }
    }else{
        var select_group=select_panel;
        for (var i = 0, len= standard_columns.length; i < len; i++) {
        select_group.append("option")
            .attr("value", standard_columns[i])
            .attr("selected", "selected")
            .text(standard_columns[i]);
        }
    }


};

//** column configuration for datatables
export const datatable_configuration = function(table_input, table_id, col_select_id) {
    "use strict";
    //GC_tablecol_select
    //## datatable configuration
    var datatable = $('#'+table_id).DataTable({
        responsive: true,
        //dom: 'Bfrtip',
        //buttons: ['copy', 'csv', 'excel', 'pdf', 'print'],
        'paging': true,
        //'pagingType': 'full_numbers',
        'scrollX': true,
        'scrollY': '200px',//'30vh',
        //'scrollCollapse': true,
        colReorder: true,
        'bAutoWidth': true,
        //'bDeferRender': true,
        'deferRender':    true,
        'aaData': table_input,
        //'bDestroy': true,
        /*"processing": true, "serverSide": true,*/
        'columnDefs': column_config,//dc_dataTable_columnDefs_config,
        // order by count (desc) and geneId (asc)
        "order": table_sort_order
    });

    // disable warning
    $.fn.dataTable.ext.errMode = 'none';
    if (1) {
        $('#'+table_id).on('error.dt', function(e, settings, techNote, message) { console.log(message); });
    }

    //** create table dropdown buttons (standard, associations)
    const create_dropdown_button = function(tableId, buttonId, multiple){
        d3.select('#'+tableId+'_length.dataTables_length')
          .append('span')
          .style('display','inline-block')
          .style('width','5px')
        var new_select=d3.select('#'+tableId+'_length.dataTables_length')
          .append('select')
          .attr('id', buttonId);
        if (multiple){
            new_select.attr('multiple', 'multiple')
        }
    }

    //# append multiselect button for standard & gain_loss event columns to cluster table
    create_dropdown_button(table_id, col_select_id, true)

    //## empty and non-empty indexes
    function get_all_Indexes(array) {
        var non_empty_indexes = []; var empty_indexes = [];
        var dropdown_table_col = []; var i;
        for(i = 0; i < array.length; i++) {
            if (array[i] === '') {empty_indexes.push(i);}
            else { non_empty_indexes.push(i) }
        }
        return [non_empty_indexes, empty_indexes];
    }

    var indexes_list= get_all_Indexes(geneCluster_table_columns, '');
    var non_empty_index_list= indexes_list[0];
    var empty_inde_list = indexes_list[1];

    create_multiselect('#'+col_select_id, clusterTable_standard_dropdown);
    $('#'+col_select_id).multiselect({
        //enableFiltering: true,
        //includeSelectAllOption: true,
        allSelectedText: "Standard", //"All selected",
        onChange: function(element, checked) {
            //console.log(col_select_id,datatable,element,checked);
            function element_included (arr, number) {
                return (arr.indexOf(number) != -1)
            }
            var col_index = clusterTable_standard_dropdown.indexOf(element.val());
            var original_col_index = non_empty_index_list[col_index];

            if (checked === true) {
                if ( element_included(empty_inde_list,original_col_index-1)==true ) {
                    var column_expand = datatable.column( original_col_index-1 );
                    column_expand.visible( ! column_expand.visible() );}
                var column_normal = datatable.column( original_col_index );
                column_normal.visible( ! column_normal.visible() );
            }
            else if (checked === false) {
                if ( element_included(empty_inde_list,original_col_index-1)==true ) {
                    var column_expand = datatable.column( original_col_index-1 );
                    column_expand.visible( ! column_expand.visible() );}
                var column_normal = datatable.column( original_col_index );
                column_normal.visible( ! column_normal.visible() );

            }
        }
    });

    //** append multiselect button for the groups of extra columns to cluster table
    if (clusterColumns.length){
        const association_id='association';
        create_dropdown_button(table_id, association_id, true)

        var GC_table_association_groups={};
        for (const cluster_column of clusterColumns) {
            (GC_table_association_groups[cluster_column.group] ??= []).push(cluster_column.label);
        }
        create_multiselect('#'+association_id, '', GC_table_association_groups);
        $('#'+association_id).multiselect({
            enableFiltering: true,
            //includeSelectAllOption: true,
            allSelectedText: "Associations",
            enableClickableOptGroups: true,
            enableCollapsibleOptGroups: true,
            onChange: function(element, checked) {
                //** search column via name (header name)
                var column_selected =datatable.column( element.val()+':name');
                if (checked === true) {
                    column_selected.visible(true);
                }else{
                    column_selected.visible(false);
                }
            }
        });
    }

    const cluster_table_unselect = panXClusterTable.cluster_table_unselect;
    //** add button to clear the filter when clicking a clade
    $('<span style="display:inline-block; width: 5px;"></span>').appendTo('div#'+table_id+'_length.dataTables_length');
    $('<button type="button" id="'+cluster_table_unselect+'" class="btn btn-default">Clear clade filter</button>').appendTo('div#'+table_id+'_length.dataTables_length');
    $('#'+cluster_table_unselect).on('click', function () {
        unselect_clusterTable(table_id);
    })

    //** append download buttons for the core gene and all gene alignments and all gene cluster files
    append_download_button('#'+table_id+'_filter.dataTables_filter', 'core_gene_alignments', datasetFileUrl('core_gene_alignments.tar.gz'));
    append_download_button('#'+table_id+'_filter.dataTables_filter', 'all_gene_alignments', datasetFileUrl('all_gene_alignments.tar.gz'));
    append_download_button('#'+table_id+'_filter.dataTables_filter', 'gene_clusters', datasetFileUrl('gene_clusters.tar.gz'));
    const dt_button_tooltip_dict= {
    //**download core genes
    'core_gene_alignments': 'download core gene alignments',
    'all_gene_alignments': 'download all gene alignments',
    'gene_clusters': 'download all gene cluster files'
    }
    button_tooltip('#'+table_id+'_filter', dt_button_tooltip_dict);

    load_locus_tags_on_search(datatable, table_id, table_input);

    return datatable;
};

/**
 * Fill the hidden `locus` column on the first non-empty search of the table: load loci.json, set each row's locus tags
 * (`<accession>_<locus_tag>`, joined by spaces), and search again. A failed load shows its error, and the next search
 * tries again.
 */
const load_locus_tags_on_search = function(datatable, table_id, rows) {
    var state = 'empty'; //** empty, loading, or loaded
    const status = $('<span class="locus-tags-status" style="margin-left:6px"></span>')
        .insertAfter('#'+table_id+'_filter label');
    datatable.on('search.dt', function() {
        if (state!=='empty' || datatable.search()==='') {
            return;
        }
        state = 'loading';
        status.text('loading locus tags');
        loadLoci(release.id, datasetId, clusters.length).then(function(file) {
            //** every row, also the rows that a chart filter has taken out of the table
            for (const row of rows) {
                row.locus = file.loci[row.rank-1].map(function(locus){return locus.replaceAll('|', '_');}).join(' ');
            }
            state = 'loaded';
            status.text('');
            datatable.rows().invalidate('data').draw(false);
        }, function(error) {
            console.error(error);
            state = 'empty';
            const reason = error instanceof DataError ? describeReason(error.reason) : String(error);
            status.text(`locus tags failed to load: ${reason}`);
        });
    });
};

export const filterClusterDataTable = function(dataTableID, tree)
    {
        //make a list of all tips currently selected
        var tipList = [], tip;
        for (var i=0; i<tree.tips.length; i++){
            tip = tree.tips[i];
            if (tip.state.selected){
                tipList.push(tip.name);
            }
        }
        const strainCount = tipList.length;
        const tipListStr = tipList.join(" ");
        //** first, select cluster matching the strain count
        $('#'+dataTableID).DataTable().columns(5)
            .search('^'+strainCount+'$', true, false).draw();
        //** then, select cluster matching the related accession IDs
        $('#'+dataTableID).DataTable().columns(-1)
            .search(tipListStr).draw();
        //console.log(strainCount,tipListStr)
        //return tipList;
    };

//** unselect cluster table by clicking "clear clade filter" button (on cluster table)
export const unselect_clusterTable = function(clusterTableID){
    $('#'+clusterTableID).DataTable()
        .search('')
        .columns().search('')
        .draw();
        //** only with the following does not work
        //.search('').draw();
}
