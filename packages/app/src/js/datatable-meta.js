import {create_dataTable} from "./datatable-gc";
import {panXMetaTable} from './global';
import {button_tooltip,append_download_button} from './tooltips';
import {accessionUrl, dataset, datasetFileUrl, metaDisplay} from './context';
import {UNKNOWN} from '../data';

//#DataTable for meta-info
export const metaDataTable = {
    dataTable2Fun: function (meta_table_id, handleMetaDataTable) {
        var metaDatatable, metaConfiguration;
        //# create meta table
        var meta_display_order = metaDisplay['meta_display_order'].slice();
        meta_display_order.unshift('strain');
        meta_display_order.unshift('accession');

        create_dataTable('#'+meta_table_id, meta_display_order);

        //# assign data to each column
        var columnDefs_list=[];
        for (var i = 0, len = meta_display_order.length; i < len; i++) {
            //** a function reads each key, because metadata keys may hold `.`, which DataTables reads as a path
            const key = meta_display_order[i];
            var column_config={'targets': i,'data': function(row){return row[key];}};
            //** link each accession to its page by the accession_url of the dataset
            if (key=='accession' && dataset.accession_url!==null){
                column_config['createdCell']= function(cell, data){
                    const link = document.createElement('a');
                    link.href = accessionUrl(data);
                    link.target = '_blank';
                    link.textContent = data;
                    cell.replaceChildren(link);
                };
            }
            columnDefs_list.push(column_config);
        }
        //**configure the sorting order when clicking header (order direction control)
        /*const click_sortDescend={"sorting": [ "desc", "asc" ],"targets": [ "_all" ]};
        columnDefs_list.push(click_sortDescend);*/

        metaDatatable= $('#'+meta_table_id).DataTable({
                'data': metaTableRows(),
                'responsive': true,
                'search':true,
                'paging':true,
                //'bSort': true,
                'scrollX': true,
                'scrollY': '200px',//'30vh',
                'bAutoWidth': true,
                'bDeferRender': true,
                //'aaData':  geneCountDimension.top(Infinity),
                //'bDestroy': true,
                'columnDefs': columnDefs_list
            });

        // disable warning
        $.fn.dataTable.ext.errMode = 'none';
        if (true){
            $('#'+meta_table_id).on('error.dt', function(e,settings,techNote,message){console.log(message);});
        }

        $('<span style="display:inline-block; width: 10px;"></span>').appendTo('div#'+meta_table_id+'_length.dataTables_length');
        $('<button type="button" id="'+panXMetaTable.meta_table_unselect+'" class="btn btn-default">Unselect all clicked items</button>').appendTo('div#'+meta_table_id+'_length.dataTables_length');
        //append_download_button
        append_download_button('#'+meta_table_id+'_filter.dataTables_filter', 'metainfo', datasetFileUrl('metadata.tsv'));
        const dt_button_tooltip_dict= {
        'metainfo': 'download strain metadata'
        }
        button_tooltip('#'+meta_table_id+'_filter', dt_button_tooltip_dict);

        handleMetaDataTable(metaDatatable);
    }
};

/**
 * Return the rows of the metadata table: one per strain of dataset.json, with its accession, its strain (empty when
 * unknown), and each metadata value (`unknown` when missing)
 */
const metaTableRows = function(){
    return dataset.strains.map(function(strain){
        const row = {accession: strain.accession, strain: strain.strain ?? ''};
        for (const column of dataset.metadata){
            row[column.key] = strain.values[column.key] ?? UNKNOWN;
        }
        return row;
    });
};

export const filterMetaDataTable = function(dataTableID, tree)
    {
        //make a list of all tips currently selected
        var tipList = [], tip;
        for (var i=0; i<tree.tips.length; i++){
            tip = tree.tips[i];
            if (tip.state.selected){
                tipList.push(tip.name);
            }
        }
        //search in the table via a messy regex
        const regex = `(?:[\s]|^)(${tipList.join('|')})(?=[\s]|$)`;
        $('#'+dataTableID).DataTable().column(0)
            .search(regex, true).draw();
        return tipList;
    };
