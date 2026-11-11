import d3 from "d3";
import msaLoad from './msaLoad';
import geneTree from "./geneTree";
import {panXTree,metaLegend,panXMetaTable} from "./global";
import {attachButtons, currentGeneTree, hideNonSelected, undoHideNonSelected} from "./tree-init";
import {removeLabels}  from "../vendor/phyloTree/labels";
import {bundles} from "./context";
import {nameText} from "./datatable-gc";
import {bundleErrorText} from "../data";

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

/**
 * Show a cluster: read its bundle (one range request), then show its alignment of `seqType` (`aa` or `na`), its gene
 * tree, and its gain/loss pattern. A newer click aborts the read; a failed read shows its error in the alignment panel.
 */
export const loadNewGeneCluster = async function(data, speciesTree, handleGeneTree, seqType){
    const clusterID=data.id,
          ann_majority=nameText(data.annotation);
    panXTree.currentClusterID=clusterID;
    if (data.kind==='rna') {seqType='na'}
    showViewerTitle("genetree_title",clusterID,ann_majority);
    let bundle;
    try {
        bundle = await bundles.read(data);
    } catch (error) {
        console.error(error);
        if (panXTree.currentClusterID===clusterID){
            showBundleError(bundleErrorText(error));
        }
        return;
    }
    if (bundle===undefined || panXTree.currentClusterID!==clusterID){
        return;
    }
    panXTree.currentPatterns=bundle.patterns.patterns;
    if (seqType==='aa'){
        msaLoad(clusterID, 'aa', bundle.aaAln, bundle.aaAlnReduced, 'taylor');
    }else{
        msaLoad(clusterID, 'na', bundle.naAln, bundle.naAlnReduced, 'nucleotide');
    }
    //** the viewer adds its own fields to the tree nodes, so it gets a copy of the cached tree
    var myGeneTree=geneTree("geneTree", bundle.tree===undefined ? undefined : structuredClone(bundle.tree), handleGeneTree, speciesTree, panXTree.currentTreeLayout);
    attachButtons(currentGeneTree, { download_geneTree:"download_geneTree",
                            clusterID:clusterID, nwk:bundle.nwk });

    //change_select_dropdown_value("dropdown_select",'genePattern');
}

//** show the error of a failed bundle read in the alignment panel
const showBundleError = function(text) {
    d3.select('#msa_legend').selectAll('a, span').remove();
    const panel = document.getElementById('snippetDiv');
    const alert = document.createElement('div');
    alert.className = 'alert alert-danger';
    alert.setAttribute('role', 'alert');
    alert.textContent = text;
    panel.replaceChildren(alert);
}

//** check if the item in child row matches the tips of gene tree
const nodeMatch= function (d, input_item, input_type){
    if (input_type!=='duplication') {
        // annotation and geneName are stored in d.n.annotation; a tip without it matches nothing
        var annotation=d.n.annotation;//.toLowerCase()
        return ((annotation!==undefined) && (annotation.indexOf(input_item) > -1 ) && (input_item.length != 0));
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
                    //** select related tips in geneTree with the same annotation, when the cluster has a gene tree
                    if (myGeneTree!==undefined && is_annotation){
                        table_childrow_select_tip(cell_text,myGeneTree,'annotation');
                    } else if (myGeneTree!==undefined && is_geneName){
                        table_childrow_select_tip(cell_text,myGeneTree,'geneName');
                    } else if (myGeneTree!==undefined && is_duplication){
                        table_childrow_select_tip(cell_text,myGeneTree,'duplication');
                    }
                }else{ // click(unselect) the selected child row
                    $('#'+clusterTableID+' tbody tr').removeClass('row_selected');
                    if (myGeneTree!==undefined && (is_annotation||is_geneName||is_duplication)){
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