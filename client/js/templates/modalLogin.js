module.exports = function(Handlebars) {

return Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var alias1=container.lambda, alias2=container.escapeExpression;

  return "        <div class=\"form-group\"><label for=\""
    + alias2(alias1((depth0 != null ? depth0.name : depth0), depth0))
    + "\" class=\"col-sm-3 control-label\">"
    + alias2(alias1((depth0 != null ? depth0.label : depth0), depth0))
    + "</label><div class=\"col-sm-9\"><input data-js=\""
    + alias2(alias1((depth0 != null ? depth0.name : depth0), depth0))
    + "\" type=\""
    + alias2(alias1((depth0 != null ? depth0.type : depth0), depth0))
    + "\" class=\"form-control\" id=\""
    + alias2(alias1((depth0 != null ? depth0.name : depth0), depth0))
    + "\"></div></div>    ";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<form class=\"form-horizontal\">    "
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.loginFields : depth0),{"name":"each","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</form>";
},"useData":true});

};