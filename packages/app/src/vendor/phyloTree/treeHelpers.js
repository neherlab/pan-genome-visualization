
export const preOrderIteration = function(node, callback){
    callback(node);
    if (node.children){
        for (var i=0; i<node.children.length; i++){
            preOrderIteration(node.children[i], callback);
        }
    }
}

export const postOrderIteration = function(node, callback){
    if (node.children){
        for (var i=0; i<node.children.length; i++){
            postOrderIteration(node.children[i], callback);
        }
    }
    callback(node);
}

