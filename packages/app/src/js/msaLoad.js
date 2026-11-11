import d3 from "d3";
import '../vendor/msa-niaid.js';
import {panXTree, msaViewerAsset} from './global'
import {hideNonSelected} from './tree-init'
import {button_tooltip,append_download_button} from './tooltips'


/** Blob URLs of the alignment download buttons of the shown cluster */
var download_urls = [];

/**
 * Show the reduced alignment of a cluster, with download buttons for the full and the reduced alignment
 * @param {str} clusterID    : cluster id
 * @param {str} seqType      : `aa` or `na`
 * @param {str} aln          : FASTA text of the full alignment
 * @param {str} aln_reduced  : FASTA text of the reduced alignment
 * @param {str} scheme_type  : colour scheme of msa
 */
const msaLoad = function (clusterID, seqType, aln, aln_reduced, scheme_type) {
    var rootDiv = document.getElementById('snippetDiv');
    rootDiv.replaceChildren();
    const seqs = msa.io.fasta.parse(aln_reduced);
    //** the accession of each record: the part of its header before `|` (msa keeps it as the key of `ids`)
    const seqID_to_accession = new Map(seqs.map(function(seq){return [seq.id, Object.keys(seq.ids)[0]];}));
    /* global rootDiv */
    var opts = {
      el: rootDiv,
      seqs: seqs,
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
    m.render();
    //# click row/rows to highlight the related strain/strains
    m.g.on('row:click', function(data){
        msaViewerAsset.selected_rows_set= new Set();
        var selection = m.g.selcol.pluck("seqId");
        for (var i=0,len=selection.length; i<len; i++){
            const accession = seqID_to_accession.get(selection[i]);
            if (accession!==undefined){
                msaViewerAsset.selected_rows_set.add(accession);
            }
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
    for (const url of download_urls) {
        URL.revokeObjectURL(url);
    }
    download_urls = [fastaUrl(aln), fastaUrl(aln_reduced)];
    append_download_button('#msa_legend','msa_aln',download_urls[0], `${clusterID}_${seqType}_aln.fa`);
    append_download_button('#msa_legend','msa_reduced_aln',download_urls[1], `${clusterID}_${seqType}_aln_reduced.fa`);
    const msa_button_tooltip_dict= {
        'msa_aln': 'download current alignment',
        'msa_reduced_aln': 'download current reduced alignment (consensus sequence and variable sites)'
    }
    button_tooltip('#msa_legend', msa_button_tooltip_dict);

};

//** Blob URL of a FASTA text
const fastaUrl = function (text) {
    return URL.createObjectURL(new Blob([text], {type: 'text/plain'}));
};

export default msaLoad;
