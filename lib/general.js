var attributeFactory = require("./attributes.js");

// Highly specialized WeakMap shim
var WMap = typeof WeakMap === "undefined" ? (function(){
	function WMap(){
		this._saw = [];
	}
	WMap.prototype.has = function(el){
		return this._saw.indexOf(el) !== -1;
	};
	WMap.prototype.set = function(el){
		this._saw.push(el);
	};
	return WMap;
	// eslint-disable-next-line no-undef
}()) : WeakMap;

function generalFactory(adapter, Pseudos){
	/*
		all available rules
	*/
	return {
		__proto__: null,

		attribute: attributeFactory(adapter).compile,
		pseudo: Pseudos.compile,

		//tags
		tag: function(next, data){
			var name = data.name;
			return function tag(elem){
				return adapter.getName(elem) === name && next(elem);
			};
		},

		//traversal
		descendant: function(next){
			var isFalseCache = new WMap();

			return function descendant(elem){
				var found = false;

				while(!found && (elem = adapter.getParent(elem))){
					if(!isFalseCache.has(elem)){
						found = next(elem);
						if(!found){
							isFalseCache.set(elem, true);
						}
					}
				}

				return found;
			};
		},
		_flexibleDescendant: function(next){
			// Include element itself, only used while querying an array
			return function descendant(elem){

				var found = next(elem);

				while(!found && (elem = adapter.getParent(elem))){
					found = next(elem);
				}

				return found;
			};
		},
		parent: function(next, data, options){
			if(options && options.strict) throw new Error("Parent selector isn't part of CSS3");

			return function parent(elem){
				return adapter.getChildren(elem).some(test);
			};

			function test(elem){
				return adapter.isTag(elem) && next(elem);
			}
		},
		child: function(next){
			return function child(elem){
				var parent = adapter.getParent(elem);
				return !!parent && next(parent);
			};
		},
		sibling: function(next){
			return function sibling(elem){
				var siblings = adapter.getSiblings(elem);

				for(var i = 0; i < siblings.length; i++){
					if(adapter.isTag(siblings[i])){
						if(siblings[i] === elem) break;
						if(next(siblings[i])) return true;
					}
				}

				return false;
			};
		},
		adjacent: function(next){
			return function adjacent(elem){
				var siblings = adapter.getSiblings(elem),
					lastElement;

				for(var i = 0; i < siblings.length; i++){
					if(adapter.isTag(siblings[i])){
						if(siblings[i] === elem) break;
						lastElement = siblings[i];
					}
				}

				return !!lastElement && next(lastElement);
			};
		},
		universal: function(next){
			return next;
		}
	};
}

module.exports = generalFactory;
