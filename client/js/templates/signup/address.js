module.exports = function(Handlebars) {

return Handlebars.template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var helper;

  return "<div data-js=\"container\" class=\"address\">"
    + container.escapeExpression(((helper = (helper = helpers.string || (depth0 != null ? depth0.string : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"string","hash":{},"data":data}) : helper)))
    + "</div>";
},"useData":true});

};