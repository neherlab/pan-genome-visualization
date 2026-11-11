import {drawTips} from "./drawTips";
import {drawBranches} from "./drawBranches";
import {addScaleBar} from "./scaleBar";

const drawTree = function(tree, callbacks, features){
    if (callbacks && callbacks.branch){
        drawBranches(tree, callbacks.branch);
    }else{
        drawBranches(tree, {});
    }
    if (callbacks && callbacks.tip){
        drawTips(tree, callbacks.tip);
    }else{
        drawTips(tree, {});
    }
    if (tree.scaleBar || tree.scalebar){
        addScaleBar(tree);
    }
}

export default drawTree;
