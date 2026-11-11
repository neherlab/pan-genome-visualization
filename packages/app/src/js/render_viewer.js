import {render_chart_table} from "./chartsAndClusterTable";
import {create_species_dropdown, autocomplete_species} from "./species-selector";
import * as datapath from "./data_path";
import speciesTree from "./speciesTree";
import  {metaDataTable} from "./datatable-meta";
import  {panXTree, metaLegend, panXClusterTable, panXMetaTable} from "./global";
import {attachButtons, tipText, tipFontSize, attachPanzoom, connectTrees, applyChangeToTree, hideNonSelected, undoHideNonSelected} from "./tree-init";
import {updateGeometry} from "../phyloTree/src/updateTree";
import {linkTableAlignmentTrees, linkMetaTableTree} from "./linkTableAlignmentTrees";
import {create_dropdown, updateMetadata} from "./meta-color-legend";
import {assign_metadata_color} from "./meta-color-assignment";
import {tooltip_toggle,tooltip_toggle_dict,tooltip_node,tooltip_branch} from './tooltips';
import speciesTreeCallbacks from "./speciesTreeCallbacks";
import geneTreeCallbacks from "./geneTreeCallbacks";
// /** strain_tree processing */
//render_tree(0, "mytree1", coreTree_path, clusterID=null, null);

var mySpeciesTree,
    myGeneTree,
    myDatatable,
    myMetaDatatable;

const cluster_table_id=panXClusterTable.cluster_table_id;
const meta_table_id=panXMetaTable.meta_table_id;

const handleSpeciesTree = function(newTree){
    newTree.namesToTips = {};
    for (var ti =0; ti<newTree.tips.length; ti++){
        var tip = newTree.tips[ti];
        tip.name = tip.n.name;
        tip.genes = [];
        newTree.namesToTips[tip.name] = tip;
        panXTree.speciesTreeTipCount+=1;
    }
    mySpeciesTree = newTree;
    panXTree.speciesTree= mySpeciesTree;
    attachButtons(mySpeciesTree, {
                                  layout_radial:"speciesTreeRadial",
                                  layout_vertical:"speciesTreeVertical",
                                  layout_unroot:"speciesTreeUnroot",
                                  zoomInY:"speciesTree_height_plus",
                                  zoomOutY:"speciesTree_height_minus",
                                  scale:"speciesTreeScale",
                                  tipLabels:"speciesTreeLabels",
                                  zoomReset:"speciesTreeZoomReset",
                                  treeSync:"speciesTreeSynchr",
                                  nodeLarge:"speciesTree_nodePlus",
                                  nodeSmaller:"speciesTree_nodeMinus",
                                  download_coreTree:"download_coreTree",
                                  panzoom:"speciesTreePanzoom"
                                  });

    mySpeciesTree.svg
        .selectAll('.tip')
        .on('mouseover', function(d){speciesTreeCallbacks.onTipHover(d);
                                     tooltip_node.show.apply(this, [...arguments, this])});
    mySpeciesTree.svg
        .selectAll('.branch')
        .on('mouseover', function(d){speciesTreeCallbacks.onBranchHover(d);
                                     tooltip_branch.show.apply(this, [...arguments, this])});

        ;
    mySpeciesTree.svg
        .call(tooltip_node)
        .call(tooltip_branch);
    //console.log("render_viewer:mySpeciesTree ",mySpeciesTree);
}
const handleGeneTree = function(newTree){
    myGeneTree = newTree;
    //** connecting both trees when new cluster clicked
    connectTrees(mySpeciesTree, myGeneTree);

    myGeneTree.svg
        .selectAll('.tip')
        .on('mouseover', function(d){geneTreeCallbacks.onTipHover(d);
                                     tooltip_node.show.apply(this, [...arguments, this])});
    myGeneTree.svg
        .selectAll('.branch')
        .on('mouseover', function(d){geneTreeCallbacks.onBranchHover(d);
                                     tooltip_branch.show.apply(this, [...arguments, this])});

    myGeneTree.svg
        .call(tooltip_node)
        .call(tooltip_branch);
    //console.log("render_viewer:myGeneTree ",myGeneTree);
}

const handleDataTable = function(datatable){
    myDatatable = datatable;
    //console.log("render_viewer:myDatatable ",myDatatable);
}

const handleMetaDataTable = function(metaDatatable){
    myMetaDatatable = metaDatatable;
}

const tryConnectTrees = function(){
    if (mySpeciesTree&&myGeneTree&&myDatatable&&myMetaDatatable){
        //connectTrees(mySpeciesTree, myGeneTree);
        linkTableAlignmentTrees(cluster_table_id, meta_table_id, myDatatable, mySpeciesTree, handleGeneTree);
        linkMetaTableTree(meta_table_id, myMetaDatatable,mySpeciesTree);
        attachPanzoom("speciesTree", mySpeciesTree);
        //attachPanzoom("geneTree", myGeneTree);
        tooltip_toggle(tooltip_toggle_dict);
        /** create metadata dropdown list */
        create_dropdown("#dropdown_list",mySpeciesTree,'geneTree',meta_display,'coreTree_legend',null);
        assign_metadata_color(meta_details,meta_display);
        //** monitor metadata selection and make legend
        var menu_panel = d3.select("#dropdown_select")
        //** attach metaLegend button
        $('#colorblind_safe').change(function() {
            metaLegend.common_color= d3.select(this).property('checked')?false:true;
            updateMetadata(metaLegend.current_metaType, mySpeciesTree, myGeneTree, meta_display, 'coreTree_legend', 0);
        });
        menu_panel.on("change", function(d) {
            const metaType=this.value;
            if (metaType!='Meta-info') {
                if (meta_display['color_options'][metaType]!=undefined && meta_display['color_options'][metaType]['type']=='discrete'){
                    tooltip_toggle({'colorblind_safe':'switch on/off colorblind-friendly mode'})
                }
                //console.log("trigger meta data color change", metaType, d, menu_panel);
                metaLegend.current_metaType=metaType;
                updateMetadata(metaType, mySpeciesTree, myGeneTree, meta_display, 'coreTree_legend', 0);
            }
        });
    }else{
        //console.log("trees not available yet, retry", mySpeciesTree, myGeneTree);
        setTimeout(tryConnectTrees, 1000);
    }
}

//** search strain via accession number
const search_accession= function (input_value) {
    /*var tree_index=1;*/
    var searchStr = input_value.toLowerCase();
    function nodeMatch(d, treeType){
        var name=(treeType=='speciesTree')?d.name.toLowerCase():d.accession.toLowerCase();
        return ((name.indexOf(searchStr) > -1 ) && (input_value.length != 0));
    };

    if (input_value=='') {
        undoHideNonSelected(mySpeciesTree);
        undoHideNonSelected(myGeneTree);
    }else{
        mySpeciesTree.tips.forEach(function(d){
            d.state.selected=(nodeMatch(d,'speciesTree'))?true:false;
        })
        hideNonSelected(mySpeciesTree);

        myGeneTree.tips.forEach(function(d){
            d.state.selected=(nodeMatch(d,'geneTree'))?true:false;
        })
        hideNonSelected(myGeneTree);
    }
};
window.search_accession=search_accession;

//** search strain via annotation
const search_annotation= function (input_value) {
    /*var tree_index=1;*/
    var searchStr = input_value.toLowerCase();
    function nodeMatch(d, treeType){
        var annotation=d.n.annotation.toLowerCase();
        return ((annotation.indexOf(searchStr) > -1 ) && (input_value.length != 0));
    };

    if (input_value=='') {
        undoHideNonSelected(myGeneTree);
    }else{
        myGeneTree.tips.forEach(function(d){
            d.state.selected=(nodeMatch(d,'geneTree'))?true:false;
        })
        hideNonSelected(myGeneTree);
    }
};
window.search_annotation=search_annotation;

//** create dropdown menu for species selection
create_species_dropdown('#species-selector', species_dt);
//** setup and render autocomplete for species
autocomplete_species();

const trigger_triplet_button = function(){

    // speciesTree triplet-button-group for 3 types of layouts
    $('.triplet-button-toggle.speciesTree').on("click", function () {
        $(this).toggleClass('open');
        $('.option.speciesTree').toggleClass('scale-on');
    });

    $('.triplet-button-toggle.geneTree').on("click", function () {
        $(this).toggleClass('open');
        $('.option.geneTree').toggleClass('scale-on');
    });
}
trigger_triplet_button();

speciesTree("speciesTree", datapath.coreTree_path, handleSpeciesTree);
// /** tree rotate listener */
// rotate_monitor('tree_rotate','mytree2');



/** render interactive charts and gene-cluster datatable */
//console.log("render_viewer:",datapath);
//myDatatable =
render_chart_table.initData(datapath.path_datatable1,cluster_table_id, 'GC_tablecol_select',
    'dc_data_count','dc_straincount_chart','dc_geneLength_chart','dc_coreAcc_piechart',
    'changeCoreThreshold','coreThreshold',
    'speciesTreeDiv','geneTreeDiv', null, mySpeciesTree, handleDataTable, handleGeneTree);
/** render meta-data datatable */
metaDataTable.dataTable2Fun(meta_table_id, handleMetaDataTable);
tryConnectTrees();



window.addEventListener("resize", function(){
    const speciesTreeResize = function(){
        mySpeciesTree.dimensions.width = window.innerWidth/3;
        mySpeciesTree.svg.attr("width", window.innerWidth/3);
        updateGeometry(mySpeciesTree);
    };
    applyChangeToTree(mySpeciesTree, speciesTreeResize, 0);

    const geneTreeResize = function(){
        myGeneTree.dimensions.width = window.innerWidth/3;
        myGeneTree.svg.attr("width", window.innerWidth/3);
        updateGeometry(myGeneTree);
    };
    applyChangeToTree(myGeneTree, geneTreeResize, 0);
});
