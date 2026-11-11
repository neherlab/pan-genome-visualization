import d3 from "d3";
import {panXTree,metaLegend,panXClusterTable,panXMetaTable} from "./global";
import {tooltip_toggle} from "./tooltips";
import {changeLayout, changeDistance, updateTips} from "../vendor/phyloTree/updateTree";
import {zoomInY,  zoomIn, zoomIntoClade} from "../vendor/phyloTree/zoom";
import {removeLabels, tipLabels}  from "../vendor/phyloTree/labels";
import svgPanZoom from "svg-pan-zoom";
import {filterMetaDataTable} from "./datatable-meta";
import {change_select_dropdown_value} from './linkTableAlignmentTrees';
import {updateMetadata, removeLegend} from './meta-color-legend';
import {updateTipAttribute,updateBranches} from "../vendor/phyloTree/updateTree";
import {unselect_clusterTable} from "./datatable-gc";
import {datasetFileUrl, metaDisplay} from "./context";
import {UNKNOWN} from "../data";

const tipUnselected=panXTree.tipUnselected;

/** Blob URL of the gene tree download button of the shown cluster */
var geneTree_download_url;

export const hideNonSelected =function(tree){
    tree.tipElements
        .attr('r',function(d){if (d.state.selected){return d.tipAttributes.r*1.5;}
                              else {return d.tipAttributes.r*0.5;}
                             })
        .style('fill',function(d){if (d.state.selected){ return d.tipAttributes.fill;}
                                  else {return tipUnselected;}
                            })
        .style('stroke',function(d){if (d.state.selected){ return d.tipAttributes.stroke;}
                              else {return tipUnselected;}
                            });
}

export const undoHideNonSelected =function(tree){

    tree.tipElements
        .attr('r',function(d){return d.tipAttributes.r;})
        .style('fill', function(d){return d.tipAttributes.fill;})
        .style('stroke', function(d){return d.tipAttributes.stroke;});
    tree.tips.forEach(function(d){d.state.selected=undefined;});
}

export const branchText = function(d){
    if (d.n.muts){
        const tmp = d.n.muts.join(',').slice(0,20);
        return tmp;
    }else{
        return "";
    }
}
export const branchFontSize = function(d){return d.stats.leafCount>2?3:0;}
export const tipText = function(d){
    if (d.terminal){
        //** a strain tree tip without strain name and a gene tree tip show their name
        return (d.n.attr.strain && d.n.attr.strain!==UNKNOWN) ? d.n.attr.strain: d.n.name ;
    }else{
        return "";
    }
}
export const tipFontSize = function(tree){
    return function(d){
        const nTips = tree.visibleTips.length;
        if (nTips<20){
            return 14.0;
        }else if (nTips<100){
            return 14 - 8*((nTips-20)/80.);
        }else{return 0;}
    };
}

export const applyChangeToTree = function(myTree, func, dt){
    removeLabels(myTree);
    func();
    if (myTree.showTipLabels){
        if (myTree.orientation.x==1) {
            setTimeout(function() {tipLabels(myTree, tipText, tipFontSize(myTree), 3,8);}, dt?dt:1000);
        } else {
            setTimeout(function() {tipLabels(myTree, tipText, tipFontSize(myTree), 3,-8,'end');}, dt?dt:1000);
        }
    };
}

//** the species tree buttons that also change the gene tree while the two trees are synchronized
const speciesLayoutButtons = {
    layout_radial:"speciesTreeRadial",
    layout_vertical:"speciesTreeVertical",
    layout_unroot:"speciesTreeUnroot",
    scale:"speciesTreeScale"
};

//** return the gene tree of the shown cluster, or undefined when the cluster has no gene tree
export const currentGeneTree = function(){
    return panXTree.currentGeneTree;
};

//** let the species tree layout buttons also change the shown gene tree
export const syncGeneTreeLayout = function(){
    attachButtons(currentGeneTree, speciesLayoutButtons);
};

/**
 * Bind the handlers of tree buttons; each handler acts on the tree that getTree returns at the click, and does
 * nothing while it returns undefined
 */
export const attachButtons = function(getTree, buttons){
    const dt = 1000;
    const updateSelected=false;
    /*if (buttons.layout){
        $('#'+buttons.layout).change(function() {
            myTree.layout =  (d3.select(this).property('checked')==false) ? 'rect' : 'radial';
            panXTree.currentTreeLayout= myTree.layout;
            applyChangeToTree(myTree, function(){changeLayout(myTree, dt);}, dt);
        });
    }*/
    if (buttons.layout_radial){
        $('#'+buttons.layout_radial).click(function() {
            const myTree=getTree();
            if (myTree===undefined) {return;}
            myTree.layout =  'radial';
            panXTree.currentTreeLayout= myTree.layout;
            applyChangeToTree(myTree, function(){changeLayout(myTree, dt);}, dt);
            });
    }
    if (buttons.layout_vertical){
        $('#'+buttons.layout_vertical).click(function() {
            const myTree=getTree();
            if (myTree===undefined) {return;}
            myTree.layout =  'rect';
            panXTree.currentTreeLayout= myTree.layout;
            applyChangeToTree(myTree, function(){changeLayout(myTree, dt);}, dt);
        });
    }
    if (buttons.layout_unroot){
        $('#'+buttons.layout_unroot).click(function() {
            const myTree=getTree();
            if (myTree===undefined) {return;}
            myTree.layout =  'unrooted';
            panXTree.currentTreeLayout= myTree.layout;
            applyChangeToTree(myTree, function(){changeLayout(myTree, dt);}, dt);
        });
    }
    if (buttons.orientation){
        $('#'+buttons.orientation).change(function() {
            const myTree=getTree();
            if (myTree===undefined) {return;}
            myTree.orientation =  (d3.select(this).property('checked')==true) ? {x:-1, y:1} : {x:1, y:1};
            applyChangeToTree(myTree, function(){changeLayout(myTree, dt);}, dt);
        });
    }
    if (buttons.nodeLarge){
        $('#'+buttons.nodeLarge).click(function() {
            const myTree=getTree();
            if (myTree===undefined) {return;}
            myTree.tips.forEach(function(d,i){
            d.tipAttributes.r *= 1.5;
            });
            updateTipAttribute(myTree,'r');
        });
    }
    if (buttons.nodeSmaller){
        $('#'+buttons.nodeSmaller).click(function() {
            const myTree=getTree();
            if (myTree===undefined) {return;}
            myTree.tips.forEach(function(d,i){
                d.tipAttributes.r *= 0.5;
            });
            updateTipAttribute(myTree,'r');
        });
    }
    if (buttons.zoomInY){
        $('#'+buttons.zoomInY).click(function() {
            const myTree=getTree();
            if (myTree===undefined) {return;}
            applyChangeToTree(myTree, function(){zoomInY(myTree,1.4,dt, updateSelected);},dt);
            //filterMetaDataTable('dc_data_table_meta', myTree);
        });
    }
    if (buttons.zoomOutY){
        $('#'+buttons.zoomOutY).click(function() {
            const myTree=getTree();
            if (myTree===undefined) {return;}
            applyChangeToTree(myTree, function(){zoomInY(myTree,0.7,dt, updateSelected);},dt);
            //filterMetaDataTable('dc_data_table_meta', myTree);
        });
    }
    if (buttons.zoomReset){
        $('#'+buttons.zoomReset).click(function() {
            const myTree=getTree();
            if (myTree===undefined) {return;}
            if (myTree.panZoom){
                myTree.panZoom.reset();
            }
            //#subtle:zoomIntoClade (tree, d, dt, setSelected)
            //#       state.selected are set to true in zoomIntoClade, they are then reset to undefined
            applyChangeToTree(myTree, function(){zoomIntoClade(myTree, myTree.nodes[0],dt, true);},dt);
            const metaTableID=panXMetaTable.meta_table_id;
            filterMetaDataTable(metaTableID, myTree);
            undoHideNonSelected(myTree);
            /*$('#'+panXClusterTable.cluster_table_id).DataTable()
                .search('').draw();
            unselect_clusterTable(panXClusterTable.cluster_table_id);*/
        });
    }

    if (buttons.colorReset){
        $('#'+buttons.colorReset).click(function() {
            const myTree=getTree();
            if (myTree===undefined) {return;}
            resetGeneTreeColor(myTree);
        });
    }

    if (buttons.treeSync){
        //console.log(buttons.treeSync)
        //tooltip_toggle('#speciesTreeSynchr','synchronize toggle behaviors on both  species tree and gene tree')
        $('#'+buttons.treeSync).change(function(event) {
            const myTree=getTree();
            if (myTree===undefined) {return;}

            myTree.treeSync =d3.select(this).property('checked')
            if (myTree.treeSync){
                syncGeneTreeLayout();
            }else{
                $('#'+buttons.layout_radial).off("click");
                $('#'+buttons.layout_vertical).off("click");
                $('#'+buttons.layout_unroot).off("click");
                $('#'+buttons.scale).off("change");
                event.stopPropagation();
                attachButtons(function(){return panXTree.speciesTree;}, speciesLayoutButtons);
            }
        });
    }
    if (buttons.tipLabels){
        $('#'+buttons.tipLabels).change(function() {
            const myTree=getTree();
            if (myTree===undefined) {return;}
            myTree.showTipLabels = d3.select(this).property('checked')
            //-console.log("tipLabels", myTree.visibleTips, tipFontSize(myTree)());
            if (myTree.showTipLabels){
                if (myTree.orientation.x==-1) {
                    tipLabels(myTree, tipText, tipFontSize(myTree),  3,-8,'end');
                } else {
                    tipLabels(myTree, tipText, tipFontSize(myTree),  3,8);
                }
            }else{
                removeLabels(myTree);
            }
        });
    }
    if (buttons.scale){
        $('#'+buttons.scale).change(function() {
            const myTree=getTree();
            if (myTree===undefined) {return;}
            myTree.distance = (d3.select(this).property('checked')===false) ? "level":"div";
            applyChangeToTree(myTree, function(){changeDistance(myTree, dt);},dt);
        });
    }
    if (buttons.download_coreTree){
        d3.select('#'+buttons.download_coreTree)
            .append('a')
            .attr('href', datasetFileUrl('strain_tree.nwk'))
            .append('i')
            .attr('class','glyphicon glyphicon-download-alt')
    }
    if (buttons.download_geneTree&&buttons.clusterID){
        //** the gene tree Newick of the cluster, when the cluster has one
        var download_geneTree=d3.select('#'+buttons.download_geneTree);
            download_geneTree.selectAll('a').remove();
            if (geneTree_download_url!==undefined){
                URL.revokeObjectURL(geneTree_download_url);
                geneTree_download_url=undefined;
            }
            if (buttons.nwk!==undefined){
                geneTree_download_url=URL.createObjectURL(new Blob([buttons.nwk], {type: 'text/plain'}));
                download_geneTree.append('a')
                    .attr('href', geneTree_download_url)
                    .attr('download', `${buttons.clusterID}.nwk`)
                    .append('i')
                    .attr('class','glyphicon glyphicon-download-alt')
            }
    }
    if (buttons.panzoom){
        $('#'+buttons.panzoom).change(function() {
            const myTree=getTree();
            if (myTree===undefined) {return;}
            if (myTree.panZoom){
                const zoom_enabled = d3.select(this).property('checked');
                if (zoom_enabled){myTree.panZoom.disableZoom();
                }else{myTree.panZoom.enableZoom();}
            }
        });
    }
}

export const attachPanzoom = function(treeID, myTree){
    const dt=0;
    const updateSelected = false;
    myTree.panZoom = svgPanZoom("#"+treeID, {
        beforeZoom: function(newZoom, oldZoom){
            applyChangeToTree(myTree, function(){
                zoomInY(myTree,newZoom/oldZoom,dt, updateSelected);}, dt);
            //filterMetaDataTable('dc_data_table_meta', myTree);
            return false;
        },
        // beforePan: function(oldPan, newPan){
        //     //console.log("panning", oldPan, newPan);
        //     applyChangeToTree(myTree, function(){
        //         pan(myTree, newPan.x-oldPan.x, newPan.y-oldPan.y, updateSelected);},dt);
        //     filterMetaDataTable('dc_data_table_meta', myTree);
        //     return {x:false, y:false};
        // }
    });
    myTree.panZoom.disableZoom();
}


export const connectTrees = function(speciesTree, geneTree){
    if (!(speciesTree&&geneTree)){
        //console.log("trees are not yet in place");
        return;
    }
    //console.log("connecting trees");
    geneTree.paralogs = {}
    for (var ti =0; ti<geneTree.tips.length; ti++){
        var tip = geneTree.tips[ti];
        tip.name = tip.n.name;
        tip.accession = tip.n.accession;
        tip.elem = geneTree.svg.selectAll("#"+tip.tipAttributes.id);
        tip.strainTip = speciesTree.svg.selectAll("#"+speciesTree.namesToTips[tip.accession].tipAttributes.id);
        if (!geneTree.paralogs[tip.accession]){
            geneTree.paralogs[tip.accession] = [];
        }
        geneTree.paralogs[tip.accession].push(tip);
    }

    for (var ti =0; ti<geneTree.tips.length; ti++){
        var tip = geneTree.tips[ti];
        tip.paralogs = geneTree.paralogs[tip.accession].filter(function(d){return d.name!==tip.name;});
    }


    for (var ti =0; ti<speciesTree.tips.length; ti++){
        var species = speciesTree.tips[ti];
        species.genes = [];
        species.elem = speciesTree.svg.selectAll("#"+species.tipAttributes.id);
        if (!geneTree.paralogs[species.name]){
            geneTree.paralogs[species.name]=[];
        }
        for (var gi=0; gi<geneTree.paralogs[species.name].length; gi++){
            species.genes.push(geneTree.paralogs[species.name][gi]);
        }
        if (geneTree.paralogs[species.name].length){
            species.genePresent = true;
        }else{
            species.genePresent = false;
        }
    }
    removeLegend('coreTree_legend');
    if (!metaLegend.current_metaType) {
        colorPresenceAbsence(speciesTree);
        change_select_dropdown_value("dropdown_select",'genePattern');
    }else{
        updateMetadata(metaLegend.current_metaType, speciesTree, geneTree, metaDisplay, 'coreTree_legend', 0);
    }
    styleGainLoss(speciesTree);


}

export const colorPresenceAbsence = function(speciesTree){
    var node, fill;
    for (var i=0; i<speciesTree.tips.length; i++){
        node = speciesTree.tips[i];
        node.tipAttributes.r = node.genePresent?panXTree.genePresentR:panXTree.geneAbsentR;
        fill = node.genePresent?panXTree.genePresentFill:panXTree.geneAbsentFill
        node.tipAttributes.fill = fill;
        node.tipAttributes.stroke = d3.rgb(fill).darker(panXTree.strokeToFill).toString();
    }
    updateTips(speciesTree, ["r"], ["fill", "stroke"], 0);
}

export const styleGainLoss = function(speciesTree){
    //** the gain/loss pattern of the shown cluster: one character per non-root node of the strain tree in pre-order
    const event_string=panXTree.currentPatterns;
    var node,stroke,stroke_width_factor,stroke_dasharray,event_type;

    if (panXTree.singleton_gene) {
        var node, fill;
        for (var i=0; i<speciesTree.tips.length; i++){
            node = speciesTree.tips[i];
            node.tipAttributes.r = panXTree.geneAbsentR;
            fill = panXTree.geneAbsentFill;
            node.tipAttributes.fill = fill;
            node.tipAttributes.stroke = d3.rgb(fill).darker(panXTree.strokeToFill).toString();
        }
        updateTips(speciesTree, ["r"], ["fill", "stroke"], 0);
    }

    if (event_string===undefined){
        return;
    }
    const nodes=speciesTree.nodes;
    //** nodes[0] is the root, which has no branch and no pattern character
    for (var i =1,len=nodes.length; i<len; i++){
        node=nodes[i];
        event_type=event_string[i-1];
        stroke=(event_type=='0'||event_type=='2')? panXTree.geneAbsentFill: panXTree.genePresentFill;
        if (panXTree.singleton_gene && event_type=='1'){
            node.tipAttributes.r = panXTree.genePresentR;
            fill = panXTree.genePresentFill;
            node.tipAttributes.fill = fill;
            node.tipAttributes.stroke = d3.rgb(fill).darker(panXTree.strokeToFill).toString();
            updateTips(speciesTree, ["r"], ["fill", "stroke"], 0);
        }
        stroke_width_factor=(event_type=='1'||event_type=='2')? 1.5: 1;
        stroke_dasharray= (event_type=='2') ? "6,6" : "1,0";
        node.branchAttributes["stroke"] = stroke;
        //** store gene event color
        //node.branchAttributes['event_pattern']=stroke;
        node.branchAttributes["stroke-width"] = panXTree.branch_stroke_width*stroke_width_factor;
        node.branchAttributes["stroke-dasharray"] = stroke_dasharray;
    }
    if (metaLegend.current_metaType=='genePattern'||!metaLegend.current_metaType){
        updateBranches(speciesTree, [], ['stroke', 'stroke-width','stroke-dasharray'], 0);
    }else{
        updateBranches(speciesTree, [], ['stroke-width','stroke-dasharray'], 0);
    }
}

const tipStroke=panXTree.tipStroke;

export const resetGeneTreeColor = function(geneTree){
    var node, fill;
    for (var i=0; i<geneTree.tips.length; i++){
        node = geneTree.tips[i];
        node.tipAttributes.fill = tipStroke;
        node.tipAttributes.stroke = tipStroke;
    }
    updateTips(geneTree, [], ["fill", "stroke"], 0);
}
