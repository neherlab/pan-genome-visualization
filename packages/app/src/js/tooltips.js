import d3 from "d3";
import d3Tip from "d3-tip";
d3.tip = d3Tip;

const meta_types =meta_display['meta_display_order'];
var antibiotics_set;

//** tooltip for datatables header/tree buttons
export const tooltip = d3.select("body")
    .append("div")
    .style("position", "absolute")
    //.style("z-index", "10")
    .style("color", "white")
    .style("padding","5px")
    .style("border-radius","5px")
    .style("visibility", "hidden")
    .style("background", "rgba(0,0,0,0.5)"); //255,255,255

//** calling tooltip for cluster-table header
export const tooltip_tableHeader = function(divID, tooltip_dict) {
    d3.selectAll(divID)
      .on("mouseover", function(d){
          tooltip.text(tooltip_dict[d]);
          if (tooltip.text()!="") {
              return tooltip.style("visibility", "visible");
          } else {//** for cluster-table: hidden header of expand button
            return tooltip.style("visibility", "hidden");
          }
      })
      .on("mousemove", function(){
        return tooltip.style("top", (d3.event.pageY-40)+"px").style("left",(d3.event.  pageX+5)+"px");
      })
      .on("mouseout", function(){return tooltip.style("visibility", "hidden");})
};

//## tooltip for tree nodes and branches
export const tooltip_node = d3.tip().attr('class', 'd3-tip').html(function(d) {
    var string = "";
    //** speicesTree tooltip
    string +="<table rules='cols'> "
    if (d.name != undefined) {
        if (d.n.accession==undefined){
            //string += "NCBI accesion:  " + d.name;
            string += " <tr> <th class='tooltip_table_th'>NCBI accession</th> <td class='tooltip_table_td'> " + d.name+" </td> </tr> ";
        }else{
            string += " <tr> <th class='tooltip_table_th'>NCBI accession</th> <td class='tooltip_table_td'> " + d.accession+" </td> </tr> ";
            string += " <tr> <th class='tooltip_table_th'>gene ID</th> <td class='tooltip_table_td'> " + d.name+" </td> </tr> ";

        }
    }

    for (var i=0, len=meta_types.length; i<len ; i++) {
        var meta_category = meta_types[i];
        if ( antibiotics_set && antibiotics_set.indexOf(meta_category)>=0 ){
                //pass
        }else{
            if ((typeof d.n.attr!= "undefined")&&(typeof d.n.attr[meta_category] != "undefined")&&(d.n.attr[meta_category] !='unknown')) {
                    string += " <tr> <th class='tooltip_table_th'>" + meta_category + "</th> <td class='tooltip_table_td'> " + d.n.attr[meta_category]+" </td> </tr> ";
                }
        }
    }

    //** antibiotics specific table
    if (antibiotics_set) {
        string +="<br/><br/> <table> "
        for (var i = 0; i < antibiotics_set.length; i++){
            if (d[antibiotics_set[i]]!='unknown' && d[antibiotics_set[i]]!='Susceptible' && typeof d[antibiotics_set[i]] != "undefined" ){
                string +=" <tr> <th>"+antibiotics_set[i]+"</th> <td>"+d[antibiotics_set[i]]+"</td> </tr> ";
            }
        }
        string +="</table>"
    }

    //** geneTree tooltip
    if (typeof d.n.annotation != "undefined") {
        string += " <tr> <th class='tooltip_table_th'>annotation</th> <td class='tooltip_table_td'> " + d.n.annotation+" </td> </tr> ";
    }
    if (typeof d.n.muts != "undefined") {
        const na_muts= d.n.muts, na_muts_len= na_muts.length;
        if (na_muts_len!==0) {
            const na_muts_str= (na_muts_len>25) ?na_muts.substr(0,25)+'...' :na_muts;
            string += " <tr> <th class='tooltip_table_th'>nucleotide mutations:</th> <td class='tooltip_table_td'> " + na_muts_str+" </td> </tr> ";
        }
    }
    if (typeof d.n.aa_muts != "undefined") {
        const aa_muts= d.n.muts, aa_muts_len= aa_muts.length;
        if (aa_muts_len!==0) {
            const aa_muts_str= (aa_muts_len>25) ?aa_muts.substr(0,25)+'...' :aa_muts;
            string += " <tr> <th class='tooltip_table_th'>amino acid mutations:</th> <td class='tooltip_table_td'> " + aa_muts_str+" </td> </tr> ";
        }
    }
    string += "<div class=\"smallspacer\"></div>";

    string +="</table>"
    return string;
});

export const tooltip_branch = d3.tip().attr('class', 'd3-tip').html(function(d) {
    var string = "";
    string += "click and zoom into clade ";
    if (d.n) {
        if (typeof d.n.ann != "undefined") {
            string += "<br/>" + "annotation:  " + d.n.ann;
            }
        if (typeof d.n.muts != "undefined") {
            var muts_str=d.n.muts
            if (muts_str.length>50) { muts_str=muts_str.substr(0,50)+'...'}
            string += "<br/>" + "nucleotide mutations:  " + muts_str
            }
        if (typeof d.n.aa_muts != "undefined") {
            var aa_muts_str=d.n.aa_muts
            if (aa_muts_str.length>50) { aa_muts_str=aa_muts_str.substr(0,50)+'...'}
            string += "<br/>" + "amino acid mutations:  " + aa_muts_str;
            }
    }
    string += "<div class=\"smallspacer\"></div>";

    return string;
});
tooltip_branch.offset([-5, 0])

//** calling tooltip on toggle buttons (switch buttons)
export const tooltip_toggle = function(tooltip_toggle_dict) {
    for (const divID in tooltip_toggle_dict){
        const tooltip_text=tooltip_toggle_dict[divID];
        const label=d3.select($('#'+divID).next()[0]);
        label
          .on("mouseover", function(d){
              tooltip.text(tooltip_text);
              return tooltip.style("visibility", "visible");
          })
          .on("mousemove", function(){
            return tooltip.style("top", (d3.event.pageY-40)+"px").style("left",(d3.event.pageX+5)+"px");
          })
          .on("mouseout", function(){return tooltip.style("visibility", "hidden");})
    }
}

//** calling tooltip for simple buttons
export const button_tooltip = function(divID, tooltip_dict) {
    d3.selectAll(divID).selectAll('.btn_tooltip')
    .on("mouseover", function(d){
        tooltip.text(tooltip_dict[d3.select(this).attr('id')]);
        if (tooltip.text()!="") {
            return tooltip.style("visibility", "visible");
        } else {return tooltip.style("visibility", "hidden");}
    })
    .on("mousemove", function(){
        return tooltip.style("top", (d3.event.pageY-40)+"px").style("left",(d3.event.pageX+5)+"px");
    })
    .on("mouseout", function(){
        return tooltip.style("visibility", "hidden");
    })
};


//** create download buttons for table and msa viewer (core_genes,etc)
export const append_download_button = function(divID, buttonId, href_link){
    d3.select(divID)
        .append('span')
        .style('display','inline-block')
        .style('width','6px')
    d3.select(divID)
        .append('a')
        .attr('href',href_link)
        .append('i')
        .attr('id', buttonId)
        .attr('class','glyphicon glyphicon-download-alt btn_tooltip')
        .style('vertical-align','middle')
}

//** tree button tooltip
const treeButton_tooltip_dict= {
    //**speciesTree
    'speciesTreeLayouts': 'change tree layouts',
    'speciesTree_height_plus':'expand species tree vertically',
    'speciesTree_height_minus':'shrink species tree vertically',
    'speciesTreeZoomReset': 'reset species tree',
    'speciesTree_nodePlus':'increase tip size',
    'speciesTree_nodeMinus':'decrease tip size',
    'download_coreTree':'download strain tree',
    //**geneTree
    'geneTreeLayouts': 'change tree layouts',
    'geneTree_height_plus':'expand gene tree vertically',
    'geneTree_height_minus':'shrink gene tree vertically',
    'geneTreeZoomReset':'reset gene tree',
    'geneTreeColorReset':'restore black nodes',
    'geneTree_nodePlus':'increase tip size',
    'geneTree_nodeMinus':'decrease tip size',
    'download_geneTree':'download gene tree',
    'searchAccession':'search strains/genes by accession',
    'searchAnnotation':'search genes by annotation'
    }
button_tooltip('#all_trees', treeButton_tooltip_dict);

//** tree button tooltip
export const tooltip_toggle_dict= {
    'speciesTreeLabels':'show/hide tree labels',
    'geneTreeLabels':'show/hide tree labels',
    'geneTreeOrientation':'change tree orientation',
    'speciesTreeScale':'enable/disable scale',
    'geneTreeScale': 'enable/disable scale',
    'speciesTreePanzoom': 'only enable pan/ use pan and zoom via mouse-wheel',
    'speciesTreeSynchr': 'synchronize toggle behaviors on both trees (layout and scale)'
    }
