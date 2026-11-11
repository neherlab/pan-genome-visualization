import './third_party/msa-niaid';
//import './third_party/msa-new.js';
//import './third_party/msa.min.gz.js';
//import './third_party/msa.js';
import {panXTree, msaViewerAsset} from './global'
import {hideNonSelected} from './tree-init'
import {button_tooltip,append_download_button} from './tooltips'

//var msa = require("msa");

const msaLoad = function (aln_path,scheme_type) {
    var rootDiv = document.getElementById('snippetDiv');
    /* global rootDiv */
    var opts = {
      el: rootDiv,
      importURL: aln_path,
      bootstrapMenu: false
    };

    //opts.vis = {conserv: false, overviewbox: false, labelId: false};
    opts.vis = {scaleslider: true,conserv: false, overviewbox: false, labelId: false};
    opts.zoomer = {labelFontsize: '12',residueFont: "12"};
    /*opts.zoomer = {alignmentWidth:'auto',alignmentHeight: 250,rowHeight: 18,
                    labelWidth: 100, labelNameLength: 150,
                    labelNameFontsize: '10px',labelIdLength: 20, menuFontsize: '12px',
                    menuMarginLeft: '3px', menuPadding: '3px 4px 3px 4px', menuItemFontsize: '14px', menuItemLineHeight: '14px',
        //boxRectHeight: 2,boxRectWidth: 0.1,overviewboxPaddingTop: 20
    };*/
    opts.colorscheme={scheme: scheme_type}; //{scheme: 'taylor'};//{scheme: 'nucleotide'};
    //opts.config={};opts.conf= {alphabetSize: 1};

    var m =  new msa.msa(opts);    //JSON.stringify
    //# click row/rows to highlight the related strain/strains
    var seqID_to_accession_dt={};
    m.g.on('row:click', function(data){
        var alnID=data.evt.currentTarget.textContent;
        var accession=alnID.split("-", 1)[0];
        seqID_to_accession_dt[data.seqId]=accession
        msaViewerAsset.selected_rows_set= new Set();
        var selection = m.g.selcol.pluck("seqId");
        for (var i=0,len=selection.length; i<len; i++){
            msaViewerAsset.selected_rows_set.add(seqID_to_accession_dt[selection[i]])
        }
        var speciesTree= panXTree.speciesTree;;
        if (speciesTree){
            speciesTree.tips.forEach(function(d){d.state.selected=false;});
            msaViewerAsset.selected_rows_set.forEach(function(accession){
                if (speciesTree.namesToTips[accession]){
                    speciesTree.namesToTips[accession].state.selected=true;
                }else{
                    console.log("accession not found", accession);
                }
            })
        }else{
            console.log("speciesTree not available");
        }
        hideNonSelected(speciesTree);
    });
    var scaleSize;
    scaleSize= (scheme_type=='nucleotide')? 2: 3;
    m.g.scale.setSize(scaleSize);
    //console.log(scheme_type,scaleSize);

    /*$(".smenu-dropdown-menu").find("li:contains('Reset')").each(function(){
        var div=$(this);
        $(this).attr('id','...');
        console.log('click msa-menu reset',div.click(console.log('reset clicked')));
    });*/

    /*m.g.on("column:click", function(data){
        colorBy = "genotype";
        colorByGenotypePosition([data['rowPos']]);});*/

    //var menuOpts = {};
    //menuOpts.msa = m;
    //var defMenu = new msa.menu.defaultmenu(menuOpts);
    //m.addView('menu', defMenu);

    const msa_legend=d3.select('#msa_legend');
    msa_legend.selectAll('a, span').remove();
    append_download_button('#msa_legend','msa_aln',aln_path.replace('_reduced',''));
    append_download_button('#msa_legend','msa_reduced_aln',aln_path);
    const msa_button_tooltip_dict= {
        'msa_aln': 'download current alignment',
        'msa_reduced_aln': 'download current reduced alignment (consensus sequence and variable sites)'
    }
    button_tooltip('#msa_legend', msa_button_tooltip_dict);

};


export default msaLoad;
