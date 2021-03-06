module.exports = function(Handlebars) {

return Handlebars.template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "<li data-js=\"container\" class=\"delivery-options col-xs-12\"><div class=\"error\">Please select a valid option.</div><div class=\"row\"><div class=\"share-label col-sm-3 vcenter\"><div>"
    + alias4(((helper = (helper = helpers.label || (depth0 != null ? depth0.label : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"label","hash":{},"data":data}) : helper)))
    + "</div><div><span>"
    + alias4(((helper = (helper = helpers.humanStartdate || (depth0 != null ? depth0.humanStartdate : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"humanStartdate","hash":{},"data":data}) : helper)))
    + "</span><span>-</span><span>"
    + alias4(((helper = (helper = helpers.humanEnddate || (depth0 != null ? depth0.humanEnddate : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"humanEnddate","hash":{},"data":data}) : helper)))
    + "</span></div><div>"
    + alias4(((helper = (helper = helpers.duration || (depth0 != null ? depth0.duration : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"duration","hash":{},"data":data}) : helper)))
    + " weeks</div></div><div data-js=\"options\" class=\"options col-sm-9 vcenter\"></div><div data-js=\"feedback\" class=\"feedback-messages col-sm-9 col-sm-offset-3\"></div></div></li>";
},"useData":true});

};