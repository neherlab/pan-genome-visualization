import msaLoad from './msaLoad';
import geneTree from "./geneTree";
import {panXTree,metaLegend,panXMetaTable} from "./global";
import {aln_file_path} from "./data_path";
import {attachButtons, hideNonSelected, undoHideNonSelected} from "./tree-init";
import {removeLabels}  from "../phyloTree/src/labels";

/**
 * Module for initializing trigger actions in cluster datatable. It includes:
 * click the Plus/Minus button to unfold/fold annotation/geneName/etc details,
 * click aa/na alignment button to show MSA and linked trees.
 */

//**change select dropdown value to 'genePattern'(presence/absence) when clicking msa button
export const change_select_dropdown_value = function(div_id,valueToSelect) {
    var element = document.getElementById(div_id);
    if (element!=null){
        element.value = valueToSelect;
        d3.select('#colorblind_div').style('visibility','hidden');
    }
}

//** show MSA/Gene tree title with geneCluster Id
const showViewerTitle = function(genetree_title_id,message,ann_majority) {
    var genetree_viewer=d3.select('#'+genetree_title_id);/*genetree_title*/
    genetree_viewer.html('Gene tree | ' +ann_majority);
    //genetree_viewer.html('Gene tree | ' +ann_majority+ ' | '+message.split('/').pop().replace('_tree.json', ''));
    var sequence_viewer=d3.select('#sequence_viewer_title');
    sequence_viewer.html(' Sequence alignment | ' +ann_majority)
};

//** unselect metaTable_tree by either clicking "Unselect" button (on metatable)
//** Or clicking a new cluster
const unselect_metaTable_tree = function(MetaTableID, speciesTree){
    $('#'+MetaTableID+' tbody'+' tr').removeClass('active row_selected');
    if (speciesTree){
        undoHideNonSelected(speciesTree);
    }else{
        console.log("speciesTree not available");
    }
}

export const loadNewGeneCluster = function(data, speciesTree, handleGeneTree, seqType){
    const clusterID=data.msa,
          ann_majority=data.ann;
    panXTree.currentClusterID=clusterID;
    console.log("loadNewGeneCluster", clusterID, seqType);
    if (clusterID.indexOf('RC00')!== -1) {seqType='na'}
    msaLoad(aln_file_path+clusterID+'_'+seqType+'_aln_reduced.fa',(seqType=='aa')?'taylor':'nucleotide');
    /*try{    }
    catch(err) {
        console.log('msa loading failed')//console.log(err.message);}*/

    var geneTree_name=aln_file_path + clusterID+'_tree.json';
    // if it is a gene tree, show the title with geneCluster Id
    if (geneTree_name.indexOf('tree.json') !== -1) {
        showViewerTitle("genetree_title",geneTree_name,ann_majority);
    };
    try {
        var myGeneTree=geneTree("geneTree", geneTree_name, handleGeneTree, speciesTree, panXTree.currentTreeLayout);
        attachButtons(myGeneTree, { download_geneTree:"download_geneTree",
                                clusterID:clusterID });
    }
    catch(err) {
        console.log('No tree avaible: either tree missing or this is singleton gene');
    }

    //change_select_dropdown_value("dropdown_select",'genePattern');
}

//** check if the item in child row matches the tips of gene tree
const nodeMatch= function (d, input_item, input_type){
    if (input_type!=='duplication') {
        // annotation and geneName are stored in d.n.annotation
        var annotation=d.n.annotation;//.toLowerCase()
        return ((annotation.indexOf(input_item) > -1 ) && (input_item.length != 0));
    } else {
        var accession=d.n.accession;
        return ((accession.indexOf(input_item) > -1 ) && (input_item.length != 0));
    }
};
const table_childrow_select_tip= function (input_item, myGeneTree, input_type) {
    /*var tree_index=1;*/
    //var searchStr = input_item.toLowerCase()
    if (input_item=='') {
        undoHideNonSelected(myGeneTree);
    }else{
        myGeneTree.tips.forEach(function(d){
            d.state.selected=(nodeMatch(d, input_item, input_type))?true:false;
        })
        hideNonSelected(myGeneTree);
    }
};

export const linkTableAlignmentTrees = function(clusterTableID, metaTableId, datatable, speciesTree, handleGeneTree){
    /** row-clicking trigger: update MSA amino_acid alignment when clicking datatable row*/
    $('#'+clusterTableID+' tbody').on('click', 'tr', function (e) {
        var data = datatable.row($(this)).data();
        if (data){ //** fetch alignment filename from the table row
            loadNewGeneCluster(data, speciesTree, handleGeneTree, 'aa');
            unselect_metaTable_tree(metaTableId,speciesTree);
            $('#'+clusterTableID+' tbody tr').removeClass('row_selected');
            $(this).addClass('row_selected');
        } else{ //** when rows in nested table cliked
            const myGeneTree=panXTree.currentGeneTree;
            const row_index=$(this).index(),
                  cell=$(this).find('td').first(),
                  cell_text=cell.text(),
                  is_colspan=cell.attr('colspan');
            //** when clicking data cells (not the title & not the entire expanded cell)
            if ( row_index!==0 && !is_colspan){
                const nested_table_text= $(this).parents('tr').text(),
                      is_annotation= nested_table_text.startsWith('Annotation'),
                      is_geneName  = nested_table_text.startsWith('geneName'),
                      is_duplication=nested_table_text.startsWith('strain name');
                if (!$(this).hasClass("row_selected")){
                    $('#'+clusterTableID+' tbody tr').removeClass('row_selected');
                    $(this).addClass('row_selected');
                    //** select related tips in geneTree with the same annotation
                    if (is_annotation){
                        table_childrow_select_tip(cell_text,myGeneTree,'annotation');
                    } else if (is_geneName){
                        table_childrow_select_tip(cell_text,myGeneTree,'geneName');
                    } else if (is_duplication){
                        table_childrow_select_tip(cell_text,myGeneTree,'duplication');
                    }
                }else{ // click(unselect) the selected child row
                    $('#'+clusterTableID+' tbody tr').removeClass('row_selected');
                    if (is_annotation||is_geneName||is_duplication){
                        undoHideNonSelected(myGeneTree);
                    }
                }
                e.stopPropagation();
            }
        }
    });

    $('#'+clusterTableID+' tbody').on('click', '.btn.btn-info.btn-xs', function (e) {
        var data = datatable.row( $(this).parents('tr') ).data();
        loadNewGeneCluster(data, speciesTree, handleGeneTree, 'aa');
        e.stopPropagation();
    });

    $('#'+clusterTableID+' tbody').on('click', '.btn.btn-primary.btn-xs', function (e) {
        var data = datatable.row( $(this).parents('tr') ).data();
        loadNewGeneCluster(data, speciesTree, handleGeneTree, 'na');
        e.stopPropagation();
    });

};

export const linkMetaTableTree = function(MetaTableID, datatable, speciesTree){
    datatable.on('search.dt', function(){
        if (speciesTree){
            speciesTree.tips.forEach(function(d){d.state.selected=false;});
            var selectedItems = datatable.rows({search:"applied"}).data();
            const count_selectedItems = selectedItems.length;
            selectedItems.each(function(strain,ii){
                if (speciesTree.namesToTips[strain.accession]){
                    speciesTree.namesToTips[strain.accession].state.selected=true;
                }else{
                    console.log("accession not found", strain);
                }
            });
            hideNonSelected(speciesTree);

            if (panXTree.speciesTreeTipCount===count_selectedItems){
                undoHideNonSelected(speciesTree);
            }
        }else{
            console.log("speciesTree not available");
        }
    });

    $('#'+MetaTableID+' tbody').on( 'click', 'tr', function () {

        $(this).toggleClass('active');
        if ($(this).hasClass( "active" )){
            // highlight the row
            $(this).addClass('row_selected');
        }else{
            $(this).removeClass('row_selected');
        }

        if (speciesTree){
            if (datatable.rows('.row_selected').any()) {
                speciesTree.tips.forEach(function(d){d.state.selected=false;});
                var clickedItems= datatable.rows('.active').data();
                clickedItems.each(function(strain,ii){
                    if (speciesTree.namesToTips[strain.accession]){
                        speciesTree.namesToTips[strain.accession].state.selected=true;
                    }else{
                        console.log("accession not found", strain);
                    }
                });
                hideNonSelected(speciesTree);
            }else{
                undoHideNonSelected(speciesTree);
            }
        }else{
            console.log("speciesTree not available");
        }

    } );

    $('#'+panXMetaTable.meta_table_unselect).on( 'click', function () {
        unselect_metaTable_tree(MetaTableID,speciesTree);
    } );

}