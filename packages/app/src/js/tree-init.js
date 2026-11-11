import {panXTree,metaLegend,panXClusterTable,panXMetaTable} from "./global";
import {tooltip_toggle} from "./tooltips";
import {changeLayout, changeDistance, updateTips} from "../phyloTree/src/updateTree";
import {zoomInY,  zoomIn, zoomIntoClade} from "../phyloTree/src/zoom";
import {removeLabels, tipLabels}  from "../phyloTree/src/labels";
import svgPanZoom from "svg-pan-zoom";
import {filterMetaDataTable} from "./datatable-meta";
import {change_select_dropdown_value} from './linkTableAlignmentTrees';
import {updateMetadata, removeLegend} from './meta-color-legend';
import {updateTipAttribute,updateBranches} from "../phyloTree/src/updateTree";
import {aln_file_path} from "./data_path";
import {unselect_clusterTable} from "./datatable-gc";

const tipUnselected=panXTree.tipUnselected;

export const DATA_ROOT_URL = process.env.DATA_ROOT_URL

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
        return d.n.attr.strain ? d.n.attr.strain: d.n.name ;
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

export const attachButtons = function(myTree, buttons){
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
            myTree.layout =  'radial';
            panXTree.currentTreeLayout= myTree.layout;
            applyChangeToTree(myTree, function(){changeLayout(myTree, dt);}, dt);
            });
    }
    if (buttons.layout_vertical){
        $('#'+buttons.layout_vertical).click(function() {
            myTree.layout =  'rect';
            panXTree.currentTreeLayout= myTree.layout;
            applyChangeToTree(myTree, function(){changeLayout(myTree, dt);}, dt);
        });
    }
    if (buttons.layout_unroot){
        $('#'+buttons.layout_unroot).click(function() {
            myTree.layout =  'unrooted';
            panXTree.currentTreeLayout= myTree.layout;
            applyChangeToTree(myTree, function(){changeLayout(myTree, dt);}, dt);
        });
    }
    if (buttons.orientation){
        $('#'+buttons.orientation).change(function() {
            myTree.orientation =  (d3.select(this).property('checked')==true) ? {x:-1, y:1} : {x:1, y:1};
            applyChangeToTree(myTree, function(){changeLayout(myTree, dt);}, dt);
        });
    }
    if (buttons.nodeLarge){
        $('#'+buttons.nodeLarge).click(function() {
            myTree.tips.forEach(function(d,i){
            d.tipAttributes.r *= 1.5;
            });
            updateTipAttribute(myTree,'r');
        });
    }
    if (buttons.nodeSmaller){
        $('#'+buttons.nodeSmaller).click(function() {
            myTree.tips.forEach(function(d,i){
                d.tipAttributes.r *= 0.5;
            });
            updateTipAttribute(myTree,'r');
        });
    }
    if (buttons.zoomInY){
        $('#'+buttons.zoomInY).click(function() {
            applyChangeToTree(myTree, function(){zoomInY(myTree,1.4,dt, updateSelected);},dt);
            //filterMetaDataTable('dc_data_table_meta', myTree);
        });
    }
    if (buttons.zoomOutY){
        $('#'+buttons.zoomOutY).click(function() {
            applyChangeToTree(myTree, function(){zoomInY(myTree,0.7,dt, updateSelected);},dt);
            //filterMetaDataTable('dc_data_table_meta', myTree);
        });
    }
    if (buttons.zoomReset){
        $('#'+buttons.zoomReset).click(function() {
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
            resetGeneTreeColor(myTree);
        });
    }

    if (buttons.treeSync){
        //console.log(buttons.treeSync)
        //tooltip_toggle('#speciesTreeSynchr','synchronize toggle behaviors on both  species tree and gene tree')
        $('#'+buttons.treeSync).change(function(event) {

            myTree.treeSync =d3.select(this).property('checked')
            if (myTree.treeSync){
                var myGeneTree=panXTree.currentGeneTree;
                attachButtons(myGeneTree, {
                                      layout_radial:"speciesTreeRadial",
                                      layout_vertical:"speciesTreeVertical",
                                      layout_unroot:"speciesTreeUnroot",
                                      scale:"speciesTreeScale"
                                      });
            }else{
                $('#'+buttons.layout_radial).off("click");
                $('#'+buttons.layout_vertical).off("click");
                $('#'+buttons.layout_unroot).off("click");
                $('#'+buttons.scale).off("change");
                event.stopPropagation();
                var mySpeciesTree=panXTree.speciesTree;
                attachButtons(mySpeciesTree, {
                                      layout_radial:"speciesTreeRadial",
                                      layout_vertical:"speciesTreeVertical",
                                      layout_unroot:"speciesTreeUnroot",
                                      scale:"speciesTreeScale"
                                      });
            }
        });
    }
    if (buttons.tipLabels){
        $('#'+buttons.tipLabels).change(function() {
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
            myTree.distance = (d3.select(this).property('checked')===false) ? "level":"div";
            applyChangeToTree(myTree, function(){changeDistance(myTree, dt);},dt);
        });
    }
    if (buttons.download_coreTree){
        d3.select('#'+buttons.download_coreTree)
            .append('a')
            .attr('href', `${DATA_ROOT_URL}/dataset/${speciesAbbr}/strain_tree.nwk`)
            .append('i')
            .attr('class','glyphicon glyphicon-download-alt')
    }
    if (buttons.download_geneTree&&buttons.clusterID){
        var download_geneTree=d3.select('#'+buttons.download_geneTree);
            download_geneTree.selectAll('a').remove();
            download_geneTree.append('a')
                .attr('id','#'+buttons.download_geneTree_id+'_href')
                .attr('href', `${DATA_ROOT_URL}/dataset/${speciesAbbr}/geneCluster/${buttons.clusterID}.nwk`)
                .append('i')
                .attr('class','glyphicon glyphicon-download-alt')
    }
    if (buttons.panzoom){
        $('#'+buttons.panzoom).change(function() {
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
        updateMetadata(metaLegend.current_metaType, speciesTree, geneTree, meta_display, 'coreTree_legend', 0);
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
    const pattern_path=aln_file_path+panXTree.currentClusterID+'_patterns.json';
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

    d3.json(pattern_path, function(error, data){
        const event_string=data['patterns'];
        const nodes=speciesTree.nodes;
        for (var i =0,len=nodes.length; i<len; i++){
            node=nodes[i];
            if (node.n.name!='NODE_0000000'){
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
        }
        if (metaLegend.current_metaType=='genePattern'||!metaLegend.current_metaType){
            updateBranches(speciesTree, [], ['stroke', 'stroke-width','stroke-dasharray'], 0);
        }else{
            updateBranches(speciesTree, [], ['stroke-width','stroke-dasharray'], 0);
        }
        //console.log('gain/loss pattern loading finished')
    })
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
